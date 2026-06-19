import csv
from datetime import datetime

from .config import LOG_PATH, LOCATION


def _next_id() -> str:
    if not LOG_PATH.exists():
        return "001"
    with open(LOG_PATH, newline="") as f:
        rows = sum(1 for _ in f) - 1  # subtract header row
    return str(max(rows + 1, 1)).zfill(3)


def log(item: str, bin_name: str, confidence: float) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_header = not LOG_PATH.exists()
    with open(LOG_PATH, "a", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow([
                "ID", "Timestamp", "Location",
                "Waste Item", "Disposal Bin", "Confidence Level",
            ])
        writer.writerow([
            _next_id(),
            datetime.now().strftime("%m-%d-%Y %H:%M:%S"),
            LOCATION,
            item,
            bin_name,
            f"{confidence * 100:.1f}%",
        ])
