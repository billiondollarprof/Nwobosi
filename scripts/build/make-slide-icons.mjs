/* ==========================================================================
   MAKE THE SLIDE ICON SET

   What this is: a one-off script that copies a fixed list of Lucide icons
   (ISC licence, already a dependency through lucide-react) into
   src/shared/docs/slides/slideIcons.js as plain SVG shapes.

   Why a fixed list: the writing step names icons by word, and a short,
   known list means it can never ask for one that does not exist. Run it
   again after changing NAMES:  node scripts/build/make-slide-icons.mjs
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";

const NAMES = [
  "users", "user", "user-check", "users-round", "building-2", "building", "church", "hotel", "store", "factory", "landmark", "house",
  "message-circle", "messages-square", "mail", "phone", "send", "megaphone", "bell", "share-2",
  "database", "server", "cloud", "cpu", "bot", "brain", "sparkles", "zap", "workflow", "network", "layers", "puzzle", "plug",
  "shield-check", "lock", "key-round", "eye", "fingerprint", "badge-check",
  "chart-column", "chart-line", "chart-pie", "trending-up", "trending-down", "target", "gauge", "activity",
  "calendar", "clock", "timer", "hourglass", "rocket", "flag", "milestone", "map", "map-pin", "compass", "globe",
  "file-text", "files", "folder", "clipboard-check", "list-checks", "book-open", "notebook-pen", "pen-tool",
  "wallet", "banknote", "coins", "credit-card", "receipt", "piggy-bank", "hand-coins", "shopping-cart", "tag", "percent",
  "heart", "heart-handshake", "handshake", "smile", "star", "award", "trophy", "gift", "thumbs-up",
  "lightbulb", "search", "filter", "settings", "wrench", "hammer", "check", "circle-check", "x", "alert-triangle", "info", "help-circle",
  "graduation-cap", "stethoscope", "truck", "plane", "car", "leaf", "sun", "music", "camera", "video", "image", "smartphone", "monitor", "laptop",
  "arrow-right", "refresh-cw", "repeat", "link", "download", "upload", "inbox", "archive", "box", "package",
];

const dir = "node_modules/lucide-react/dist/esm/icons";
const icons = {};
for (const name of NAMES) {
  let file = path.join(dir, `${name}.js`);
  if (!fs.existsSync(file)) throw new Error(`No Lucide icon called ${name}`);
  let src = fs.readFileSync(file, "utf8");
  /* Some names are aliases of a renamed icon: follow them to the real one. */
  for (let hop = 0; hop < 3 && !src.includes("createLucideIcon("); hop += 1) {
    const target = src.match(/from\s+['"]\.\/([\w-]+)\.js['"]/);
    if (!target) break;
    file = path.join(dir, `${target[1]}.js`);
    src = fs.readFileSync(file, "utf8");
  }
  const start = src.indexOf("[", src.indexOf("createLucideIcon("));
  const end = src.lastIndexOf("]);");
  /* The node list is plain data: [tag, {attributes}] pairs. */
  const nodes = Function(`return ${src.slice(start, end + 1)}`)();
  icons[name] = nodes.map(([tag, attrs]) => {
    const { key, ...rest } = attrs;
    return `<${tag} ${Object.entries(rest).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`;
  }).join("");
}

const out = `/* ==========================================================================
   SLIDE ICONS

   What this is: the icons a slide may carry, by name, as SVG shapes.
   Copied from Lucide (https://lucide.dev, ISC licence) by
   scripts/build/make-slide-icons.mjs. Do not edit by hand: change the list
   in that script and run it again.

   Why SVG: PowerPoint keeps an SVG sharp at any size, and a person can
   recolour it or turn it into shapes ("Convert to Shape"), so the icon
   stays editable like everything else on the slide.

   What it must never do: hand back an icon that is not on the list. An
   unknown name gives null and the slide is drawn without an icon.
   ========================================================================== */

const SHAPES = ${JSON.stringify(icons, null, 0).replace(/","/g, '",\n  "')};

export const ICON_NAMES = Object.keys(SHAPES);

/* The words a writer might use for an icon that is called something else
   here. Kept short; anything not found simply has no icon. */
const SAME_AS = {
  people: "users", team: "users", person: "user", customer: "user", member: "user", members: "users",
  company: "building-2", office: "building-2", whatsapp: "message-circle", chat: "message-circle", message: "message-circle",
  email: "mail", ai: "sparkles", security: "shield-check", privacy: "lock", data: "database", knowledge: "book-open",
  money: "banknote", price: "tag", pricing: "tag", growth: "trending-up", chart: "chart-column", time: "clock",
  goal: "target", idea: "lightbulb", launch: "rocket", success: "trophy", quality: "award", support: "heart-handshake",
  document: "file-text", report: "file-text", form: "clipboard-check", automation: "workflow", integration: "plug",
  web: "globe", app: "smartphone", phone: "phone", calendar: "calendar", event: "calendar", warning: "alert-triangle",
};

/* The icon's SVG, drawn in one colour (six hex digits, no "#"). */
export function iconSvg(name, color) {
  const key = String(name ?? "").trim().toLowerCase();
  const shapes = SHAPES[key] ?? SHAPES[SAME_AS[key]];
  if (!shapes) return null;
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#\${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">\${shapes}</svg>\`;
}

/* The same, as a data address PowerPoint's writer takes. */
export function iconData(name, color) {
  const svg = iconSvg(name, color);
  if (!svg) return null;
  /* The SVG is plain ASCII, so btoa (in browsers and in Node) is enough. */
  return \`data:image/svg+xml;base64,\${btoa(svg)}\`;
}
`;
fs.writeFileSync("src/shared/docs/slides/slideIcons.js", out);
console.log(`${NAMES.length} icons written`);
