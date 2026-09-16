/* ==========================================================================
   PRODUCT CONFIG
   Company branding, skills, model tiers, workflow tools, and limits.
   This is the file you edit to rebrand a deployment for a new company.
   ========================================================================== */

import { LayoutGrid, FileType, Sheet, Presentation, Brain, LineChart } from "lucide-react";
import {
  CanvaIconGlyph,
  GmailIconGlyph,
  DriveIconGlyph,
  SlackIconGlyph,
  NotionIconGlyph,
} from "./icons.jsx";

/* --------------------------------------------------------------------------
   SECTION: Branding
   One value drives the assistant name everywhere it appears. A company
   called Acme sees "Acme AI" with no other change.
   -------------------------------------------------------------------------- */

export const PRODUCT = { name: "StellaXafe", supportEmail: "anthony@stellaxafe.com" };

/* --------------------------------------------------------------------------
   SECTION: OAuth client ids
   Public by design. A client id names the application, it does not
   authorise anything, so it belongs in the bundle. The matching secrets
   live in Supabase's secret store and are never in this repo.
   -------------------------------------------------------------------------- */

export const OAUTH_CLIENTS = {
  canva: "OC-AaA6AM8XqQ_Z",
  google: "575838735620-7rv1ibm8tlrj9djt3bs26j95g3r74g54.apps.googleusercontent.com",
};

/* Both providers send the browser back here after someone approves. It
   points at Supabase rather than at stellaxafe.com because exchanging the
   code for a token needs the client secret, and that must never be
   somewhere a browser can read it. */
/* --------------------------------------------------------------------------
   SECTION: Edge function slugs

   The name shown in the Supabase dashboard and the slug in the URL are two
   different things, and renaming a function does not rename its slug. That
   caught this project once: the assistant lived at `assistant-`, with a
   trailing hyphen it was created with, while the dashboard displayed it as
   "assistant". It was redeployed on the clean slug on 2026-09-08 and the
   hyphenated one is gone.

   Calling a slug that does not exist is a 404 with no CORS headers on it,
   which a browser reports as a send failure rather than a not found, so it
   looks like a network problem and sends everybody hunting in the wrong
   place. The slugs live here, named, so nobody has to guess.
   -------------------------------------------------------------------------- */

export const FUNCTIONS = {
  assistant: "assistant",
  addLink: "add-link",
  inviteStaff: "invite-staff",
  sendContact: "send-contact",
  readBeforePublish: "read-before-publish",
  describeSource: "describe-source",
  canvaDesign: "canva-design",
  supportReply: "support-reply",
  canvaConnect: "canva-connect",
};

/* WHERE A COMPANY'S LOGOS AND BRAND IMAGES LIVE.

   Private, so nothing here is reachable without signing in. The first
   folder inside it is always the company id, and every storage policy is
   built on that, so an object path that does not start with the right
   company is refused by the database rather than by this file. */
export const BRAND_ASSETS_BUCKET = "brand-assets";

/* The long edge a brand asset is kept at.

   Larger than the 1568 a chat upload is cut to, because these are used to
   BUILD things rather than to be looked at once. A logo that goes into a
   deck or a Canva design at 1568 across is soft the moment somebody puts
   it on a title slide. 2400 is generous for any real use and still small
   enough that nobody waits for it. */
export const BRAND_ASSET_EDGE = 2400;

export const OAUTH_REDIRECT_URI =
  "https://cbunsqzkhidwjtxdsmxd.supabase.co/functions/v1/oauth-callback";

/* --------------------------------------------------------------------------
   SECTION: Naming
   There is deliberately no company name and no person's name in this file.

   Every deployment belongs to a different company and every screen is
   read by a different person, and both come from the database once
   somebody signs in. A default here would be a stranger's name greeting
   someone in their own workspace, which is the exact opposite of what
   this product claims to be.

   These are what a screen shows while it is still finding out, and they
   name nobody.
   -------------------------------------------------------------------------- */

export const ASSISTANT_FALLBACK = "Assistant";

export function assistantNameFor(companyName) {
  return companyName ? `${companyName.split(" ")[0]} AI` : ASSISTANT_FALLBACK;
}

/* --------------------------------------------------------------------------
   SECTION: Limits
   -------------------------------------------------------------------------- */

