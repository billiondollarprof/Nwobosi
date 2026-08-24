/* ==========================================================================
   SETUP API
   Every server call the setup flow makes lives here, so the screens stay
   about the screens.

   Access codes are never checked in the browser in the real thing. The
   table has row level security on with no policies at all, which means
   only the service role can touch it, and that only happens inside an edge
   function. A browser cannot read the code list or guess its way in.
   ========================================================================== */

/* A code looks like SX-A7K4-M2PQ. Uppercase, two blocks of four. */
const CODE_SHAPE = /^SX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function looksLikeCode(raw) {
  return CODE_SHAPE.test(normaliseCode(raw));
}

/* Forgiving on input, strict on what we send. People paste codes with
   stray spaces, lower case, or missing dashes. */
export function normaliseCode(raw) {
  const cleaned = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned.startsWith("SX")) return cleaned;
  const body = cleaned.slice(2);
  const first = body.slice(0, 4);
  const second = body.slice(4, 8);
  if (!second) return first ? `SX-${first}` : "SX";
  return `SX-${first}-${second}`;
}

/* --------------------------------------------------------------------------
   SECTION: Check a code
   Checks only. It does not redeem. A code is burned at the very end, when
   the workspace is actually created, so someone who abandons setup halfway
   has not lost their code.

   NOT WIRED YET. This is the one function that becomes a call to the
   check-access-code edge function. Until then it validates shape only, so
   the screens can be built and reviewed.
   -------------------------------------------------------------------------- */

export async function checkAccessCode(raw) {
  const code = normaliseCode(raw);

  await new Promise((r) => setTimeout(r, 600));

  if (!looksLikeCode(code)) {
    return { ok: false, reason: "That code is not right. Check it and try again." };
  }

  return { ok: true, code };
}

/* --------------------------------------------------------------------------
   SECTION: Password rules
   One rule, stated plainly, checked as they type.
   -------------------------------------------------------------------------- */

export function passwordProblem(password) {
  if (!password) return "Choose a password.";
  if (password.length < 10) return "Use at least 10 characters.";
  return null;
}

export function emailProblem(email) {
  const value = (email || "").trim();
  if (!value) return "Enter your work email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "That email does not look right.";
  return null;
}

/* --------------------------------------------------------------------------
   SECTION: Company details
   Three required fields. This is the entire setup interview: name, what
   the company does, and industry. Everything else is optional and comes
   later. One good paragraph here does more for the output than ten
   uploaded files would.
   -------------------------------------------------------------------------- */

export const INDUSTRIES = [
  "Technology & software",
  "Financial services",
  "Healthcare",
  "Retail & ecommerce",
  "Manufacturing",
  "Real estate",
  "Professional services",
  "Education",
  "Media & entertainment",
  "Hospitality & travel",
  "Nonprofit",
  "Other",
];

export function companyNameProblem(name) {
  const value = (name || "").trim();
  if (!value) return "Enter your company name.";
  if (value.length < 2) return "That name looks too short.";
  return null;
}

export function companyAboutProblem(about) {
  const value = (about || "").trim();
  if (!value) return "Tell us what your company does.";
  if (value.split(/\s+/).filter(Boolean).length < 5) {
    return "A sentence or two helps it sound like you. Add a bit more.";
  }
  return null;
}

export function industryProblem(industry) {
  if (!industry) return "Pick the closest industry.";
  return null;
}

/* --------------------------------------------------------------------------
   SECTION: Slug
   The path a workspace deploys to, derived from the company name. Shown
   to the founder as a preview so nobody is surprised by their own URL.
   -------------------------------------------------------------------------- */

export function slugify(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
