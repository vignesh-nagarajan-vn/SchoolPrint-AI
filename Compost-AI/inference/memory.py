"""Correction memory — instant, safe "learning from mistakes".

Instead of back-propagating into the CNN on a single corrected example (which
risks catastrophic forgetting and is lost on a free Space restart), we keep a
tiny vector memory of ``(embedding, correct_label)`` pairs. On every prediction
we cosine-compare the new image's 1280-d embedding against this memory; if it is
very close to something a human previously corrected, we override the model's
guess with the corrected label.

This is O(n) over a handful of corrections, runs in well under a millisecond,
and never touches the model weights. It persists to a JSON file so a warm demo
session (and HF persistent storage, mounted at /data) survives restarts.
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

import numpy as np

log = logging.getLogger(__name__)


def _unit(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    return vec / norm if norm > 0 else vec


class CorrectionMemory:
    """Thread-safe cosine-similarity store of human corrections."""

    def __init__(self, path: str | Path, threshold: float = 0.92) -> None:
        self.path = Path(path)
        self.threshold = threshold
        self._lock = threading.Lock()
        self._vectors: list[np.ndarray] = []   # each L2-normalized
        self._labels: list[str] = []
        self._load()

    # -- persistence -------------------------------------------------------

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text())
            self._labels = list(data.get("labels", []))
            self._vectors = [_unit(np.asarray(v, dtype=np.float32))
                             for v in data.get("vectors", [])]
            log.info("Loaded %d corrections from %s", len(self._labels), self.path)
        except Exception as exc:  # noqa: BLE001 - never let a bad file crash boot
            log.warning("Could not load correction memory (%s); starting empty", exc)

    def _save(self) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps({
                "labels": self._labels,
                "vectors": [v.tolist() for v in self._vectors],
            }))
        except Exception as exc:  # noqa: BLE001
            log.warning("Could not persist correction memory: %s", exc)

    # -- public API --------------------------------------------------------

    def add(self, embedding: np.ndarray, label: str) -> None:
        """Remember that this embedding should have been classified as `label`."""
        with self._lock:
            self._vectors.append(_unit(np.asarray(embedding, dtype=np.float32)))
            self._labels.append(label)
            self._save()
        log.info("Correction stored: -> %s (memory size %d)", label, len(self._labels))

    def query(self, embedding: np.ndarray) -> tuple[str | None, float]:
        """Return (label, similarity) of the closest correction past threshold.

        If nothing clears the threshold, returns (None, best_similarity_seen).
        """
        with self._lock:
            if not self._vectors:
                return None, 0.0
            q = _unit(np.asarray(embedding, dtype=np.float32))
            sims = np.array([float(np.dot(q, v)) for v in self._vectors])
            best = int(np.argmax(sims))
            best_sim = float(sims[best])
            if best_sim >= self.threshold:
                return self._labels[best], best_sim
            return None, best_sim

    @property
    def size(self) -> int:
        return len(self._labels)
