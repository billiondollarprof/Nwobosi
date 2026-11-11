# The converter

A small service that turns a Word, PowerPoint or Excel file into a PDF
exactly as it is laid out (LibreOffice), and a PDF into an editable Word file
(pdf2docx). The chat uses it when somebody wants a file in the other format,
and to send a finished deck, sheet or document as a PDF. See `app.py` for what it does and `DOCUMENT-HARNESS.md`, section 8,
for why.

Until it is deployed, conversion still works: the browser does it, keeps
every word, and says the look is not the original's.

**Checked again 2026-11-11:** run here with LibreOffice; a 7 slide deck
from the live app, a spreadsheet and a Word file each came back as a PDF
(7, 1 and 1 pages), and a wrong secret got 401.

**What was checked before handing this over (2026-09-23):** the service
was run here with LibreOffice 24.2 and pdf2docx 0.5.13 and converted a
real letter both ways; a wrong secret got 401 and a wrong file type got
400. The Docker image itself could NOT be built here, because this
machine's network blocks the Debian package servers. Google Cloud Build
has no such block. If the build fails there, the log names the package.

## Deploy it on Google Cloud Run

Use the same Google Cloud project as Google Drive. It needs billing on.
Cloud Run stops the service when nobody is converting, so it costs nothing
when idle, and light use sits inside the free tier.

1. Make the secret. Any long random value, 64 characters. In Google Cloud,
   open **Cloud Shell** (the `>_` button, top right) and type
   `openssl rand -hex 32`. Keep the result for steps 4 and 7. Never paste
   it in a chat.
2. In the Google Cloud console go to **Cloud Run**, then **Deploy
   container** (or **Create service**).
3. Choose **Continuously deploy from a repository**, then **Set up with
   Cloud Build**:
   - Provider: GitHub. Connect it and pick `billiondollarprof/Nwobosi`.
   - Branch: `^main$`
   - Build type: **Dockerfile**, source location `/converter/Dockerfile`.
   If it asks to turn on the Cloud Build, Artifact Registry or Cloud Run
   APIs, say yes.
4. Service settings:
   - Service name: `stellaxafe-converter`
   - Region: `europe-west1` (or the one closest to your customers)
   - Authentication: **Allow unauthenticated invocations**. The secret is
     what protects it; without it every request gets 401.
   - Under **Container, Variables & Secrets**: add a variable
     `CONVERTER_SECRET` with the value from step 1.
   - Memory **2 GiB**, CPU **1**, request timeout **120** seconds,
     maximum concurrent requests per instance **1**, minimum instances
     **0**, maximum instances **3**.
5. Press **Create**. Wait for the green tick (the first build takes a few
   minutes, because LibreOffice is big).
6. Copy the service URL at the top of the page. Check it: open
   `<that URL>/health` in a browser. It should say `{"ok":true}`.
7. In **Supabase**, project `cbunsqzkhidwjtxdsmxd`, go to **Edge
   Functions**, then **Secrets**, and add:
   - `CONVERTER_URL` = the service URL from step 6
   - `CONVERTER_SECRET` = the value from step 1
8. Nothing to do here any more: GitHub already deployed the edge function
   `convert-document` from `main` (live since 2026-09-23). The two secrets
   from step 7 are all it was waiting for.

Then, in the chat, attach a Word file and say "make this a PDF". The card
should say "Every word came across" and no line about the look. Send
Claude a screenshot of any screen along the way that is not what these
steps describe.
