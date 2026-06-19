import time

try:
    import RPi.GPIO as GPIO
    _REAL = True
except ImportError:
    _REAL = False

from .config import TRIG_PIN, ECHO_PIN


def setup() -> None:
    if not _REAL:
        return
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(TRIG_PIN, GPIO.OUT)
    GPIO.setup(ECHO_PIN, GPIO.IN)
    GPIO.output(TRIG_PIN, False)
    time.sleep(0.5)


def measure_distance() -> float:
    """Return distance in cm. Returns 999.0 on timeout."""
    if not _REAL:
        return 30.0  # simulation: nothing present

    GPIO.output(TRIG_PIN, True)
    time.sleep(0.00001)
    GPIO.output(TRIG_PIN, False)

    timeout = time.time() + 0.04
    while GPIO.input(ECHO_PIN) == 0:
        start = time.time()
        if start > timeout:
            return 999.0

    timeout = time.time() + 0.04
    while GPIO.input(ECHO_PIN) == 1:
        end = time.time()
        if end > timeout:
            return 999.0

    return round((end - start) * 34300 / 2, 2)


def cleanup() -> None:
    if _REAL:
        GPIO.cleanup()
