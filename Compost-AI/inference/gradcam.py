"""Grad-CAM explainability for the Compost-AI EfficientNetB0 model.

We gradient the predicted-class score with respect to the last convolutional
feature map (the backbone's ``top_activation``, 7x7x1280), channel-weight by the
pooled gradients, ReLU, upsample to 224, apply a JET colormap and alpha-blend it
over the original frame. The result is returned as a base64 PNG the frontend can
drop straight into an ``<img src="data:image/png;base64,...">``.

The model nests EfficientNetB0 as a single ``backbone`` layer whose output *is*
the last conv feature map (include_top=False, pooling=None). So Grad-CAM splits
the forward pass into ``backbone`` (image -> 7x7x1280) and ``head`` (7x7x1280 ->
30-class softmax); gradients of the class score flow cleanly back to the conv
output. See :func:`build_inference_graphs`.
"""

from __future__ import annotations

import base64
import io

import numpy as np
import tensorflow as tf
from PIL import Image

try:
    import cv2
    _HAS_CV2 = True
except Exception:  # pragma: no cover - cv2 is in requirements, fallback is safety
    _HAS_CV2 = False


def build_inference_graphs(model: tf.keras.Model):
    """Decompose the trained model into the pieces inference + Grad-CAM need.

    Returns ``(backbone, head_model, embedding_model)`` where:
      * ``backbone(img)``          -> last conv feature map (1, 7, 7, 1280)
      * ``head_model(feature_map)``-> class softmax (1, 30), differentiable
      * ``embedding_model(img)``   -> 1280-d GlobalAveragePooling vector
    """
    # The EfficientNet backbone is the only nested model / 4-D-output layer.
    backbone = None
    for layer in model.layers:
        if "efficientnet" in layer.name.lower():
            backbone = layer
            break
    if backbone is None:
        for layer in model.layers:
            if len(layer.output.shape) == 4:
                backbone = layer
    if backbone is None:
        raise RuntimeError("Could not locate the convolutional backbone layer")

    gap_layer = next(
        (l for l in model.layers
         if isinstance(l, tf.keras.layers.GlobalAveragePooling2D)),
        None,
    )
    if gap_layer is None:
        raise RuntimeError("Could not locate the GlobalAveragePooling2D layer")

    embedding_model = tf.keras.Model(model.input, gap_layer.output)

    # Replay every layer *after* the backbone (model.layers is topologically
    # ordered for a Functional model) to rebuild the classification head on top
    # of a fresh input tensor. Layers are reused, so weights are shared.
    classifier_input = tf.keras.Input(shape=backbone.output.shape[1:])
    x = classifier_input
    seen_backbone = False
    for layer in model.layers:
        if layer is backbone:
            seen_backbone = True
            continue
        if seen_backbone:
            x = layer(x)
    head_model = tf.keras.Model(classifier_input, x)

    return backbone, head_model, embedding_model


def _resize(arr: np.ndarray, size_hw: tuple[int, int]) -> np.ndarray:
    h, w = size_hw
    if _HAS_CV2:
        return cv2.resize(arr, (w, h), interpolation=cv2.INTER_LINEAR)
    img = Image.fromarray((arr * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    return np.asarray(img, dtype=np.float32) / 255.0


def _jet(cam: np.ndarray) -> np.ndarray:
    """cam in [0,1] (HxW) -> RGB uint8 heatmap (HxWx3)."""
    if _HAS_CV2:
        heat = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        return heat[:, :, ::-1]  # cv2 is BGR -> RGB
    # Minimal blue->green->red fallback if cv2 is unavailable.
    r = np.clip(1.5 - np.abs(4 * cam - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * cam - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * cam - 1), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def compute_gradcam(
    backbone: tf.keras.Model,
    head_model: tf.keras.Model,
    img_array: np.ndarray,
    original_rgb: np.ndarray,
    class_idx: int,
    alpha: float = 0.45,
) -> str:
    """Return a base64-encoded PNG of the Grad-CAM overlay for `class_idx`.

    ``img_array`` is the preprocessed batch (1, 224, 224, 3) float32 fed to the
    model; ``original_rgb`` is the 224x224x3 uint8 image to draw the heatmap on.
    """
    img_tensor = tf.convert_to_tensor(img_array)
    with tf.GradientTape() as tape:
        conv_out = backbone(img_tensor, training=False)
        tape.watch(conv_out)
        preds = head_model(conv_out, training=False)
        score = preds[:, class_idx]

    grads = tape.gradient(score, conv_out)              # (1, 7, 7, C)
    pooled = tf.reduce_mean(grads, axis=(0, 1, 2))      # (C,)
    conv = conv_out[0]                                  # (7, 7, C)
    cam = tf.reduce_sum(conv * pooled, axis=-1)         # (7, 7)
    cam = tf.nn.relu(cam).numpy()

    peak = float(cam.max())
    if peak > 0:
        cam = cam / peak

    cam = _resize(cam.astype(np.float32), original_rgb.shape[:2])
    cam = np.clip(cam, 0.0, 1.0)
    heat = _jet(cam)
    overlay = (alpha * heat + (1 - alpha) * original_rgb).astype(np.uint8)

    buffer = io.BytesIO()
    Image.fromarray(overlay).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")
