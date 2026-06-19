"""Compost-AI inference backend (FastAPI, deployed as a Hugging Face Space).

Endpoints
---------
GET  /health            liveness + warmth probe (also used to keep the Space warm)
POST /predict           image -> {item, pathway, physical_bin, confidence,
                                  gradcam, prediction_id, corrected_by_memory, ...}
POST /feedback          {prediction_id, correct_item} -> store a correction

The model (``efficientnet-b0-weights.keras``) is loaded once at startup. Images
are preprocessed exactly as in training: RGB, resized to 224x224, float32, **raw
0-255 pixels** (EfficientNetB0 normalizes internally — do NOT rescale here, it
silently wrecks accuracy).

Correction memory ("learn from mistakes") is handled by :mod:`memory`: each
prediction's 1280-d embedding is cached by ``prediction_id`` so a later
``/feedback`` call can store ``(embedding, correct_item)`` without re-uploading
the image. Subsequent predictions whose embedding is very close to a stored
correction are overridden.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
import uuid

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field

from gradcam import build_inference_graphs, compute_gradcam
from labels import (
    CLASS_NAMES,
    CONFIDENCE_THRESHOLD,
    IMG_SIZE,
    pathway_for,
    physical_bin_for,
    pretty,
)
from memory import CorrectionMemory

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("compost-inference")

MODEL_PATH = os.getenv("MODEL_PATH", "efficientnet-b0-weights.keras")
# /data is HF persistent storage when enabled; falls back to the working dir.
MEMORY_PATH = os.getenv(
    "MEMORY_PATH",
    "/data/correction_memory.json" if os.path.isdir("/data") else "correction_memory.json",
)
MEMORY_THRESHOLD = float(os.getenv("MEMORY_THRESHOLD", "0.92"))
PREDICTION_TTL_SECONDS = 600  # how long a prediction_id stays valid for feedback

app = FastAPI(title="Compost-AI Inference", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # the Next.js route proxies, but allow direct calls too
    allow_methods=["*"],
    allow_headers=["*"],
)

# Populated in startup_event.
_model: tf.keras.Model | None = None
_backbone = None
_head_model = None
_embedding_model = None
_memory: CorrectionMemory | None = None
# prediction_id -> (embedding, model_item, timestamp)
_pending: dict[str, tuple[np.ndarray, str, float]] = {}


@app.on_event("startup")
def startup_event() -> None:
    global _model, _backbone, _head_model, _embedding_model, _memory
    log.info("Loading model from %s ...", MODEL_PATH)
    _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    _backbone, _head_model, _embedding_model = build_inference_graphs(_model)
    _memory = CorrectionMemory(MEMORY_PATH, threshold=MEMORY_THRESHOLD)
    # Warm the graph so the first real request hits the 1-2s target.
    warm = np.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
    _model(warm, training=False)
    _embedding_model(warm, training=False)
    log.info("Model ready. Correction memory holds %d entries.", _memory.size)


# ── request/response models ──────────────────────────────────────────────────

class PredictRequest(BaseModel):
    image: str = Field(..., description="base64 image, optionally a data: URI")


class FeedbackRequest(BaseModel):
    prediction_id: str
    correct_item: str = Field(..., description="one of the 30 CLASS_NAMES")


# ── helpers ──────────────────────────────────────────────────────────────────

def _decode_image(image_b64: str) -> np.ndarray:
    """Decode a (possibly data-URI) base64 image to a 224x224x3 uint8 RGB array."""
    if "," in image_b64 and image_b64.strip().startswith("data:"):
        image_b64 = image_b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(raw)).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Bad image: {exc}") from exc
    return np.asarray(img, dtype=np.uint8)


def _prune_pending(now: float) -> None:
    stale = [k for k, (_, _, ts) in _pending.items() if now - ts > PREDICTION_TTL_SECONDS]
    for k in stale:
        _pending.pop(k, None)


# ── endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if _model is not None else "loading",
        "model_loaded": _model is not None,
        "memory_size": _memory.size if _memory else 0,
        "classes": len(CLASS_NAMES),
    }


@app.post("/predict")
def predict(req: PredictRequest) -> dict:
    if _model is None or _memory is None:
        raise HTTPException(status_code=503, detail="Model still loading")

    original_rgb = _decode_image(req.image)
    batch = original_rgb.astype(np.float32)[np.newaxis, ...]  # raw 0-255, no rescale

    probs = _model(batch, training=False).numpy()[0]
    idx = int(np.argmax(probs))
    model_item = CLASS_NAMES[idx]
    confidence = float(probs[idx])

    embedding = _embedding_model(batch, training=False).numpy()[0]

    # Correction memory may override a known-mistaken prediction.
    corrected_label, similarity = _memory.query(embedding)
    if corrected_label is not None:
        item = corrected_label
        corrected_by_memory = True
    else:
        item = model_item
        corrected_by_memory = False

    pathway = pathway_for(item)

    # Grad-CAM explains what the *model* looked at -> use the model's class index.
    gradcam_b64 = compute_gradcam(_backbone, _head_model, batch, original_rgb, idx)

    now = time.time()
    _prune_pending(now)
    prediction_id = uuid.uuid4().hex
    _pending[prediction_id] = (embedding, model_item, now)

    return {
        "prediction_id": prediction_id,
        "item": item,
        "item_label": pretty(item),
        "pathway": pathway,
        "physical_bin": physical_bin_for(pathway),
        "confidence": round(confidence, 4),
        "low_confidence": confidence < CONFIDENCE_THRESHOLD,
        "corrected_by_memory": corrected_by_memory,
        "memory_similarity": round(similarity, 4),
        "model_item": model_item,
        "model_item_label": pretty(model_item),
        "gradcam": gradcam_b64,
    }


@app.post("/feedback")
def feedback(req: FeedbackRequest) -> dict:
    if _memory is None:
        raise HTTPException(status_code=503, detail="Model still loading")
    if req.correct_item not in CLASS_NAMES:
        raise HTTPException(status_code=422, detail="correct_item not a known class")

    pending = _pending.get(req.prediction_id)
    if pending is None:
        raise HTTPException(
            status_code=404,
            detail="Unknown or expired prediction_id; re-scan the item",
        )

    embedding, _model_item, _ts = pending
    _memory.add(embedding, req.correct_item)
    _pending.pop(req.prediction_id, None)

    pathway = pathway_for(req.correct_item)
    return {
        "status": "learned",
        "correct_item": req.correct_item,
        "correct_item_label": pretty(req.correct_item),
        "pathway": pathway,
        "physical_bin": physical_bin_for(pathway),
        "memory_size": _memory.size,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
