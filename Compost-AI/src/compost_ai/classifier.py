import numpy as np
import cv2

try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite  # type: ignore

from .config import MODEL_PATH, CLASS_NAMES, DISPOSAL_MAP, IMG_SIZE, CONFIDENCE_THRESHOLD


class Classifier:
    def __init__(self) -> None:
        self.interpreter = tflite.Interpreter(model_path=str(MODEL_PATH))
        self.interpreter.allocate_tensors()
        self._inp = self.interpreter.get_input_details()[0]
        self._out = self.interpreter.get_output_details()[0]

    def classify(self, frame: np.ndarray) -> tuple[str, str, float]:
        """
        Run inference on a raw BGR frame from the camera.
        Returns (item_name, bin_name, confidence).
        """
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE)).astype(np.float32)
        self.interpreter.set_tensor(self._inp["index"], img[np.newaxis])
        self.interpreter.invoke()
        probs      = self.interpreter.get_tensor(self._out["index"])[0]
        idx        = int(np.argmax(probs))
        confidence = float(probs[idx])
        item       = CLASS_NAMES[idx]
        bin_name   = DISPOSAL_MAP.get(item, "Garbage")
        return item, bin_name, confidence

    def is_confident(self, confidence: float) -> bool:
        return confidence >= CONFIDENCE_THRESHOLD