export const DAILY_LIMIT = 5;

/* Upload caps, split by what the file actually costs.

   A PDF or a Word file is mostly structure. Ten megabytes of PDF might be
   twenty pages of prose, so the megabyte figure says almost nothing about
   what reaches the model. The character cap below is the one that binds,
   and it is applied after the text comes out.

   Plain text is different: every byte is a byte the model would carry, so
   it is capped tighter.

   Images are capped generously because a phone screenshot is large on
   disk and tiny once shrunk. The browser scales it down to the size the
   model works at anyway before it leaves the device. */
export const MAX_TEXT_UPLOAD_KB = 500;
export const MAX_IMAGE_UPLOAD_KB = 5120;

/* A document going into the company knowledge base. Ten megabytes covers
   a real brand guide or an annual report. */
export const MAX_SOURCE_UPLOAD_KB = 10240;

/* How much of any one document is kept. Around sixty pages, which is more
   than any single source needs to be useful and still small enough that a
   handful of them fit in one conversation. */
export const MAX_SOURCE_CHARS = 120000;

/* Four files per message. Past that it stops being a person handing over
   what matters and starts being a folder, and a folder is what pointing at
   a drive is for. */
export const MAX_FILES_PER_MESSAGE = 4;

/* --------------------------------------------------------------------------
   SECTION: Capability levels

   WHY THESE ARE LEVELS AND NOT MODEL NAMES
   This table used to read "Haiku 4.5", "Sonnet 5", "Opus 5", "Fable 5",
   with each one's price per million tokens beside it. Anthony, 2026-09-10:

     "The name should not be shown because tomorrow we might be installing
      the same thing for a company using OpenAI. So I want to keep the same
      architecture, the same design, but just changing the model brain."

   That is the reason, and it is architectural rather than cosmetic. This
   file ships inside the browser bundle. Every vendor name in here was a
   vendor name in the client, so swapping the brain meant editing the
   product rather than editing a config.

   So: four levels, named for what they are FOR. Which actual model sits
   behind a level is decided on the server and appears on no screen and in
   no bundle. Moving a deployment to another provider is then a mapping on
   the server, and nothing here changes at all.

   THE MAPPING TODAY, kept here as a comment and nowhere else, because a
   comment cannot be rendered onto a screen by accident:
     conversational  the small fast model
     standard        the everyday working model
     deeper          the heavier reasoning model
     deepest         the most capable model available

   NO PRICES EITHER. The old table printed dollars per million tokens to an
   admin, which is both a token count and a vendor's rate card. Cost reaches
   people as outputs remaining, the way it does everywhere else.
   -------------------------------------------------------------------------- */

export const CAPABILITY_LEVELS = {
  conversational: {
    label: "Conversational",
    use: "Answering customers",
    detail:
      "Short back and forth. Answering customers, taking details, quick questions. Fast, and the cheapest to run.",
  },
  standard: {
    label: "Standard",
    use: "Almost all office work",
    detail:
      "Reports, proposals, emails, summaries, spreadsheets, decks. Around nine jobs in ten land here and it handles them well.",
  },
  deeper: {
    label: "Deeper",
    use: "Work that needs thinking",
    detail:
      "Research, analysis, strategy, new ideas. For work where the answer is not already sitting in the company's material.",
  },
  deepest: {
    label: "Deepest",
    use: "The hardest work",
    detail:
      "For work where being right matters more than what it costs. Rare. Most companies never need it.",
  },
};

/* Order matters. This is the ladder an admin raises somebody up. */
export const LEVEL_ORDER = ["conversational", "standard", "deeper", "deepest"];

export const DEFAULT_LEVEL = "standard";

/* WHAT AN ADMIN ACTUALLY PICKS FROM, and it is three of the four.

   It was conversational and standard only, which Anthony set that way for
   a competition where the cost of the top two mattered. He lifted that on
   2026-09-16: "let the other four be part of the access. But by default,
   it's always on standard for staffs."

   CONVERSATIONAL IS NOT IN THE LIST, and that is deliberate rather than a
   leftover. Anthony: "we already know that conversational is standard for
   customer care. Nobody needs to select that." It is the level the support
   assistant runs at on its own, so it is a fact about support rather than
   a choice anybody makes about a staff member. Leaving it in the picker
   would be offering somebody a setting whose only correct value is already
   decided for them, which is the kind of knob this product does not show.

   It stays in CAPABILITY_LEVELS and in LEVEL_ORDER, because support really
   does run at it and a row already holding it still has to read properly. */
