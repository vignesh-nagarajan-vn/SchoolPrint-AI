# Hugging Face Space (Docker SDK). HF routes traffic to $PORT (7860 by default).
FROM python:3.11-slim

# libGL/libglib are needed by opencv-python-headless at import time.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HF mounts persistent storage (if enabled) at /data; keep correction memory there.
ENV MEMORY_PATH=/data/correction_memory.json \
    PORT=7860

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
