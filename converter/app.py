"""
THE CONVERTER: A WORD FILE TO PDF, OR A PDF TO WORD, AND NOTHING ELSE.

Anthony, 2026-09-23: "it's a conversion, meaning nothing inside the
original document is missing and no new thing is added."
(DOCUMENT-HARNESS.md, section 8.)

WHAT THIS IS
A small web service, run on Google Cloud Run in Anthony's own Google Cloud
project. It does two things:

  Word to PDF   LibreOffice prints the Word file exactly as it is laid out:
                its letterhead, its fonts, its margins. Nothing restyled.
  PDF to Word   pdf2docx rebuilds the page as an editable Word file,
                keeping tables, pictures and the layout far better than
                reading the text out and starting again.

WHO MAY CALL IT
Only the Supabase function convert-document. Every request must carry the
header X-Converter-Secret, equal to the CONVERTER_SECRET this service was
started with. Anything else gets 401 and nothing is read. The browser never
talks to this service; the Supabase function checks who the person is
first, then passes the file on.

WHAT IT MUST NEVER DO
- Keep a file. Each one is written to a fresh temporary folder, converted,
  read back and the folder is deleted, whether the conversion worked or not.
- Log a file's contents or its name. The log says what kind of conversion
  ran and how big it was, nothing that belongs to the company.
- Change the document. It converts. It does not tidy, restyle or add.

READ TOP TO BOTTOM
  1. Settings
  2. The two conversions
  3. The one endpoint
"""

import hmac
import logging
import os
import shutil
import subprocess
import tempfile

from fastapi import FastAPI, Header, HTTPException, Request, Response

# ---------------------------------------------------------------------------
# 1. Settings
# ---------------------------------------------------------------------------

SECRET = os.environ.get("CONVERTER_SECRET", "")
MAX_BYTES = 20 * 1024 * 1024  # 20 MB, the same cap the Supabase function uses
TIMEOUT_SECONDS = 120

MIME = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

app = FastAPI(title="converter", docs_url=None, redoc_url=None, openapi_url=None)

# pdf2docx reports every page it reads at INFO. Page numbers only, but the
# rule is that nothing about a file is logged beyond its size, so that goes.
logging.getLogger().setLevel(logging.WARNING)

# ---------------------------------------------------------------------------
# 2. The two conversions
# ---------------------------------------------------------------------------


def word_to_pdf(folder: str, source: str) -> str:
    """LibreOffice, headless, with its own profile folder so two requests at
    once never fight over one profile."""
    profile = os.path.join(folder, "profile")
    subprocess.run(
        [
            "soffice",
            f"-env:UserInstallation=file://{profile}",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            folder,
            source,
        ],
        check=True,
        timeout=TIMEOUT_SECONDS,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return os.path.join(folder, "in.pdf")


def pdf_to_word(folder: str, source: str) -> str:
    from pdf2docx import Converter  # imported here so a Word to PDF request never pays for it

    target = os.path.join(folder, "out.docx")
    converter = Converter(source)
    try:
        converter.convert(target)
    finally:
        converter.close()
    return target


# ---------------------------------------------------------------------------
# 3. The one endpoint
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/convert")
async def convert(
    request: Request,
    to: str,
    x_converter_secret: str = Header(default=""),
):
    # Compared in constant time, so the answer's timing gives nothing away.
    if not SECRET or not hmac.compare_digest(x_converter_secret, SECRET):
        raise HTTPException(status_code=401, detail="not allowed")
    if to not in MIME:
        raise HTTPException(status_code=400, detail="to must be pdf or docx")

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="no file")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    # What came in is decided by its first bytes, not by anything the caller
    # says: a PDF starts with %PDF, a Word file is a zip and starts with PK.
    is_pdf = body[:4] == b"%PDF"
    is_zip = body[:2] == b"PK"
    if to == "pdf" and not is_zip:
        raise HTTPException(status_code=400, detail="a Word file is needed to make a PDF")
    if to == "docx" and not is_pdf:
        raise HTTPException(status_code=400, detail="a PDF is needed to make a Word file")

    folder = tempfile.mkdtemp(prefix="convert-")
    try:
        source = os.path.join(folder, "in.docx" if to == "pdf" else "in.pdf")
        with open(source, "wb") as handle:
            handle.write(body)
        target = word_to_pdf(folder, source) if to == "pdf" else pdf_to_word(folder, source)
        with open(target, "rb") as handle:
            result = handle.read()
        print(f"converted to={to} in_bytes={len(body)} out_bytes={len(result)}", flush=True)
        return Response(content=result, media_type=MIME[to])
    except subprocess.TimeoutExpired:
        print(f"timed out to={to} in_bytes={len(body)}", flush=True)
        raise HTTPException(status_code=504, detail="the conversion took too long")
    except HTTPException:
        raise
    except Exception as error:  # noqa: BLE001 - any failure is a plain 500, with no file content in it
        print(f"failed to={to} in_bytes={len(body)} kind={type(error).__name__}", flush=True)
        raise HTTPException(status_code=500, detail="the conversion failed")
    finally:
        shutil.rmtree(folder, ignore_errors=True)
