/* HARNESS. Renders a real page on its own so it can be looked at and
   clicked without a signed in workspace. Not part of the app, not built by
   `npm run build`, and nothing in src/ imports it.

   Which page it shows comes off the query string:

     /              the support queue and a cut off reply
     /?page=chat    the chat, with a scripted assistant behind it
     /?page=access  the People part of the admin screen

   The chat one is the important one. vite.harness.config.js swaps the
   assistant module for a stub that replies with whatever the test puts in
   window.__SCRIPT, keyed by stage, and records every stage that ran in
   window.__TURNS. That is what makes the flow testable: orient, interview,
   analyse, build, in order, with no model and no network. */

import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, useTheme } from "../../src/shared/theme.jsx";
import Support from "../../src/pages/Support.jsx";
import Chat, { ChatBubble } from "../../src/pages/Chat.jsx";
import { AccessSection } from "../../src/pages/Admin.jsx";
import RefreshOrKeep from "../../src/shared/RefreshOrKeep.jsx";
import KnowledgeMapPanel from "../../src/shared/KnowledgeMapPanel.jsx";
import "../../src/index.css";

/* HANDED TO THE TESTS, not to the app.

   scripts/__harness/sources.cjs drives removeSource directly, because the
   bug it covers is a delete that reports success and removes nothing, and
   that is invisible from the screen by definition. Importing from inside
   the page would get a second copy of the module with its own state, so
   the harness hands over the very instance the app is using. */
import * as session from "../../src/shared/session.js";
import { __rows } from "./fake-supabase.js";

window.__session = session;
window.__rows = __rows;

const me = {
  company: { id: "c1", name: "Greenwich Hospitals" },
  staff: { id: "s1", name: "Anthony Nwobosi", can_support: true },
};

function Pieces() {
  return (
    <div className="min-h-screen p-4 space-y-8" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto space-y-3">
        <ChatBubble
          message={{
            id: 1,
            role: "assistant",
            type: "text",
            content:
              "I can look things up, but only when you let me out. You press the button and that one turn gets a real search, and then I show you what I found before any of it goes near your work. I can't search for one myself, that only happens if you press the",
            cutOff: true,
          }}
          feedback={null}
          onFeedback={() => {}}
          onRetry={() => {}}
          onCopy={() => {}}
        />
      </div>

      <div className="max-w-3xl mx-auto">
        <Support me={me} />
      </div>
    </div>
  );
}

/* The name clash dialog on its own, so its words and its size can be
   looked at without an admin account and a real duplicate. */
function ReplacePreview() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <RefreshOrKeep
        title="You already have something called this"
        lead={
          <>
            <span className="break-words" style={{ color: "var(--text-1)" }}>Brand voice guide</span>{" "}
            was added on 20 September. Replacing it swaps what your assistant reads for the new one.
          </>
        }
        note="Keeping both leaves two files under the same name, and nobody looking at the list later can tell which one the answer came from."
        replaceLabel="Replace the old one"
        busyLabel="Saving"
        onCancel={() => {}}
        onReplace={() => {}}
        onKeepBoth={() => {}}
      />
    </div>
  );
}

/* The People part of the admin screen. It reads the staff list out of
   fake-session.js, so the invite form, the company defaults and the staff
   rows can all be looked at and clicked without a workspace. */
function AccessPreview() {
  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <AccessSection me={me} />
      </div>
    </div>
  );
}

/* The knowledge map panel, with two sources and some text behind them. */
function MapPreview() {
  const { vars } = useTheme();
  const items = [
    { id: "k1", name: "Brand voice guide", description: "How we sound", kind: "file", status: "ready" },
    { id: "k9", name: "Amara partners", description: "Partner prices and payment terms", kind: "file", status: "ready" },
  ];
  __rows("knowledge_chunks").push(
    { source_id: "k1", content: "# Voice\nWarm and plain.\n## Words we avoid\nJargon." },
    { source_id: "k9", content: "PARTNER RATES\n" + "rate ".repeat(900) + "\nPayment terms:\nNet 30." },
  );
  return (
    <div className="min-h-screen p-4" style={{ ...vars, backgroundColor: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <KnowledgeMapPanel items={items} company={{ brand_color: "#20B255", brand_color_source: "Amara logo" }} />
      </div>
    </div>
  );
}

const page = new URLSearchParams(window.location.search).get("page");

/* WorkSwitch and the chat both call useNavigate, so the tree needs a
   router even here. */
createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <ThemeProvider>{page === "chat" ? (
        <Chat />
      ) : page === "replace" ? (
        <ReplacePreview />
      ) : page === "map" ? (
        <MapPreview />
      ) : page === "access" ? (
        <AccessPreview />
      ) : (
        <Pieces />
      )}</ThemeProvider>
  </MemoryRouter>,
);
