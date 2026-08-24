/* ==========================================================================
   PRODUCT CONFIG
   Company branding, skills, model tiers, workflow tools, and limits.
   This is the file you edit to rebrand a deployment for a new company.
   ========================================================================== */

import { LayoutGrid, FileType, Sheet, Presentation, Brain, LineChart } from "lucide-react";
import { CanvaIconGlyph, GmailIconGlyph, DriveIconGlyph, SlackIconGlyph } from "./icons.jsx";

/* --------------------------------------------------------------------------
   SECTION: Branding
   One value drives the assistant name everywhere it appears. A company
   called Acme sees "Acme AI" with no other change.
   -------------------------------------------------------------------------- */

export const PRODUCT = { name: "StellaXafe" };

export const COMPANY = { name: "BuildFest" };

export const ASSISTANT_NAME = COMPANY.name
  ? `${COMPANY.name.split(" ")[0]} AI`
  : `${PRODUCT.name} AI`;

/* --------------------------------------------------------------------------
   SECTION: Demo identity
   Stands in for the signed in staff member until auth is wired up.
   -------------------------------------------------------------------------- */

export const CURRENT_USER = {
  name: "Anthony",
  role: "Marketing associate",
  modelCeiling: "sonnet-5",
};

/* --------------------------------------------------------------------------
   SECTION: Limits
   -------------------------------------------------------------------------- */

export const DAILY_LIMIT = 5;
export const MAX_UPLOAD_KB = 1024;

/* --------------------------------------------------------------------------
   SECTION: Model tiers
   The assistant moves up only as far as a task needs. Ceiling is a
   permission the admin sets per staff member.
   -------------------------------------------------------------------------- */

export const MODEL_TIERS = {
  "haiku-4-5": {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    use: "Interview and conversation",
    inputPer1M: 1,
    outputPer1M: 5,
  },
  "sonnet-5": {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    use: "Analysis, prompt writing, and output",
    inputPer1M: 3,
    outputPer1M: 15,
  },
  "opus-5": {
    id: "claude-opus-5",
    label: "Opus 5",
    use: "Heavier reasoning, granted by role",
    inputPer1M: 5,
    outputPer1M: 25,
  },
  "fable-5": {
    id: "claude-fable-5",
    label: "Fable 5",
    use: "Most demanding work, granted by role",
    inputPer1M: 10,
    outputPer1M: 50,
  },
};

/* Order matters. This is the ladder an admin raises a staff member up. */
export const MODEL_ORDER = ["haiku-4-5", "sonnet-5", "opus-5", "fable-5"];

export const DEFAULT_MODEL_CEILING = "sonnet-5";

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
   -------------------------------------------------------------------------- */

export const WORKFLOW_TOOLS = [
  { id: "canva", label: "Canva", icon: CanvaIconGlyph, hint: "Design and brand assets" },
  { id: "email", label: "Gmail", icon: GmailIconGlyph, hint: "Search email for source material" },
  { id: "drive", label: "Google Drive", icon: DriveIconGlyph, hint: "Point the assistant at a file" },
  { id: "slack", label: "Slack", icon: SlackIconGlyph, hint: "Pull context from team channels" },
];
