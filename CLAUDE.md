# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SchoolPulse AI** is the umbrella repo for **SchoolPulse**, an entry for USAII Global AI Hackathon 2026, High School Challenge 2 (Direction B: My School's Hidden Footprint). It is a suite of three independent edge AI modules unified by a web dashboard.

## Modules

| Module | Dir | What it does |
|---|---|---|
| **Aqualert AI** | `aqualert-ai/` | Ultrasonic edge detector for running/leaking toilets. No ML — uses OLS regression + statistical CIs + a state machine. Runs on a Raspberry Pi Zero but simulates fully without hardware. |
| **Compost AI** | `Compost-AI/` | EfficientNetB0 CNN (~96% accuracy) trained in a Jupyter notebook; classifies waste as garbage/recycling/compost. Weights exported as `.keras` and quantized `.tflite`. |
| **Pulse Agent AI** | `pulse-agent-ai/` | FastAPI backend. RAG over project docs + research sources (TF-IDF + sklearn, index built with joblib). Optionally calls Gemma on AWS Lambda or locally via GPU. Feeds the dashboard with action cards. |
| **SchoolPulse dashboard** | (not yet in repo) | Web UI that unifies all three modules into a "Hidden Footprint Map" with per-incident cards. |

---

## Aqualert AI

### Install & configure

```bash
cd aqualert-ai
pip install -r requirements.txt
cp config.example.yaml config.yaml   # then edit
```

Secrets via env vars (never in config.yaml):
```bash
export AQUALERT_MQTT_USERNAME=...
export AQUALERT_MQTT_PASSWORD=...
export AQUALERT_REST_TOKEN=...
```

### Run in simulation (no hardware needed)

```bash
python scripts/simulate.py --scenario normal
python scripts/simulate.py --scenario leak_slow --json
python scripts/simulate.py --scenario leak_fast
python scripts/simulate.py --scenario sensor_fault
```

### Run on a Raspberry Pi (real HC-SR04 sensor)

```bash
# Calibrate first (on the Pi):
python scripts/calibrate.py --config config.yaml --empty   # empty tank
python scripts/calibrate.py --config config.yaml           # full tank

# Then run:
python -m aqualert.runner --config config.yaml
```

### Server (MQTT subscriber + read API)

```bash
python server/receiver.py --config config.yaml --db telemetry.sqlite
# Endpoints: GET /health, /devices/<id>/latest, /devices/<id>/history
# --no-mqtt runs the read API only
```

### Tests

```bash
cd aqualert-ai
python -m pytest                  # all tests
python -m pytest tests/test_detector.py   # single file
```

### Detection pipeline

```
HC-SR04 sensor
  → sensor.py (SimulatedSensor / HCSR04Sensor + VirtualClock)
  → measurement.py (7 samples, MAD outlier rejection, Student's-t 95% CI → Measurement)
  → detector.py (event unwrap → OLS slope CI → state machine → Detection)
  → telemetry.py (MQTT/TLS + REST fallback + SQLite store-and-forward)
```

**Detection states:** `NORMAL`, `WATCH`, `LEAK_SUSPECTED`, `SENSOR_FAULT`. A leak is only flagged when the *upper* bound of the slope CI clears the threshold — conservative by design. During occupied hours, a trend must sustain for 3 consecutive windows before escalating from `WATCH` to `LEAK_SUSPECTED`.

`gpiozero`/`RPi.GPIO` are **not** hard dependencies — they are imported lazily so simulation works with zero GPIO hardware.

REST fallback uses `urllib` (stdlib only) to avoid an extra dependency on constrained Pi hardware.

---

## Compost AI

The model lives entirely in a Jupyter notebook (`Compost-AI/Compost AI (EfficientNetB0 ~96% Accuracy).ipynb`). Pre-trained weights are checked in:

- `Models/efficientnet-b0-weights.keras` — full Keras model
- `Models/quantized-tflite-weights.tflite` — quantized for Pi 4

To retrain or audit: open the notebook and run all cells (requires TensorFlow + a GPU for speed; CPU is slow but works).

---

## Pulse Agent AI

### Install

```bash
cd pulse-agent-ai
python -m venv .venv               # already present
.venv\Scripts\activate             # Windows
pip install -r requirements.txt

# GPU / Gemma variant:
pip install -r requirements-gpu.txt
# Google Gemma API variant:
pip install -r requirements-google.txt
```

### Setup and run

```bash
# Initialize the SQLite database:
python scripts/init_db.py

# Build the RAG index from project docs + research_sources.json:
python scripts/build_rag_index.py

# Run the demo (asks three sample questions):
python scripts/run_demo.py

# Gemma smoke test (requires GPU or Lambda setup — see docs/gemma_lambda.md):
python scripts/run_gemma_smoke_test.py
```

### Architecture

```
data/raw/research_sources.json  +  context docs
        |
        v  build_rag_index.py
   TF-IDF vectorizer + matrix (joblib)  ←─ app/rag.py (RagRetriever)
        |
        v  app/agent.py (PulseAgent)
   SQLite anomaly logs  →  analytics  →  RAG retrieval  →  Gemma / CPU fallback
        |
        v
   action_cards + answer  →  FastAPI  →  dashboard
```

RAG uses cosine similarity over a TF-IDF matrix. The index is a joblib dict with keys `vectorizer`, `matrix`, and `chunks`. `RagRetriever` lazy-loads it on first search call.

The agent (`app/agent.py`) and FastAPI app are not yet present in the repo — `run_demo.py` references them as the next implementation step.

---

## Key design constraints

- Every module is **advisory only** — no actuators, no irreversible actions.
- Every alert ships a confidence score, CI, and human-readable reasoning trace.
- Credentials always come from environment variables; none are in config files or code.
- The simulator is seeded (`sensor.sim_seed` in config) so demo runs are reproducible.
