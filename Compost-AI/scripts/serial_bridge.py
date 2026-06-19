"""
serial_bridge.py — reads ITEM_DETECTED from the Arduino over USB serial
and POSTs to the Next.js /api/trigger endpoint so the web app auto-captures.

Usage:
    python serial_bridge.py              # uses defaults below
    python serial_bridge.py COM4         # override port
    python serial_bridge.py COM4 3000    # override port + Next.js port

Install deps once:
    pip install pyserial requests
"""

import sys
import time
import serial
import requests

PORT    = sys.argv[1] if len(sys.argv) > 1 else "COM3"
NJ_PORT = sys.argv[2] if len(sys.argv) > 2 else "3000"
BAUD    = 9600
URL     = f"http://localhost:{NJ_PORT}/api/trigger"


def main() -> None:
    print(f"[bridge] opening {PORT} at {BAUD} baud …")
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1)
    except serial.SerialException as e:
        sys.exit(f"[bridge] ERROR: could not open {PORT}: {e}\n"
                 "  → Check Device Manager → Ports for the right COM number.")

    time.sleep(2)   # Arduino resets on connect; wait for it to be ready
    ser.reset_input_buffer()
    print(f"[bridge] ready — listening for ITEM_DETECTED → {URL}")

    while True:
        try:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
        except serial.SerialException as e:
            sys.exit(f"[bridge] Serial read error: {e}")

        if not line:
            continue

        print(f"[bridge] serial: {line}")

        if line == "ITEM_DETECTED":
            print("[bridge] triggering capture …")
            try:
                r = requests.post(URL, timeout=3)
                print(f"[bridge] → {r.status_code}")
            except requests.ConnectionError:
                print(f"[bridge] WARNING: could not reach {URL} "
                      "(is `npm run dev` running?)")
            except requests.Timeout:
                print("[bridge] WARNING: trigger request timed out")


if __name__ == "__main__":
    main()
