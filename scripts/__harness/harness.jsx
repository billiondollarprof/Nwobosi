/* HARNESS. Renders a real page on its own so it can be looked at and
   clicked without a signed in workspace. Not part of the app, not built by
   `npm run build`, and nothing in src/ imports it.

   Which page it shows comes off the query string:

     /            the support queue and a cut off reply
     /?page=chat  the chat, with a scripted assistant behind it

   The chat one is the important one. vite.harness.config.js swaps the
   assistant module for a stub that replies with whatever the test puts in
   window.__SCRIPT, keyed by stage, and records every stage that ran in
   window.__TURNS. That is what makes the flow testable: orient, interview,
   analyse, build, in order, with no model and no network. */

import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../src/shared/theme.jsx";
import Support from "../../src/pages/Support.jsx";
import Chat, { ChatBubble } from "../../src/pages/Chat.jsx";
import "../../src/index.css";

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

const page = new URLSearchParams(window.location.search).get("page");

/* WorkSwitch and the chat both call useNavigate, so the tree needs a
   router even here. */
createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <ThemeProvider>{page === "chat" ? <Chat /> : <Pieces />}</ThemeProvider>
  </MemoryRouter>,
);
