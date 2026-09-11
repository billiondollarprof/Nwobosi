/* ==========================================================================
   THE RESUME LOG

   One small note per conversation, saying where the work had got to. It is
   written on every turn and read back when somebody returns.

   WHY IT EXISTS
   -------------
   Anthony, 2026-09-10: "what if the staff leaves their desk midway and
   returns the next day, is there something like a progressive log to always
   remember where things left off?"

   The messages and the stage were already being saved, so returning did
   bring the conversation back on screen. Three things were not saved, and
   all three were invisible, which is what made it hard to notice:

     1. The outside findings the person had approved. Held only in a ref in
        the browser. Come back tomorrow, press Build, and the figure they
        approved yesterday is silently missing from the document.
     2. How many interview questions had already been asked. Reset to zero,
        so a returning person got a fresh allowance and could be asked four
        more questions about a thing already settled.
     3. The frozen read back. Written to the database, never read out of it.

   So the visible half worked and the invisible half did not, and the
   invisible half is the half that decides what the document says.

   WHAT IT MUST NEVER BE
   ---------------------
   A second copy of the messages. Those live in `conversations.messages` and
   they are the record. This is a few hundred characters of working note. If
   it ever grows to the size of a transcript, something has gone wrong here.

   It must also never hold anything the person declined. Anthony's rule on
   findings: "if there is no go-ahead, it should not add it." So a rejected
   finding is not stored as text. Only a count is kept, and only so the
   returning person can be told plainly that nothing was carried over.

   WHERE IT LIVES
   --------------
   `conversations.state`, a jsonb column that defaults to `{}`. The default
   matters: every conversation written before this file existed reads back as
   an empty object, and `readResumeLog` below turns that into a valid empty
   log rather than throwing. Nothing has to be migrated.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SECTION 1: The shape, and the version on it

   `v` is on the object so a future change can tell an old log from a new
   one and decide what to do, rather than guessing from which keys happen to
   be present. A log whose version this file does not recognise is treated
   as empty, which loses a note and never corrupts a conversation.
   -------------------------------------------------------------------------- */

export const RESUME_LOG_VERSION = 1;

/* Hard ceilings, so a runaway turn cannot write a transcript in here. These
   are generous for a working note and far below anything that would slow a
   row down. */
const MAX_MAKING = 200;
const MAX_MISSING = 300;
const MAX_FINDINGS = 12;
const MAX_FINDING_CHARS = 1200;

export function emptyResumeLog() {
  return {
    v: RESUME_LOG_VERSION,
    making: "",
    asked: 0,
    findings: [],
    declined: 0,
    missing: "",
    at: null,
  };
}

/* --------------------------------------------------------------------------
   SECTION 2: Writing one

   Every field is optional at the call site, because a turn early in a
   conversation genuinely does not know most of them yet. Anything missing
   comes out as the empty version of itself, never as undefined, so the
   column always holds a complete object.
   -------------------------------------------------------------------------- */

export function buildResumeLog({
  making = "",
  asked = 0,
  findings = [],
  declined = 0,
  missing = "",
} = {}) {
  return {
    v: RESUME_LOG_VERSION,
    making: oneLine(making).slice(0, MAX_MAKING),
    asked: countOf(asked),
    findings: (Array.isArray(findings) ? findings : [])
      .filter((f) => typeof f === "string" && f.trim())
      .slice(0, MAX_FINDINGS)
      .map((f) => f.trim().slice(0, MAX_FINDING_CHARS)),
    declined: countOf(declined),
    missing: oneLine(missing).slice(0, MAX_MISSING),
    at: new Date().toISOString(),
  };
}

/* --------------------------------------------------------------------------
   SECTION 3: Reading one back

   Written to survive anything the column can hand over: null, an empty
   object from the default, a log from a version this file does not know,
   or a field of the wrong type. All of those come back as a valid log. A
   conversation must never fail to open because its note was odd.
   -------------------------------------------------------------------------- */

export function readResumeLog(raw) {
  const blank = emptyResumeLog();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return blank;
  if (raw.v !== RESUME_LOG_VERSION) return blank;

  return {
    v: RESUME_LOG_VERSION,
    making: typeof raw.making === "string" ? raw.making.slice(0, MAX_MAKING) : "",
    asked: countOf(raw.asked),
    findings: Array.isArray(raw.findings)
      ? raw.findings
          .filter((f) => typeof f === "string" && f.trim())
          .slice(0, MAX_FINDINGS)
          .map((f) => f.slice(0, MAX_FINDING_CHARS))
      : [],
    declined: countOf(raw.declined),
    missing: typeof raw.missing === "string" ? raw.missing.slice(0, MAX_MISSING) : "",
    at: typeof raw.at === "string" ? raw.at : null,
  };
}

/* --------------------------------------------------------------------------
   SECTION 4: Saying it out loud

   What a returning person is told, in one line. Only the things they cannot
   already see on screen, because the conversation itself is right there and
   repeating it back would be noise.

   Returns an empty string when there is nothing invisible to report, and
   the caller shows nothing at all in that case. A line that appears every
   single time is a line people stop reading.
   -------------------------------------------------------------------------- */

export function resumeLine(log, { hasBrief = false } = {}) {
  const parts = [];

  if (log.findings.length === 1) parts.push("1 thing you approved from outside");
  else if (log.findings.length > 1) parts.push(`${log.findings.length} things you approved from outside`);

  if (hasBrief) parts.push("the brief you confirmed");

  if (!parts.length) return "";
  return `Picked back up. Still holding ${joinPlainly(parts)}.`;
}

/* --------------------------------------------------------------------------
   SECTION 5: Small helpers

   Kept at the bottom and kept dull on purpose. Nothing here should ever
   need explaining twice.
   -------------------------------------------------------------------------- */

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/* Anything that is not a whole number at or above zero becomes zero. A
   count that arrives as NaN or as a string would otherwise be written
   straight back to the column and then used in arithmetic. */
function countOf(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function joinPlainly(parts) {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
