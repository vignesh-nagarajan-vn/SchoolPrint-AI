import time

from . import sensor, servo, lcd, logger
from .classifier import Classifier
from .config import TRIGGER_DISTANCE_CM

POLL_INTERVAL = 0.1   # seconds between distance reads
COOLDOWN      = 3.0   # seconds before next classification can fire


def run() -> None:
    print("Compost AI starting...")

    sensor.setup()
    servo.setup()
    bus   = lcd.setup()
    model = Classifier()

    try:
        from picamera2 import Picamera2
        cam = Picamera2()
        cam.configure(cam.create_still_configuration())
        cam.start()
        time.sleep(1)
        _capture = lambda: cam.capture_array()
    except Exception:
        import cv2
        cap = cv2.VideoCapture(0)
        _capture = lambda: cap.read()[1]
        cam = cap

    lcd.write(bus, "Compost AI", "Ready")
    print("Ready — hold item over the bin opening.")

    last_classify = 0.0

    try:
        while True:
            distance = sensor.measure_distance()
            now      = time.time()

            if distance < TRIGGER_DISTANCE_CM and (now - last_classify) > COOLDOWN:
                last_classify = now
                lcd.write(bus, "Scanning...", "")

                frame = _capture()
                if frame is None:
                    lcd.write(bus, "Camera error", "")
                    continue

                item, bin_name, confidence = model.classify(frame)

                if model.is_confident(confidence):
                    print(f"  {item} → {bin_name} ({confidence:.0%})")
                    lcd.write(bus, f"-> {bin_name}", item[:16])
                    servo.open_gate(bin_name)
                    logger.log(item, bin_name, confidence)
                else:
                    print(f"  Low confidence: {item} ({confidence:.0%}) — manual sort")
                    lcd.write(bus, "Sort manually", f"{confidence:.0%} sure")
                    logger.log(item, "Manual", confidence)

                time.sleep(1)
                lcd.write(bus, "Compost AI", "Ready")

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("Shutting down.")
    finally:
        lcd.write(bus, "Compost AI", "Off")
        sensor.cleanup()
        servo.cleanup()
        try:
            cam.stop()
        except Exception:
            cam.release()


if __name__ == "__main__":
    run()
