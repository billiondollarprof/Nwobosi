/* ==========================================================================
   THE BRAIN

   WHO DECIDES WHICH MODEL RUNS, AND WHY THIS FILE EXISTS.

   Anthony, 2026-09-10: "The name should not be shown because tomorrow we
   might be installing the same thing for a company using OpenAI. So I want
   to keep the same architecture, the same design, but just changing the
   model brain."

   StellaXafe is not sold as one hosted product. It is deployed per company,
   and a company may want a particular vendor. So the vendor is a property
   of the company, not a fact about this codebase.

   THE THREE LAYERS, and only the middle one is new here:

     1. THE LEVEL. `conversational` or `standard`. This is what the browser
        knows and what an admin sees. It never names a vendor. Unchanged
        from `src/shared/config.js`.
     2. THE VENDOR AND ITS MODELS. Chosen per company, held in the table
        below. One vendor may carry MORE THAN ONE MODEL, one per level, so a
        company can pay for the cheap brain on support and the capable one
        for office work. That is the cost efficiency Anthony asked for.
     3. THE ADAPTER. How to actually speak to that vendor. Step one uses
        only Anthropic, so nothing above this file changes behaviour.

   WHAT WAS WRONG BEFORE THIS FILE. The vendor was hardwired, not chosen.
   Eight functions each built their own client:

     new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

   and the model name lived in eight separate places. `MODEL_ID` in
   assistant/index.ts was described as "the only place in the entire
   codebase that names a real model", and that was true only of the
   assistant. The rest each carried their own constant.

   ⚠️ WHAT MUST NOT BE CHANGED BY THIS FILE. No stage, checkpoint, gate,
   tool attachment or document writer lives here. The interview still
   interviews, the read back still reads back, and the search tools are still
   absent from the request unless the stage is `research`. Those are enforced
   in assistant/index.ts and this file cannot loosen them.
   ========================================================================== */

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { makeOpenAiClient } from "./wire.ts";

/* --------------------------------------------------------------------------
   1. THE VOCABULARY
   -------------------------------------------------------------------------- */

export type Vendor = "anthropic" | "openai" | "deepseek";

/* The two rungs, unchanged. See src/shared/config.js and the note in
   assistant/index.ts about the ladder coming down from four. */
export type Tier = "conversational" | "standard";

/* ⚠️ WHAT A COMPANY GETS UNTIL SOMEBODY CHOOSES. Anthropic, because that is
   what every deployment runs on today and what the eight functions were
   written against. Adding the vendor column must change nothing for any
   existing company until a person sets it deliberately. */
export const DEFAULT_VENDOR: Vendor = "anthropic";

/* Read the vendor off a company row, tolerating its absence.
   ⚠️ The `brain_vendor` column does not exist yet. Until it does this always
   returns DEFAULT_VENDOR, which is what keeps this file a pure seam: adding
   the column later changes behaviour, and nothing before that does. */
export function vendorFor(row: { brain_vendor?: string | null } | null | undefined): Vendor {
  const v = row?.brain_vendor;
  if (v === "anthropic" || v === "openai" || v === "deepseek") return v;
  return DEFAULT_VENDOR;
}

/* Narrow shape so this does not depend on the Supabase client's type, which
   would drag the SDK into every caller. Only `from` is used. */
interface TableReader {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

function asVendor(value: unknown): Vendor {
  return (value === "anthropic" || value === "openai" || value === "deepseek")
    ? value
    : DEFAULT_VENDOR;
}

/* --------------------------------------------------------------------------
   WHICH VENDOR, PER COMPANY, AT REQUEST TIME

   ⚠️ THIS IS READ ON EVERY REQUEST AND NEVER CACHED, ON PURPOSE. An edge
   function isolate serves concurrent requests for DIFFERENT companies, so a
   module level variable holding the vendor would be shared between them and
   one company's answers could be produced by another company's brain. The
   vendor is a local, always.

   ⚠️ IT FAILS CLOSED TO ANTHROPIC, NOT TO AN ERROR. Any problem at all, a
   missing row, a network error, or the table not existing yet, resolves to
   `DEFAULT_VENDOR`, which is what every deployment runs today. That is what
   makes this safe to deploy BEFORE the migration is run: the worst case is
   today's behaviour, never a broken turn.
   -------------------------------------------------------------------------- */
export async function vendorForCompany(
  sb: TableReader | null | undefined,
  companyId: string | null | undefined,
): Promise<Vendor> {
  if (!sb || !companyId) return DEFAULT_VENDOR;
  try {
    const { data, error } = await sb
      .from("company_brain")
      .select("vendor")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) return DEFAULT_VENDOR;
    return asVendor((data as { vendor?: unknown } | null)?.vendor);
  } catch (_) {
    return DEFAULT_VENDOR;
  }
}

