/* ==========================================================================
   THE BRAIN, STUBBED FOR TESTS

   WHY THIS EXISTS. Six tests build an edge function with esbuild, then import
   the built file from a temp directory and drive it against a fake model.
   That worked while every model name and price lived inside the function
   being tested. It stopped working when those moved into
   `supabase/functions/_shared/brain.ts`, for two reasons:

     1. `../_shared/brain.ts` cannot resolve from `/tmp`, so the import throws
        ERR_MODULE_NOT_FOUND before a single assertion runs.
     2. The real brain imports the Anthropic SDK, and the whole point of these
        tests is that they cannot reach a model provider.

   So the brain is stubbed the same way `createClient`, `canvaAccessToken` and
   `Anthropic` already are in these harnesses. This is plumbing, not an
   assertion: no test in this repo checks a cents value or a model string, so
   nothing here can hide a pricing or routing regression.

   ⚠️ THE STUB CARRIES NO REAL NUMBERS, ON PURPOSE. A stub holding copied
   prices would drift from the table in brain.ts and then quietly disagree with
   the thing it stands in for. It returns harmless zeros instead, so a test
   that ever does start caring about cost fails loudly rather than passing on
   a stale figure.

   ⚠️ `clientFor` MUST NOT REFER TO THE FILE'S OWN `Anthropic`. A harness
   replaces the SDK import with a fake class, but esbuild DROPS an import
   whose only uses are types. canva-design mentions `Anthropic` solely as
   `Anthropic.Tool`, so its built file carries no Anthropic import at all and
   there is nothing for the harness's replace to hit. The first version of
   this stub did refer to it and threw "Anthropic is not defined" at run time.
   So it reads the harness's fake off `globalThis.__anthropic` instead, and
   falls back to an empty object when a harness supplies none, which is
   exactly what `new Anthropic()` used to produce.
   ========================================================================== */

/* Matches the brain import however many names it brings in. Single-line only,
   which is why every import of it in the functions is kept on one line. */
export const BRAIN_IMPORT_RE = /import \{[^}]*\} from "[^"]*brain\.ts";/;

export const BRAIN_STUB = [
  "const {",
  "  vendorFor, modelFor, specialFor, rateFor, supportsAdaptiveThinking,",
  "  billableDollars, centsExact, centsRoundedUp, hasKeyFor, keyNameFor, clientFor,",
  "} = {",
  '  vendorFor: () => "anthropic",',
  '  modelFor: () => "stub-model",',
  '  specialFor: () => "stub-model",',
  "  rateFor: () => ({ input: 0, output: 0, cacheWrite: { short: 0, long: 0 }, cacheReadMult: 0, adaptiveThinking: true }),",
  "  supportsAdaptiveThinking: () => true,",
  "  billableDollars: () => 0,",
  "  centsExact: () => 0,",
  "  centsRoundedUp: () => 0,",
  "  hasKeyFor: () => true,",
  '  keyNameFor: () => "ANTHROPIC_API_KEY",',
  "  clientFor: (...a) => (globalThis.__anthropic ? new globalThis.__anthropic(...a) : {}),",
  "};",
].join("\n");
