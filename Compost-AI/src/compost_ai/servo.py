import time

try:
    import RPi.GPIO as GPIO
    _REAL = True
except ImportError:
    _REAL = False

from .config import (
    SERVO_COMPOST_PIN, SERVO_RECYCLING_PIN, SERVO_GARBAGE_PIN,
    SERVO_OPEN_ANGLE, SERVO_CLOSED_ANGLE, GATE_OPEN_SECONDS,
)

_PIN_MAP = {
    "Compost":   SERVO_COMPOST_PIN,
    "Recycling": SERVO_RECYCLING_PIN,
    "Garbage":   SERVO_GARBAGE_PIN,
}
_pwm: dict = {}


def _angle_to_duty(angle: int) -> float:
    return 2.5 + (angle / 18.0)


def setup() -> None:
    if not _REAL:
        return
    for name, pin in _PIN_MAP.items():
        GPIO.setup(pin, GPIO.OUT)
        pwm = GPIO.PWM(pin, 50)
        pwm.start(_angle_to_duty(SERVO_CLOSED_ANGLE))
        _pwm[name] = pwm
    time.sleep(0.5)


def open_gate(bin_name: str) -> None:
    if not _REAL:
        print(f"[SIM] Opening {bin_name} gate for {GATE_OPEN_SECONDS}s")
        time.sleep(GATE_OPEN_SECONDS)
        return
    pwm = _pwm.get(bin_name)
    if pwm is None:
        return
    pwm.ChangeDutyCycle(_angle_to_duty(SERVO_OPEN_ANGLE))
    time.sleep(GATE_OPEN_SECONDS)
    pwm.ChangeDutyCycle(_angle_to_duty(SERVO_CLOSED_ANGLE))
    time.sleep(0.3)
    pwm.ChangeDutyCycle(0)  # stop jitter


def cleanup() -> None:
    if _REAL:
        for pwm in _pwm.values():
            pwm.stop()
