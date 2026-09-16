/* HARNESS. Renders the pieces changed on 2026-09-16 on their own, so they
   can be looked at at a phone width and a desktop width in both themes
   without a signed in workspace. Not part of the app, not built by
   `npm run build`, and nothing in src/ imports it. */

import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../src/shared/theme.jsx";
import Support from "../../src/pages/Support.jsx";
import { ChatBubble } from "../../src/pages/Chat.jsx";
import "../../src/index.css";

const me = {
  company: { id: "c1", name: "Greenwich Hospitals" },
  staff: { id: "s1", name: "Anthony Nwobosi", can_support: true },
};

function Harness() {
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

/* WorkSwitch calls useNavigate, so the tree needs a router even here. */
createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <ThemeProvider>
      <Harness />
    </ThemeProvider>
  </MemoryRouter>,
);
