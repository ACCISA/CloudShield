FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY core/ ./core/
COPY tasks/ ./tasks/
COPY proto/ ./proto/
COPY main.py ./main.py

# drop root
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
  && chown -R appuser:appuser /app
USER appuser

CMD ["python", "main.py"]
