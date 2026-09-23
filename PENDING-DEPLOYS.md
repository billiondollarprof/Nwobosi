# Waiting to be deployed

Changes that are written and correct but not live. They go out bundled with
the next change that genuinely needs a deploy.

**Empty this file when you deploy.** A list of pending work that still lists
work already done is worse than no list, because the next person cannot tell
which half is true.

For the rules on how a deployed function is changed, see `CLAUDE.md`, the
section "An edge function that already works is never rewritten from the
repo". Nothing here goes out any other way.

---

## Checked against the live project, 2026-09-23 (DeepSeek session)

Everything below was pulled from Supabase and compared with the repo. The
record had drifted, so what follows replaces what was written here before.

### assistant is v31, and v27 is already inside it

The old note said live was v26 and that v27 was waiting. Live is **v31**.
The v27 prompt lines are all present in the deployed copy:

- `THE DESIGN PLAN` (brief)
- `DESIGN IT, DO NOT JUST TYPE IT` and the `:::` layout blocks (generate)
- `THE SEARCH GATE` (research is refused unless the person said yes)
- the PICTURES lines and `:::image`

Nothing to do. Do not redeploy it for v27, because v27 is live already.

### oauth-callback is v14, and google-drive is already inside it

The old note said this one needed a REDEPLOY to add the Drive provider. It
does not. The deployed v14 already carries the `google-drive` provider entry.

### The three new functions went out on 2026-09-23

Deployed by the DeepSeek session, straight from the repo, verify JWT off,
matching every other function here.

| function | version | state |
|---|---|---|
| `convert-document` | v1 | ACTIVE |
| `drive-connect` | v1 | ACTIVE |
| `drive-upload` | v1 | ACTIVE |

The deployed source of all three was pulled back and checked against the
repo. They match.

## Still waiting, and none of it is a code deploy

### 1. The converter service on Google Cloud Run

`converter/` is written and was tested here with LibreOffice 24.2 and
pdf2docx 0.5.13. The service itself is not built. The steps are in
`converter/README.md`.

Until it exists, `convert-document` answers `{ ok: false, state:
"not_set_up" }` and the browser converts the file itself, saying the look is
not the original's. So conversion already works. It gets exact when the
service is up.

### 2. Two secrets in Supabase

Add these once the converter service has a URL. Nothing needs redeploying
afterwards, because the functions read them at run time.

- `CONVERTER_URL`
- `CONVERTER_SECRET`

The Google pair, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, are already
stored, which is what `drive-connect` assumes in its header.
