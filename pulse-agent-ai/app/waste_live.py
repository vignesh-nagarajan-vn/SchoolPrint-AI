from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from .database import get_connection
from .schemas import WasteSortReading


log = logging.getLogger("pulse-agent.waste_live")


LIVE_WASTE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS waste_sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    location TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    item TEXT NOT NULL,
    bin TEXT NOT NULL,
    confidence REAL NOT NULL,
    reading_source TEXT NOT NULL
);
"""


class WasteLiveService:
    """Mirrors WaterLiveService: stores items the Compost AI bin just sorted so
    they can surface at the top of the Food Consumption dashboard in real time."""

    def __init__(self, db_path: Path):
        self.db_path = db_path

    def ensure_table(self) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(LIVE_WASTE_TABLE_SQL)
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_waste_sensor_recorded_at "
                "ON waste_sensor_readings (recorded_at DESC)"
            )
            connection.commit()

    def ingest(self, reading: WasteSortReading) -> dict:
        self.ensure_table()
        payload = reading.model_dump()

        recorded_at = payload.get("recorded_at") or datetime.now(timezone.utc)
        recorded_at_iso = recorded_at.astimezone(timezone.utc).isoformat()

        confidence = float(payload["confidence"])
        if confidence <= 1:  # accept 0–1 model probability
            confidence *= 100

        with get_connection(self.db_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO waste_sensor_readings (
                    device_id, location, recorded_at, item, bin, confidence, reading_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["device_id"],
                    payload["location"],
                    recorded_at_iso,
                    payload["item"],
                    payload["bin"],
                    confidence,
                    payload["reading_source"],
                ),
            )
            connection.commit()
            new_id = cursor.lastrowid

        return {"stored": True, "id": new_id}

    def recent_readings(self, limit: int = 20) -> list[dict]:
        self.ensure_table()
        safe_limit = max(1, min(limit, 100))
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM waste_sensor_readings ORDER BY recorded_at DESC, id DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()
        return [self._as_food_row(dict(row)) for row in rows]

    def _as_food_row(self, row: dict) -> dict:
        # Shaped to match the bundled food.json rows so the dashboard can merge them.
        return {
            "id": f"LIVE-{row['id']}",
            "timestamp": row["recorded_at"],
            "location": row["location"],
            "item": row["item"],
            "bin": row["bin"],
            "confidence": round(float(row["confidence"]), 1),
        }