/* For the one function that never looked a company up. It resolves the
   company from the caller's own staff row first, which is the same lookup
   read-before-publish already does. */
export async function vendorForUser(
  sb: TableReader | null | undefined,
  userId: string | null | undefined,
): Promise<Vendor> {
  if (!sb || !userId) return DEFAULT_VENDOR;
  try {
    const { data, error } = await sb
      .from("staff")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) return DEFAULT_VENDOR;
    const companyId = (data as { company_id?: string } | null)?.company_id;
    return await vendorForCompany(sb, companyId ?? null);
  } catch (_) {
    return DEFAULT_VENDOR;
  }
}

/* --------------------------------------------------------------------------
   2. THE TABLE. The only place in the server that names a real model.
   -------------------------------------------------------------------------- */

/* WHAT A RATE IS.
   `input` and `output` are dollars per million tokens.
   `cacheReadMult` is a MULTIPLE OF THE INPUT RATE, not a price. Vendors
   disagree about what a cached token costs, and the existing metering
   already expressed Anthropic's disagreement as 0.1, so it is kept in that
   shape rather than restated as a price. The arithmetic in the functions
   does not move.

   ⚠️ CACHE WRITES HAVE TWO RATES, BECAUSE THE TTL DECIDES THE PRICE.
   Anthropic charges 1.25x the input rate for the default five minute cache
   and 2x for the one hour cache. assistant/index.ts asks for an hour and
   multiplies by 2; support-ask/index.ts takes the default and multiplies by
   1.25. Both are correct, and an earlier read of this file nearly called one
   of them a bug. The TTL travels with the call instead of being guessed.

   ⚠️ THESE ARE PEAK RATES ON PURPOSE. DeepSeek charges half price off-peak.
   Budgeting on the peak rate means a company is never undercharged because a
   job happened to run at a quiet hour. */
export interface Rate {
  input: number;
  output: number;
  cacheWrite: { short: number; long: number };
  cacheReadMult: number;
  /* Whether this model takes adaptive thinking. A property of the model, so
     it belongs beside the mapping rather than in a separate list. */
  adaptiveThinking: boolean;
}

/* Which cache a caller is actually using. `short` is the vendor default. */
export type CacheTtl = "short" | "long";

export interface Choice {
  model: string;
  rate: Rate;
}

/* ⚠️ ANTHROPIC NUMBERS ARE THE SHIPPED ONES AND MUST NOT DRIFT.
   conversational 1/5 and standard 2/10 are the PRICE rows already in
   assistant/index.ts and support-ask/index.ts, and 1.25 / 2 / 0.1 are the
   multipliers already hardcoded into their metering. Reproduced exactly so
   this file is a seam and not a repricing. */
const ANTHROPIC_WRITE = { short: 1.25, long: 2 };

/* ⚠️ DEEPSEEK PRICES ARE PEAK, FROM THE PUBLISHED TABLE.
   https://api-docs.deepseek.com/quick_start/pricing/
   flash: cache miss $0.30, output $1.20, cache hit $0.006.
   A write costs 1 because DeepSeek has NO cache-write premium: a write bills
   as an ordinary miss, whichever TTL is in play. cacheReadMult is
   0.006 / 0.30 = 0.02.

   ⚠️ ONE MODEL FOR BOTH LEVELS, and that is correct rather than lazy.
   DeepSeek's own release note for V4.1-Flash says it beats V4-Pro on
   performance, cost, speed and runtime, and that all deepseek-v4-pro
   requests now route to V4.1-Flash anyway. There is no second brain to
   choose. See https://api-docs.deepseek.com/news/news260910 */
const DEEPSEEK_RATE: Omit<Rate, "adaptiveThinking"> = {
  input: 0.30, output: 1.20, cacheWrite: { short: 1, long: 1 }, cacheReadMult: 0.02,
};

