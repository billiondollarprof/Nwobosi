/* ==========================================================================
   INTEGRATION STRIP
   The systems a deployment connects to, moving.

   A static row of five logos reads as a short list. A moving strip reads
   as a surface something plugs into, which is the impression this section
   exists to give.

   On the claim: none of these are live in the demo, and the copy around
   this component says what is true, that a deployment connects the systems
   an organization already runs on. That is the honest sentence and it is
   also the more confident one. A "trusted by" wall of logos nobody has
   integrated is the single most common way an AI infrastructure site loses
   a technical reader in its first ten seconds.
   ========================================================================== */

import {
  CanvaIconGlyph,
  GmailIconGlyph,
  DriveIconGlyph,
  SlackIconGlyph,
  NotionIconGlyph,
} from "./icons.jsx";
import {
  TeamsGlyph,
  OneDriveGlyph,
  SharePointGlyph,
  OutlookGlyph,
  DropboxGlyph,
  ZoomGlyph,
  SalesforceGlyph,
  HubSpotGlyph,
  ConfluenceGlyph,
  WhatsAppGlyph,
} from "./integrationGlyphs.jsx";

/* Ordered so the two rows below each carry a mix of the categories rather
   than one row of Microsoft and one of everything else. */
const ROW_ONE = [
  { label: "Microsoft Teams", icon: TeamsGlyph },
  { label: "SharePoint", icon: SharePointGlyph },
  { label: "Google Drive", icon: DriveIconGlyph },
  { label: "Outlook", icon: OutlookGlyph },
  { label: "Slack", icon: SlackIconGlyph },
  { label: "Salesforce", icon: SalesforceGlyph },
  { label: "Confluence", icon: ConfluenceGlyph },
  { label: "Canva", icon: CanvaIconGlyph },
];

const ROW_TWO = [
  { label: "OneDrive", icon: OneDriveGlyph },
  { label: "Gmail", icon: GmailIconGlyph },
  { label: "Notion", icon: NotionIconGlyph },
  { label: "Dropbox", icon: DropboxGlyph },
  { label: "HubSpot", icon: HubSpotGlyph },
  { label: "Zoom", icon: ZoomGlyph },
  { label: "WhatsApp", icon: WhatsAppGlyph },
];

function Chip({ label, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-full border px-4 py-2.5 shrink-0 backdrop-blur-xl"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <Icon size={18} />
      <span className="text-[13.5px] whitespace-nowrap" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
    </div>
  );
}

/* Each half carries its own trailing gap (pr-3 matching gap-3), so the two
   halves are exactly the same width and the track can be translated by
   precisely -50%. Laying the items out flat instead leaves the halves
   differing by one gap, and the loop visibly jumps once per lap. */
function Half({ items, hidden = false }) {
  return (
    <div className="flex gap-3 pr-3" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <Chip key={item.label} {...item} />
      ))}
    </div>
  );
}

function Row({ items, seconds, reverse = false }) {
  return (
    <div
      className="flex w-max"
      style={{
        animation: `sx-marquee ${seconds}s linear infinite${reverse ? " reverse" : ""}`,
      }}
    >
      <Half items={items} />
      <Half items={items} hidden />
    </div>
  );
}

export default function IntegrationStrip() {
  return (
    /* The mask is what stops the strip looking like a row that got cut off
       by the viewport. It fades into the page at both ends instead. */
    <div
      className="sx-marquee-mask flex flex-col gap-3 overflow-hidden"
      style={{ paddingBottom: 2 }}
    >
      <Row items={ROW_ONE} seconds={52} />
      <Row items={ROW_TWO} seconds={44} reverse />
    </div>
  );
}