export const OFFERED_LEVELS = ["standard", "deeper", "deepest"];

/* SHOWN IN THE LIST, GREYED, NEVER PICKABLE.

   Anthony, 2026-09-16: "I didn't think removing conversational was okay.
   You can keep it there, label it in green, support. And it's not
   pickable. It's just there... It just makes the walkthrough make more
   sense because I have to do explanation."

   So it is in the ladder where somebody expects to see it, marked as the
   support level and locked. Taking it out entirely left a gap an admin
   has to be told about; leaving it selectable would offer a setting whose
   only right answer is already decided. Present and locked says both
   things at once, and it gives him something to point at. */
export const SUPPORT_LEVEL = "conversational";

/* READING A ROW WRITTEN BEFORE THE RENAME.

   model_ceiling used to hold a vendor's model name. Those values are being
   renamed in the database to the level names above. This maps an old value
   to its level so a row, a cached session, or a deployment that has not run
   the rename yet still reads correctly instead of showing an empty box.

   Anything already a level passes straight through. Anything unrecognised
   comes back as the default, because a ceiling nobody can read is not a
   reason to show somebody a broken screen. */
const RENAMED_FROM = {
  "haiku-4-5": "conversational",
  "sonnet-5": "standard",
  "opus-5": "deeper",
  "fable-5": "deepest",
};

export function levelOf(stored) {
  if (stored && Object.hasOwn(CAPABILITY_LEVELS, stored)) return stored;
  return RENAMED_FROM[stored] ?? DEFAULT_LEVEL;
}

/* --------------------------------------------------------------------------
   SECTION: Skills
   Skills spin up from the task. The staff member never picks one.
   -------------------------------------------------------------------------- */

export const SKILL_LABELS = {
  ppt: "PowerPoint",
  word: "Word",
  excel: "Excel",
  design: "Design",
  mindmap: "Mind map",
  analysis: "Analysis",
};

export const SKILL_META = {
  ppt: {
    icon: Presentation,
    note: "Generated with Canva, connected for this task",
    needsCanva: true,
  },
  word: {
    icon: FileType,
    note: "Formatted as a Word document, ready to export as PDF",
    needsCanva: false,
  },
  excel: {
    icon: Sheet,
    note: "Structured as a spreadsheet",
    needsCanva: false,
  },
  design: {
    icon: LayoutGrid,
    note: "Generated with Canva, connected for this task",
    needsCanva: true,
  },
  mindmap: {
    icon: Brain,
    note: "Structured as a mind map",
    needsCanva: false,
  },
  analysis: {
    icon: LineChart,
    note: "Generated directly from the source material",
    needsCanva: false,
  },
};

/* --------------------------------------------------------------------------
   SECTION: Templates
   Pulled from the company knowledge base in a real deployment.
   -------------------------------------------------------------------------- */

export const TEMPLATES = {
  deck: "Investor Pitch Deck v3",
  finance: "Finance Report Q series",
  social: "Social Announcement",
  proposal: "Client One Pager",
  mindmap: "Project Structure Map",
  analysis: "Analysis Summary",
  other: "Custom layout",
};

/* Maps a detected project type to the skill that handles it. */
export const SKILL_BY_TYPE = {
  deck: "ppt",
  social: "design",
  finance: "excel",
  proposal: "word",
  mindmap: "mindmap",
  analysis: "analysis",
  other: null,
};

/* --------------------------------------------------------------------------
   SECTION: Quick starts
   Surfaced when a staff member types / at the start of a conversation.
   -------------------------------------------------------------------------- */

export const QUICK_ACTIONS = [
  { id: "deck", label: "New pitch deck", seed: "New investor pitch deck", icon: Presentation },
  { id: "finance", label: "Q3 report", seed: "Q3 finance report", icon: Sheet },
  { id: "social", label: "Social announcement", seed: "Social announcement graphic", icon: LayoutGrid },
  { id: "proposal", label: "Client one pager", seed: "Client one pager proposal", icon: FileType },
];

