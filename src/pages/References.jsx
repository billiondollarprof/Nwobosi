/* ==========================================================================
   THE PAGE A QR CODE OPENS: ONE DOCUMENT'S REFERENCES

   What this is: stellaxafe.com/r/<code>. A one pager carries a QR code in
   place of its reference list (docs/references.js); scanning it lands here.

   Why. Anthony, 2026-11-22: "when a person reads the document, if they want
   to read the reference, they will just scan the QR code and then see the
   link of the reference."

   What it shows: the document's title, the company it came from, and the
   references, each web address a link. Nothing else from the company.

   What it must never do:
     - Show any list but the one whose exact code is in the address. The
       database function (references_by_code) enforces this; this page only
       asks for one code.
     - Be found by search. Pages not listed in shared/meta.jsx are marked
       noindex, and this one is deliberately left off that list.
   ========================================================================== */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { LogoLockup } from "../shared/icons.jsx";
import { PageShell, Spinner, ThemeToggle } from "../shared/ui.jsx";
import { referencesByCode } from "../shared/session.js";
import { BRAND } from "../shared/tokens";

export default function References() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, list: null, failed: false });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = /^[0-9a-f]{32}$/.test(code ?? "") ? await referencesByCode(code) : null;
        if (live) setState({ loading: false, list, failed: false });
      } catch {
        if (live) setState({ loading: false, list: null, failed: true });
      }
    })();
    return () => { live = false; };
  }, [code]);

  const items = Array.isArray(state.list?.items) ? state.list.items : [];

  return (
    <PageShell scroll>
      <header className="max-w-3xl w-full mx-auto px-4 sm:px-8 pt-6 flex items-center justify-between">
        <LogoLockup stacked size={20} textClass="text-[13px]" />
        <ThemeToggle />
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-10 flex-1">
        {state.loading && (
          <div className="flex items-center gap-3" style={{ color: "var(--text-2)" }}>
            <Spinner /> <span>Opening the references…</span>
          </div>
        )}

        {!state.loading && !state.list && (
          <div>
            <h1 className="text-[24px] font-semibold" style={{ color: "var(--text-1)" }}>
              {state.failed ? "These references could not be opened" : "These references were not found"}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {state.failed
                ? "Something went wrong on our side. Please try again in a moment."
                : "The link may be mistyped, or the list is no longer available. Scan the code on the document again, or ask the person who sent it."}
            </p>
          </div>
        )}

        {!state.loading && state.list && (
          <article>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
              References
            </p>
            <h1 className="mt-2 text-[24px] sm:text-[28px] font-semibold leading-tight break-words" style={{ color: "var(--text-1)" }}>
              {state.list.title || "Document references"}
            </h1>
            {state.list.company && (
              <p className="mt-2 text-[14px]" style={{ color: "var(--text-2)" }}>
                From {state.list.company}
              </p>
            )}

            <ol className="mt-8 space-y-4">
              {items.map((r, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="shrink-0 w-6 text-right tabular-nums font-semibold" style={{ color: "var(--text-3)" }}>{i + 1}.</span>
                  <span className="min-w-0 break-words" style={{ color: "var(--text-1)" }}>
                    {r.url ? String(r.text ?? "").replace(r.url, "").trim() : r.text}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 flex items-center gap-1.5 text-[13.5px] underline break-all"
                        style={{ color: BRAND.accentSoft }}
                      >
                        <ExternalLink size={13} className="shrink-0" /> {r.url}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {!items.length && (
              <p className="mt-6 text-[15px]" style={{ color: "var(--text-2)" }}>This document lists no references.</p>
            )}
          </article>
        )}
      </main>

      <footer className="max-w-3xl w-full mx-auto px-4 sm:px-8 pb-8 text-[12.5px]" style={{ color: "var(--text-3)" }}>
        Shared through StellaXafe. Only people with this link can open it.
      </footer>
    </PageShell>
  );
}
