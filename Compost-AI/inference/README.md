---
title: Compost AI Inference
emoji: 🗑️
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Compost-AI Inference Backend

FastAPI service behind the Compost-AI smart-bin web app. It classifies a waste
image with the trained EfficientNetB0 model, returns a Grad-CAM explainability
overlay, and supports "learning from mistakes" via a cosine-similarity
**correction memory** (no live weight updates — see `memory.py`).

## Endpoints

| Method | Path        | Body                                   | Returns |
|--------|-------------|----------------------------------------|---------|
| GET    | `/health`   | —                                      | liveness + memory size |
| POST   | `/predict`  | `{ "image": "<base64 or data URI>" }`  | item, pathway, physical_bin, confidence, gradcam (base64 PNG), prediction_id, corrected_by_memory |
| POST   | `/feedback` | `{ "prediction_id": "...", "correct_item": "<class>" }` | stores the correction |

`correct_item` must be one of the 30 names in `labels.py`.

## Model file

This Space needs `efficient­net-b0-weights.keras` (~16 MB) at its root. Copy it
from `Compost-AI/Models/efficientnet-b0-weights.keras` into this directory before
pushing the Space (track it with Git LFS), or set `MODEL_PATH` to a path you load
from the HF model hub at startup.

## Preprocessing contract

RGB, resized to **224×224**, `float32`, **raw 0–255 pixels — no normalization**
(EfficientNetB0 normalizes internally). This must match training exactly.

## Run locally

```bash
pip install -r requirements.txt
# place efficientnet-b0-weights.keras next to app.py, then:
python app.py            # serves on http://localhost:7860
python smoke_test.py path/to/sample.jpg    # quick end-to-end check
```

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `MODEL_PATH` | `efficientnet-b0-weights.keras` | model location |
| `MEMORY_PATH` | `/data/correction_memory.json` (else cwd) | correction store |
| `MEMORY_THRESHOLD` | `0.92` | cosine sim above which a correction overrides |
| `PORT` | `7860` | HF Spaces serves here |

> Free CPU Spaces sleep when idle; the first request after a cold start can take
> 20–60s. Keep it warm by pinging `/health` (or use a paid always-on Space) to
> hold the 1–2s target during a live demo. Correction memory persists across
> restarts only if HF **persistent storage** is enabled (mounts at `/data`).
