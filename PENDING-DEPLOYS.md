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

## 2026-09-26: `assistant` v52, DEPLOYED by Anthony, checked

Anthony redeployed it himself on 2026-09-26. Checked by pulling v52: its
`index.ts` is line for line the repo copy, which is v51 plus the 13 layout
lines and nothing removed, and `_shared/brain.ts`, `wire.ts` and
`search.ts` are identical to the repo. Nothing left pending here. The
section below is kept as the record of what went in.

### Before it went out: the 13 layout lines

Checked against the live project on 2026-09-26, by pulling the deployed
source and comparing every text literal of 20 characters or more:

| file | literals in repo | missing from live | in live but not repo |
|---|---|---|---|
| `assistant/index.ts` | 740 | **13** | 0 |
| `_shared/brain.ts` | 6 | 0 | 0 |
| `_shared/wire.ts` | 12 | 0 | 0 |
| `_shared/search.ts` | 25 | 0 | 0 |

Live is `assistant` **v51**. It already carries everything from
DOCUMENT-HARNESS.md sections 1 to 8 (skip means skip, picture credits,
figure numbers, charts, conversion). The 13 missing lines are exactly the
section 9 layout lines ("LAID OUT LIKE AN UPLOAD, ONLY IF THEY ASKED" in the
read back, the "Layout: like <file>" line in the brief, and the writing rule
that follows it). Nothing is deleted. Nothing live is missing from the repo.

Anthony said on 2026-09-23 he redeploys this himself. Not deployed.

## 2026-09-25, later: the first real turn, and the bug it found

**The staff side worked on DeepSeek, first try.** Anthony typed hello and got a
reply. The usage line, verbatim:

```
usage stage=orient tier=standard fresh=19127 cacheWrite=0 cacheRead=0 out=76 cents=0.58293
```

**0.58 of one cent.** 19,127 input at $0.30 per million plus 76 output at $1.20
per million is exactly that, so DeepSeek answered and the meter is right.
`cacheWrite=0` is correct for this vendor: a write bills as an ordinary miss and
is already inside `fresh`.

**The WhatsApp side did not answer, and the log said why:**

```
support model call failed Error: 400
"Thinking mode does not support this tool_choice"
```

⚠️ **SIX OF THE EIGHT FUNCTIONS WERE BROKEN ON DEEPSEEK, AND THE ASSISTANT HID
IT.** Anthropic leaves thinking OFF unless a request turns it on. DeepSeek turns
it ON unless a request says otherwise. The adapter sent nothing when nothing was
asked for, so the same request meant "no thinking" on Anthropic and "all the
thinking" on DeepSeek, and DeepSeek refuses thinking together with a forced tool.

Six of the eight force a tool by name and none of them sets thinking, so all six
were broken. The assistant worked because it DOES set thinking and does not force
a tool, which is exactly why the fault was invisible until a customer-facing
function was used.

Fixed in `_shared/wire.ts`: asking for nothing now means OFF, out loud, which is
parity with the vendor this code was written against.

**Redeployed, every one verified:**

| function | now |
|---|---|
| `assistant` | **v43** |
| `support-ask` | **v26** |
| `add-link` | **v21** |
| `canva-design` | **v13** |
| `read-image` | **v12** |
| `describe-source` | **v12** |
| `group-images` | **v12** |
| `read-before-publish` | **v15** |

⚠️ **`support-ask` HAS STILL NOT ANSWERED A REAL MESSAGE.** It is fixed and
deployed, and the shape that failed is now a test, but a person has to send one
before this is finished.

## Checked against the live project, 2026-09-25 (DeepSeek session)

**Eight functions were deployed, and every version written below was stale.**
The 2026-09-23 check recorded `assistant` at v31 and three functions at v1.
Before deploying, every live copy was compared against the repo and all eight
carried it marker for marker, so nothing had been changed in the console and
left out of git. The versions had moved; the code had not.

| function | was | now | markers checked | lost |
|---|---|---|---|---|
| `assistant` | v41 | **v42** | 623 | 0 |
| `support-ask` | v24 | **v25** | 67 | 0 |
| `add-link` | v19 | **v20** | 13 | 0 |
| `read-before-publish` | v13 | **v14** | 9 | 0 |
| `canva-design` | v11 | **v12** | 9 | 0 |
| `read-image` | v10 | **v11** | 28 | 0 |
| `describe-source` | v10 | **v11** | 10 | 0 |
| `group-images` | v10 | **v11** | 52 | 0 |

All eight are ACTIVE with `verify_jwt` off, unchanged. Each was checked with
`node scripts/check-deploy.mjs` before and after, which is the standing
permission in `CLAUDE.md` being used for the first time.

⚠️ **Not yet used.** Nothing here has been exercised by a person since the
deploy, so it is verified structurally and not by use.

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
