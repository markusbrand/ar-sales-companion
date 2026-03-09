# AR Sales Companion Backend – multi-arch (amd64, arm64, arm/v7 for Raspberry Pi)
FROM python:3.12-slim-bookworm

WORKDIR /app

# Non-root user
RUN adduser --disabled-password --gecos "" appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8888

ENV PYTHONUNBUFFERED=1

# Bind to 0.0.0.0 for container networking
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]
