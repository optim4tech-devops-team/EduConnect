FROM python:3.11-slim

# Minimal system deps — no cmake/compilation needed when using pre-built wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# dlib 19.24.4 ships pre-built manylinux wheels for Python 3.11 — no compilation
RUN pip install --no-cache-dir --prefer-binary dlib==19.24.4
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