/* ⚠️ OPENAI IS DELIBERATELY NOT FILLED IN.
   The architecture has to carry it, because a company may want it, but
   nobody has chosen its models or checked its prices, and a guessed price is
   worse than a refusal. `clientFor` refuses OpenAI until this row is real,
   so selecting it fails loudly instead of quietly costing money on numbers
   nobody verified. */
const OPENAI_RATE: Omit<Rate, "adaptiveThinking"> = {
  input: 0, output: 0, cacheWrite: { short: 1, long: 1 }, cacheReadMult: 1,
};

export const BRAIN: Record<Vendor, Record<Tier, Choice>> = {
  anthropic: {
    conversational: {
      model: "claude-haiku-4-5",
      rate: { input: 1, output: 5, cacheWrite: ANTHROPIC_WRITE, cacheReadMult: 0.1, adaptiveThinking: false },
    },
    standard: {
      model: "claude-sonnet-5",
      rate: { input: 2, output: 10, cacheWrite: ANTHROPIC_WRITE, cacheReadMult: 0.1, adaptiveThinking: true },
    },
  },
  deepseek: {
    conversational: { model: "deepseek-flash", rate: { ...DEEPSEEK_RATE, adaptiveThinking: true } },
    standard: { model: "deepseek-flash", rate: { ...DEEPSEEK_RATE, adaptiveThinking: true } },
  },
  openai: {
    conversational: { model: "", rate: { ...OPENAI_RATE, adaptiveThinking: false } },
    standard: { model: "", rate: { ...OPENAI_RATE, adaptiveThinking: true } },
  },
};

/* --------------------------------------------------------------------------
   3. WHAT THE FUNCTIONS ASK FOR
   -------------------------------------------------------------------------- */

export function choiceFor(vendor: Vendor, tier: Tier): Choice {
  return BRAIN[vendor][tier];
}

/* ⚠️ JOBS THAT DO NOT RUN AT A LEVEL, AND THEY ARE NOT OVERSIGHTS.
   `describe-source` asks the SMALL model to describe a document. That is
   deliberate: it is a short job and the capable model is wasted on it. But
   it also PINS the dated snapshot, `claude-haiku-4-5-20251001`, while every
   other function floats on the bare name. A pinned snapshot and a floating
   name are different request strings, so moving this onto a level would
   quietly change which model answers. It stays exactly as it was.

   Kept per vendor so the exception survives a company moving vendor.
   Anthony's call whether this job should move onto a level like the rest. */
const SPECIAL: Record<Vendor, Record<string, string>> = {
  anthropic: { describeSource: "claude-haiku-4-5-20251001" },
  deepseek: { describeSource: "deepseek-flash" },
  openai: { describeSource: "" },
};

export function specialFor(vendor: Vendor, job: string): string {
  return SPECIAL[vendor][job] ?? "";
}

export function modelFor(vendor: Vendor, tier: Tier): string {
  return BRAIN[vendor][tier].model;
}

export function rateFor(vendor: Vendor, tier: Tier): Rate {
  return BRAIN[vendor][tier].rate;
}

export function supportsAdaptiveThinking(vendor: Vendor, tier: Tier): boolean {
  return BRAIN[vendor][tier].rate.adaptiveThinking;
}

/* --------------------------------------------------------------------------
   4. WHAT IT COST

   One arithmetic, two roundings, because the functions genuinely round
   differently today and changing that would be a repricing, not a refactor:
   the assistant keeps six decimal places (Anthony: "why do you suppose to
   round up numbers? That's real money"), while the four small functions
   round up to a whole cent.
   -------------------------------------------------------------------------- */

export interface Usage {
  /* Input the vendor did not have cached. */
  fresh: number;
  /* Input it wrote to the cache, and input it read back. */
  cacheWrite?: number;
  cacheRead?: number;
  output: number;
}

/* Dollars for one call, cache weighted the way the vendor bills it.
   `ttl` says which cache the caller actually asked the vendor for, because
   that is what decides the write price. */
export function billableDollars(
  vendor: Vendor, tier: Tier, u: Usage, ttl: CacheTtl = "short",
): number {
  const r = BRAIN[vendor][tier].rate;
  const writeMult = ttl === "long" ? r.cacheWrite.long : r.cacheWrite.short;
  const billableInput =
    u.fresh + (u.cacheWrite ?? 0) * writeMult + (u.cacheRead ?? 0) * r.cacheReadMult;
  return (billableInput / 1_000_000) * r.input + (u.output / 1_000_000) * r.output;
}

