FROM python:3.11-slim

# Build tools + runtime libs needed by dlib / face_recognition
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Compile dlib from source (system cmake keeps build reliable)
RUN pip install --no-cache-dir dlib==19.24.4

RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
