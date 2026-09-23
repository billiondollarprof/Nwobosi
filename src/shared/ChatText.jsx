/* ==========================================================================
   A CHAT REPLY, WITH ITS FORMATTING SHOWN RATHER THAN PRINTED

   WHY THIS EXISTS
   Anthony, 2026-09-23, with a screenshot of a read back that began
   "**What I'm making:**" and listed its decisions as "- Standard monthly
   prices used...". The model writes Markdown, and the chat printed it as
   typed, stars and dashes included. It looked broken at the one moment the
   product is proving it understood.

   So a reply is read with the same reader the documents use
   (docs/documentModel.js, readBlocks) and shown as what it means: bold is
   bold, a "- " line is a bullet, a numbered line is numbered, a "## " line
   is a small bold heading, a table is a table.

   WHAT IT MUST NEVER DO
   Never hide words. Anything this does not recognise is shown as plain
   text, exactly as it was written. And it stays chat sized: headings here
   are bold lines, not document headings, because this is a conversation.
   ========================================================================== */

import { readBlocks } from "./docs/documentModel.js";

function Runs({ runs }) {
  return (
    <>
      {(runs ?? []).map((run, i) => {
        if (run.br) return <br key={i} />;
        if (run.bold) return <strong key={i} style={{ fontWeight: 600 }}>{run.text}</strong>;
        if (run.italic) return <em key={i}>{run.text}</em>;
        return <span key={i}>{run.text}</span>;
      })}
    </>
  );
}

export default function ChatText({ text, className = "", style }) {
  const blocks = readBlocks(text);
  if (!blocks.length) return null;

  return (
    <div className={className} style={style}>
      {blocks.map((block, i) => {
        const gap = i === 0 ? 0 : "0.7em";

        if (block.type === "h") {
          return (
            <p key={i} className="font-semibold" style={{ marginTop: gap }}>
              <Runs runs={block.runs} />
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <div key={i} style={{ marginTop: gap }}>
              {block.items.map((item, n) => (
                <div key={n} className="flex gap-2" style={{ marginTop: n ? "0.3em" : 0 }}>
                  <span className="shrink-0 tabular-nums" style={{ color: "var(--text-3)" }}>
                    {block.ordered ? `${block.start + n}.` : "•"}
                  </span>
                  <span className="min-w-0"><Runs runs={item.runs} /></span>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === "quote") {
          return (
            <p key={i} className="border-l-2 pl-3" style={{ marginTop: gap, borderColor: "var(--border-2)", color: "var(--text-2)" }}>
              <Runs runs={block.runs} />
            </p>
          );
        }

        if (block.type === "table") {
          return (
            <div key={i} className="overflow-x-auto" style={{ marginTop: gap }}>
              <table className="border-collapse text-[0.9em]">
                <thead>
                  <tr>
                    {block.header.map((cell, c) => (
                      <th key={c} className="text-left font-semibold px-2 py-1 border-b" style={{ borderColor: "var(--border-2)" }}>
                        <Runs runs={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="px-2 py-1 border-b align-top" style={{ borderColor: "var(--border)" }}>
                          <Runs runs={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={i} style={{ marginTop: gap }}>
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}
