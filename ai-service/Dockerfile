FROM python:3.11-slim

# Build tools needed to compile dlib from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# cmake pip package provides the cmake binary without a system install
RUN pip install --no-cache-dir cmake

# dlib compiles from source; GHA layer cache keeps subsequent builds fast
RUN pip install --no-cache-dir dlib==19.24.4

RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