/* --------------------------------------------------------------------------
   SECTION: Workflow tools
   Called connectors internally. They serve two purposes: knowledge and
   storage. The admin connects company wide sources, each staff member
   connects their own.

   `state` has to tell the truth about three genuinely different things,
   because showing the wrong one is worse than showing nothing:

     connected   Already on and really working, but through StellaXafe's
                 own account rather than the viewer's. Canva is here. The
                 designs it makes are real and downloadable. Nobody can
                 swap in their own Canva, so offering a Connect button
                 would be a button that cannot work.
     connectable Genuinely connectable by the person looking at it, with
                 their own account. Drive lands here once its sign in
                 flow is built, and it is the one place a viewer sees a
                 real connection happen.
     sample      Shown to say what the shape of a deployment looks like.
                 Not wired, and says so.
   -------------------------------------------------------------------------- */

export const WORKFLOW_TOOLS = [
  {
    id: "canva",
    label: "Canva",
    icon: CanvaIconGlyph,
    hint: "Design and brand assets",
    /* CONNECTABLE BY THE PERSON LOOKING AT IT, since 2026-09-16.

       It was "registered", meaning set up on our side and connected by an
       admin for the whole company. Anthony moved it to the person, because
       Canva is where somebody works rather than something the company
       knows, and because a design made on the admin's account cannot be
       opened by the staff member who asked for it. */
    state: "connectable",
    /* The admin's Connectors tab does not show this one from here any more:
       Canva has its own panel with a real Connect button, and listing it
       twice is two answers to the same question. This entry stays for the
       chat's connector menu, and the note says where it has actually got to.

       Updated 2026-09-14. The sign in works now. What is still missing is
       the part that sends a design through it. */
    note:
      "An admin connects one Canva account and it serves everybody here. Signing in works. " +
      "What is not built yet is the part that sends a design through it, so nothing here " +
      "produces a Canva file today. That is the next piece of work, not a maybe.",
  },
  {
    /* THE LONG NOTE THAT WAS HERE IS GONE, 2026-09-15.

       It explained that Drive was registered with Google, that the keys
       were in place, and that the sign in was the remaining piece. All of
       that was true and none of it was any of a customer's business.
       Anthony: "it's explaining too much... it's client-facing. A
       client-facing doesn't have to be explaining too much and doesn't
       need to even be mentioning some technicalities like that."

       He is right, and the reason is not only tone. A progress report on
       a public surface reads as half finished work, and a buyer prices it
       down before deciding whether they want it. Where a thing has got to
       internally belongs in CURRENT.md.

       So Drive now says what every other one says. It gets picked back up
       after the video walkthrough. */
    id: "drive",
    label: "Google Drive",
    icon: DriveIconGlyph,
    hint: "Point the assistant at a file, and send finished work back",
    state: "registered",
  },
  {
    id: "email",
    label: "Gmail",
    icon: GmailIconGlyph,
    hint: "Search email for source material",
    state: "sample",
  },
  {
    id: "slack",
    label: "Slack",
    icon: SlackIconGlyph,
    hint: "Pull context from team channels",
    state: "sample",
  },
  {
    id: "notion",
    label: "Notion",
    icon: NotionIconGlyph,
    hint: "Read specs, briefs, and project pages",
    state: "sample",
  },
];

/* Sits behind the info control under the tool list. Answers the question
   a sharp person in the room is already forming: are these real, or is
   this a picture of a product? */
/* ONE SENTENCE, AND IT SAYS NOTHING ABOUT WHERE THE BUILD HAS GOT TO.

   This used to explain the difference between "registered" and "example",
   which meant a customer had to learn our internal vocabulary to read
   their own screen, and what they learned was which parts are unfinished.
   Neither of those helps them. Rewritten 2026-09-15 alongside the Drive
   note, for the same reason. */
export const WORKFLOW_PLAN_NOTE =
  "Your deployment connects the tools your people already work in, these or others, " +
  "scoped to exactly what your team approves.";

export const REGISTERED_CONNECTOR_NOTE =
  "Set up on our side. Not doing work in this demo yet.";

export const SAMPLE_CONNECTOR_NOTE =
  "Not connected in this demo. Built for your company during setup.";
