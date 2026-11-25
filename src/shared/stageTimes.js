/* ==========================================================================
   HOW LONG EACH STAGE TAKES, AND WHAT TO SAY ABOUT IT

   What this is: the record of how long each stage of the assistant really
   took, and the estimate shown on the working line and the build card.

   Why. Anthony, 2026-11-22: "Anything less than 2mins for each stage... We
   can even put an estimate completion time for each task, including when
   the agent searches online so the person can wait with time in mind."
   And 2026-11-25: when it runs long, say so and ask for a little patience.

   How it stays true (the rule in thinkingWords.js, never say anything that
   is not true):
     - The estimate is "about", taken from real runs of that stage in this
       browser: the middle value of the last ten. Until there are three
       runs, it uses the starting guesses below.
     - It is never a promise. Once a stage runs well past it, the line says
       plainly that it is taking longer than usual.

   What it must never do:
     - Break a turn. Storage can be missing or full; then it just uses the
       starting guesses.
   ========================================================================== */

/* Starting guesses, in milliseconds. Research is the one measured figure:
   the live run of 2026-11-10 searched for 87 seconds. */
export const DEFAULT_MS = {
  orient: 15000,
  interview: 15000,
  analyse: 25000,
  research: 90000,
  brief: 35000,
  generate: 60000,
  look: 30000,
  revise: 30000,
};

const FALLBACK_MS = 20000;
const KEEP = 10;
const MIN_RUNS = 3;
const KEY = "stellaxafe.stageTimes";

/* The line shown once a stage runs well past its estimate. Anthony,
   2026-11-25: it should ask for a little more patience. */
export const OVERDUE_LINE = "This is taking longer than usual. Please bear with me a little longer.";

function load(storage) {
  try {
    const raw = storage?.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function defaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/* Keeps one finished stage's time. Anything under half a second or over
   twenty minutes is not a real run (a cancelled turn, a laptop asleep). */
export function recordStageTime(stage, ms, storage = defaultStorage()) {
  if (!stage || !Number.isFinite(ms) || ms < 500 || ms > 20 * 60 * 1000) return;
  try {
    const data = load(storage);
    const list = Array.isArray(data[stage]) ? data[stage] : [];
    data[stage] = [...list, Math.round(ms)].slice(-KEEP);
    storage?.setItem(KEY, JSON.stringify(data));
  } catch {
    /* Storage full or blocked: the estimate falls back to the guesses. */
  }
}

function median(list) {
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* The estimate for one stage, in milliseconds. */
export function estimateMs(stage, storage = defaultStorage()) {
  const list = load(storage)[stage];
  if (Array.isArray(list) && list.length >= MIN_RUNS) return median(list);
  return DEFAULT_MS[stage] ?? FALLBACK_MS;
}

/* The whole build, from writing the plan to the file being looked at. Word
   and Excel are not looked at, so they have no look time. */
export function buildEstimateMs(format, storage = defaultStorage()) {
  const lookable = format === "pdf" || format === "pptx";
  return estimateMs("brief", storage) + estimateMs("generate", storage) + (lookable ? estimateMs("look", storage) : 0);
}

/* Past the estimate by enough that saying so is fair: half as long again,
   and at least fifteen seconds over. */
export function isOverdue(elapsedMs, estimate) {
  return elapsedMs > estimate * 1.5 && elapsedMs > estimate + 15000;
}

/* "40s", "1½ min", "3 min". Rounded, because it is an estimate. */
export function formatDuration(ms) {
  const s = Math.max(0, ms) / 1000;
  if (s < 90) return `${Math.max(5, Math.round(s / 5) * 5)}s`;
  const halves = Math.round(s / 30);
  const whole = Math.floor(halves / 2);
  return `${halves % 2 ? `${whole || ""}½` : whole} min`;
}

/* The small line beside the working words: the estimate first, then the
   time so far against it, and once it is overdue just the time so far. */
export function timeHint(elapsedMs, estimate) {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  if (isOverdue(elapsedMs, estimate)) return `${seconds}s`;
  if (seconds < 4) return `about ${formatDuration(estimate)}`;
  return `${seconds}s of about ${formatDuration(estimate)}`;
}
