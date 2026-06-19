import time

try:
    from smbus2 import SMBus
    _REAL = True
except ImportError:
    _REAL = False

from .config import LCD_I2C_ADDRESS, LCD_I2C_BUS

# HD44780 via I2C backpack constants
_CHR       = 1
_CMD       = 0
_LINE_1    = 0x80
_LINE_2    = 0xC0
_BACKLIGHT = 0x08
_ENABLE    = 0b00000100


def _pulse(bus: "SMBus", data: int) -> None:
    bus.write_byte(LCD_I2C_ADDRESS, data | _ENABLE)
    time.sleep(0.0005)
    bus.write_byte(LCD_I2C_ADDRESS, data & ~_ENABLE)
    time.sleep(0.0001)


def _send(bus: "SMBus", bits: int, mode: int) -> None:
    high = mode | (bits & 0xF0)        | _BACKLIGHT
    low  = mode | ((bits << 4) & 0xF0) | _BACKLIGHT
    bus.write_byte(LCD_I2C_ADDRESS, high)
    _pulse(bus, high)
    bus.write_byte(LCD_I2C_ADDRESS, low)
    _pulse(bus, low)


def setup():
    """Initialise the LCD. Returns the SMBus handle, or None in simulation."""
    if not _REAL:
        print("[LCD] Simulation mode — display output goes to stdout")
        return None
    bus = SMBus(LCD_I2C_BUS)
    for cmd in [0x33, 0x32, 0x06, 0x0C, 0x28, 0x01]:
        _send(bus, cmd, _CMD)
        time.sleep(0.05)
    return bus


def write(bus, line1: str, line2: str = "") -> None:
    """Write up to 16 characters on each of the two LCD lines."""
    if not _REAL or bus is None:
        print(f"[LCD] {line1:<16} | {line2:<16}")
        return
    _send(bus, _LINE_1, _CMD)
    for ch in line1[:16].ljust(16):
        _send(bus, ord(ch), _CHR)
    _send(bus, _LINE_2, _CMD)
    for ch in line2[:16].ljust(16):
        _send(bus, ord(ch), _CHR)
