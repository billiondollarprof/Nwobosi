/* ==========================================================================
   THE DOCUMENT, AS A PERSON SEES IT

   What sat here before was the raw Markdown in a <pre>. So the finished
   work arrived on screen looking like this:

       # Q3 Partner Report
       ## Where we are
       | Region | Q3 2026 |
       | --- | --- |

   Anthony, 2026-09-14: "the preview should render correctly and not as
   markdown so that a person can decide whether to download or not."

   THAT IS NOT A COSMETIC POINT, IT IS THE WHOLE FEATURE
   -----------------------------------------------------
   Downloading is the moment somebody says this work is good enough to go
   out with their name on it. STYLE-MEMORY.md leans on that: the download
   is the only honest signal in the product.

   A signal is only worth anything if the person could see what they were
   judging. Asking somebody to decide from a wall of hashes and pipes makes
   the decision meaningless, and it makes the product look broken at the one
   moment it should look finished.

   IT RENDERS THE SAME BLOCKS THE FILES DO
   ---------------------------------------
   readDocument in docs/documentModel.js is what every file writer reads.
   It is what this reads too, deliberately. One reading, five renderings,
   so the thing on screen cannot drift from the thing that downloads. If a
   table shows here, a table is in the file. The notes to the person
   ("What would make this better") are not in the file, so they are not
   here either; the chat shows them under the card.

   WHAT IT IS NOT
   --------------
   Not a rich text editor. Nothing here is editable and nothing is
   interactive. Corrections go through the conversation, which is where the
   assistant can act on them, rather than through a text box whose changes
   nothing downstream would ever see.

   READ TOP TO BOTTOM
     1. One block
     2. The document
   ========================================================================== */

import { readDocument } from "./docs/documentModel.js";

/* --------------------------------------------------------------------------
   SECTION 1: One block

   Sizes are a little smaller than the chat around it. This is a preview of
   a document, not the document, and matching body copy exactly makes the
   card fight the conversation for attention.
   -------------------------------------------------------------------------- */

function Runs({ runs }) {
  return (
    <>
      {(runs ?? []).map((run, i) => {
        if (run.br) return <br key={i} />;
        const style = { fontWeight: run.bold ? 600 : undefined, fontStyle: run.italic ? "italic" : undefined };
        return run.bold || run.italic ? <span key={i} style={style}>{run.text}</span> : <span key={i}>{run.text}</span>;
      })}
    </>
  );
}

const HEADING_SIZE = { 1: "17px", 2: "15px", 3: "13.5px", 4: "13px" };

function Block({ block, previous }) {
  if (block.type === "h") {
    return (
      <p
        className="font-semibold"
        style={{
          color: "var(--text-1)",
          fontSize: HEADING_SIZE[block.level] ?? "13px",
          /* No gap above the first thing in the document. A heading that
             opens with empty space above it reads as a missing title. */
          marginTop: previous ? (block.level <= 2 ? "18px" : "14px") : 0,
          marginBottom: "6px",
        }}
      >
        <Runs runs={block.runs} />
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <div style={{ margin: "2px 0 10px" }}>
        {block.items.map((item, i) => (
          <div key={i} className="flex gap-2" style={{ marginBottom: "4px" }}>
            <span className="shrink-0 tabular-nums" style={{ color: "var(--text-3)" }}>
              {block.ordered ? `${block.start + i}.` : "•"}
            </span>
            <span style={{ color: "var(--text-2)" }}><Runs runs={item.runs} /></span>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <p
        className="border-l-2 pl-3"
        style={{ borderColor: "var(--border-2)", color: "var(--text-3)", margin: "8px 0" }}
      >
        <Runs runs={block.runs} />
      </p>
    );
  }

  if (block.type === "table") {
    return (
      /* Its own scroller. A wide table is the one thing in a document that
         genuinely cannot be made to fit a phone, and the alternative is the
         whole card scrolling sideways, which breaks every other line on it. */
      <div className="overflow-x-auto my-3 -mx-1 px-1">
        <table className="w-full border-collapse" style={{ fontSize: "12.5px" }}>
          <thead>
            <tr>
              {block.header.map((cell, i) => (
                <th
                  key={i}
                  className="text-left font-semibold px-2.5 py-1.5 border-b whitespace-nowrap"
                  style={{ color: "var(--text-1)", borderColor: "var(--border-2)" }}
                >
                  <Runs runs={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="px-2.5 py-1.5 border-b align-top"
                    style={{ color: "var(--text-2)", borderColor: "var(--border)" }}
                  >
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
    <p style={{ color: "var(--text-2)", marginBottom: "8px" }}>
      <Runs runs={block.runs} />
    </p>
  );
}

/* --------------------------------------------------------------------------
   SECTION 2: The document
   -------------------------------------------------------------------------- */

export default function DocumentView({ markdown }) {
  const doc = readDocument(markdown, "");

  /* Nothing to show is a real state while a document is still streaming in.
     It must not render an empty bordered box, which reads as a failure. */
  if (!doc.blocks.length && !doc.title) return null;

  return (
    <div className="text-[13.5px] leading-relaxed">
      {doc.title && (
        <p className="font-semibold" style={{ color: "var(--text-1)", fontSize: "18px", marginBottom: doc.subtitle ? "2px" : "10px" }}>
          {doc.title}
        </p>
      )}
      {doc.subtitle && (
        <p style={{ color: "var(--text-3)", marginBottom: "10px" }}>{doc.subtitle}</p>
      )}
      {doc.blocks.map((block, i) => (
        <Block key={i} block={block} previous={i > 0 || Boolean(doc.title)} />
      ))}
    </div>
  );
}
