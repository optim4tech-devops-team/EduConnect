FROM python:3.11-slim

# Install system deps for face_recognition (dlib)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Install dlib separately first using pre-built wheel where possible
RUN pip install --no-cache-dir --prefer-binary dlib==19.24.2

# Install remaining packages
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
