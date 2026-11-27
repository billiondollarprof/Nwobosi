# The printer (Gotenberg)

What prints the app's PDFs. Since 2026-11-27 each document is built as a
designed web page (`src/shared/docs/html/`) and printed by Chromium, the same
way Anthony's own proposals were made. Chromium runs inside **Gotenberg**, a
free, open source print service (MIT licence), on Google Cloud Run in
Anthony's own Google Cloud.

The app talks to it only through the edge function `print-pdf`, which checks
who is asking. Until it is set up, or if it ever stops answering, the app
makes the PDF with its own writer (`src/shared/docs/pdf.js`), as before.

Gotenberg also turns Word, PowerPoint and Excel into PDF. The older converter
(`converter/`) stays as the second fallback.

## Set it up on Google Cloud Run

About 10 minutes. It costs nothing when idle; light use sits inside the free
tier and the trial credit.

1. **Make the password.** In Google Cloud, open **Cloud Shell** (the `>_`
   button, top right). Type `openssl rand -hex 24` and press Enter. Keep the
   result somewhere private. Never paste it in a chat.
2. Go to **Cloud Run**, then **Deploy container** (or **Create service**).
3. Choose **Deploy one revision from an existing container image**. In
   **Container image URL** type:
   `docker.io/gotenberg/gotenberg:8`
4. **Service name:** `stellaxafe-printer`. **Region:** `europe-west1`.
5. **Authentication:** **Allow unauthenticated invocations**. The password
   is what protects it.
6. Open **Container(s), Volumes, Networking, Security**. On the
   **Container** tab:
   - **Container port:** `3000`
   - **Container arguments**, add two lines: `gotenberg` and
     `--api-enable-basic-auth`
   - **Memory** `2 GiB`, **CPU** `1`
7. On the **Variables & Secrets** tab, add two variables:
   - `GOTENBERG_API_BASIC_AUTH_USERNAME` = `stellaxafe`
   - `GOTENBERG_API_BASIC_AUTH_PASSWORD` = the password from step 1
8. Under **Revision scaling** (or **Autoscaling**): minimum instances `0`,
   maximum `3`. Request timeout `120` seconds.
9. Press **Create** and wait for the green tick.
10. Copy the service URL at the top. Open `<that URL>/health` in a browser.
    It should show a short text with `"status":"up"`.
11. In **Supabase**, project `cbunsqzkhidwjtxdsmxd`, go to **Edge
    Functions**, then **Secrets**, and add three:
    - `PDF_PRINTER_URL` = the service URL from step 10, with nothing after it
    - `PDF_PRINTER_USER` = `stellaxafe`
    - `PDF_PRINTER_PASSWORD` = the password from step 1

The next PDF anyone downloads comes from the printer.

## If something goes wrong

- **The build or start fails:** the Cloud Run **Logs** tab says why.
- **`/health` asks for a password:** the password is working. The health
  page may be protected too.
- **PDFs still look like the old ones:** check the three secret names in
  Supabase are spelled exactly as above.
