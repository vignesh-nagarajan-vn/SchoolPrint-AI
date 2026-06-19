"""Quick end-to-end check against a locally running inference server.

Usage:
    python app.py                         # in one terminal
    python smoke_test.py sample.jpg       # in another

Posts the image to /predict, prints the verdict, saves the Grad-CAM overlay to
gradcam_out.png, then exercises the correction-memory loop with /feedback.
"""

from __future__ import annotations

import base64
import sys

import requests

BASE = "http://localhost:7860"


def main(image_path: str) -> None:
    with open(image_path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")

    health = requests.get(f"{BASE}/health", timeout=120).json()
    print("health:", health)

    res = requests.post(f"{BASE}/predict", json={"image": b64}, timeout=120).json()
    print(f"item={res['item_label']}  pathway={res['pathway']}  "
          f"bin={res['physical_bin']}  conf={res['confidence']:.2%}  "
          f"corrected_by_memory={res['corrected_by_memory']}")

    with open("gradcam_out.png", "wb") as fh:
        fh.write(base64.b64decode(res["gradcam"]))
    print("Grad-CAM overlay written to gradcam_out.png")

    # Demonstrate the correction loop: tell it the real answer, then re-predict.
    correct = "food_waste"
    fb = requests.post(
        f"{BASE}/feedback",
        json={"prediction_id": res["prediction_id"], "correct_item": correct},
        timeout=120,
    ).json()
    print("feedback:", fb)

    res2 = requests.post(f"{BASE}/predict", json={"image": b64}, timeout=120).json()
    print(f"after correction -> item={res2['item_label']}  "
          f"corrected_by_memory={res2['corrected_by_memory']}  "
          f"similarity={res2['memory_similarity']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python smoke_test.py <image_path>")
        raise SystemExit(1)
    main(sys.argv[1])