/* The rule the assistant and support both use: six decimal places, never
   rounded up.

   MOVED HERE FROM support-ask/index.ts, WITH ITS REASONING INTACT, because
   the arithmetic it describes now lives in this file and the explanation
   belongs with the thing it explains.

   NO ROUNDING UP. Anthony, 2026-09-10: "why do you suppose to be rounding up
   numbers? That's real money."

   He was right and it was worse than untidy. Math.ceil turned a message that
   truly cost 0.26 of a cent into a whole cent charged against the company.
   Nearly four times over, on every message, and always in our favour, never
   theirs.

   The cause was the column, not the arithmetic: budget_cents_remaining was
   an integer, so a fraction of a cent had nowhere to go. It is numeric now,
   so the real number is sent.

   Six decimal places, because that is what the column holds. Rounded there
   rather than sent raw, so a float's fifteenth digit does not travel across
   the wire pretending to be money. */
export function centsExact(
  vendor: Vendor, tier: Tier, u: Usage, ttl: CacheTtl = "short",
): number {
  return Math.round(billableDollars(vendor, tier, u, ttl) * 100 * 1e6) / 1e6;
}

/* The small functions' rule: whole cents, rounded up. */
export function centsRoundedUp(
  vendor: Vendor, tier: Tier, u: Usage, ttl: CacheTtl = "short",
): number {
  return Math.ceil(billableDollars(vendor, tier, u, ttl) * 100);
}

/* --------------------------------------------------------------------------
   5. THE CLIENT

   ONE CLIENT, WHATEVER THE VENDOR. Anthropic is spoken through its own SDK.
   Everyone else is spoken through `_shared/wire.ts`, which translates to and
   from the OpenAI format. DeepSeek publishes that format natively, which is
   why one adapter covers both it and OpenAI.

   ⚠️ THIS IS THE ONLY PART OF THE SERVER THAT CHANGED WHEN A SECOND VENDOR
   ARRIVED. No stage, prompt, gate or checkpoint lives here, which is what
   makes the brain swappable without the product changing.
   -------------------------------------------------------------------------- */

const ANTHROPIC_KEY = "ANTHROPIC_API_KEY";

/* The secret this vendor needs. Named here so an error line can say which
   one is missing without the caller hardcoding a vendor's name. */
export function keyNameFor(vendor: Vendor): string {
  if (vendor === "anthropic") return ANTHROPIC_KEY;
  if (vendor === "deepseek") return "DEEPSEEK_API_KEY";
  return "OPENAI_API_KEY";
}

/* For the four functions that check the key themselves and log their own
   line before giving up. They keep their message and their early return;
   only the name of the secret now comes from here. */
export function hasKeyFor(vendor: Vendor): boolean {
  return !!Deno.env.get(keyNameFor(vendor));
}

/* WHERE EACH VENDOR LIVES. */
const WIRE_BASE: Record<Vendor, string> = {
  anthropic: "",
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
};

/* Whether this vendor is ready to be chosen. OpenAI is not, because nobody has
   picked its models or checked its prices. A vendor whose row is empty must
   fail loudly rather than quietly send an empty model name. */
export function vendorReady(vendor: Vendor): boolean {
  return Object.values(BRAIN[vendor]).every((c) => c.model.length > 0);
}

/* ⚠️ THE CAST IS DELIBERATE AND NARROW.
   `Anthropic` in the SDK describes the whole surface of that client. The wire
   adapter implements exactly `messages.create` and `messages.stream`, which is
   all any caller here uses, and both are asserted in the tests. The SDK's
   typing being wider than the contract is why this reads as a cast rather than
   a substitution, and the same shape of cast is already used in
   assistant/index.ts for its thinking config. */
export function clientFor(vendor: Vendor): Anthropic {
  const key = Deno.env.get(keyNameFor(vendor));
  if (!key) throw new Error(`${keyNameFor(vendor)} is not set`);

  if (vendor === "anthropic") return new Anthropic({ apiKey: key });

  if (!vendorReady(vendor)) {
    throw new Error(`No models chosen for ${vendor} yet, so it cannot be used`);
  }

  return makeOpenAiClient(WIRE_BASE[vendor], key) as unknown as Anthropic;
}
