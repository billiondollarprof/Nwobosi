# The converter (see app.py). LibreOffice for Word to PDF, pdf2docx for PDF
# to Word. Fonts are installed so a Word file prints in its own fonts, or
# in metric compatible ones (Carlito for Calibri, Caladea for Cambria,
# Liberation for Arial and Times) with the same line breaks and page breaks.
FROM python:3.11-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui \
      fonts-crosextra-carlito fonts-crosextra-caladea fonts-liberation fonts-dejavu \
      fonts-noto-core \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

# Cloud Run sends traffic to $PORT. One request at a time per instance keeps
# LibreOffice predictable; Cloud Run starts more instances when busy.
ENV PORT=8080
CMD exec uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1
