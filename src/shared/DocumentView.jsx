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
import { imageKey } from "./docs/imageKey.js";
import { chartSvg } from "./docs/charts/chartSvg.js";
import { themeFor } from "./docs/documentTheme.js";

/* Charts in the preview use the quiet default colours. The files use the
   company's own colour; the preview sits inside the product's screen. */
const THEME_FOR_PREVIEW = themeFor();

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

/* The design blocks, drawn the way the files draw them: tinted cards side
   by side, a figure on a coloured panel, a strip for the takeaway. The
   preview uses the product's own accent rather than the company's colour,
   because it sits inside the product's screen. */
function Inner({ blocks, images }) {
  return (blocks ?? []).map((b, i) => <Block key={i} block={b} previous={i > 0} images={images} />);
}

/* "Figure 2. The front desk", then the source, smaller. The same words the
   PDF and Word files print, so the preview shows what they will get. */
function FigureCaption({ block }) {
  if (!block.figure && !block.caption && !block.source) return null;
  return (
    <figcaption className="text-center mt-1.5" style={{ color: "var(--text-3)" }}>
      {(block.figure || block.caption) && (
        <span className="block text-[11.5px]">
          {block.figure && <span className="font-semibold not-italic">Figure {block.figure}. </span>}
          {block.caption && <span className="italic">{block.caption}</span>}
        </span>
      )}
      {block.source && <span className="block text-[10.5px] mt-0.5">{block.source}</span>}
    </figcaption>
  );
}

/* A picture the person handed over is shown. One from the company's files
   is named, because it is only fetched when the file is built. */
function Picture({ block, images }) {
  const found = images?.get?.(imageKey(block.name));
  return (
    <figure className="my-3">
      {found ? (
        <img src={found.dataUrl} alt={block.caption || block.name} className="rounded-[10px] max-h-[260px] w-auto mx-auto" />
      ) : (
        <div className="rounded-[10px] px-3 py-5 text-center text-[12px]" style={{ backgroundColor: "var(--chip)", color: "var(--text-3)" }}>
          Picture: {block.name}
        </div>
      )}
      <FigureCaption block={block} />
    </figure>
  );
}

function Cards({ block }) {
  const numbered = block.type === "steps";
  return (
    <div className="grid gap-2 my-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${block.items.length > 2 ? 150 : 200}px, 1fr))` }}>
      {block.items.map((item, i) => (
        <div key={i} className="rounded-[10px] px-3 py-2.5" style={{ backgroundColor: "var(--chip)" }}>
          <p className="font-semibold text-[13px]" style={{ color: "var(--text-1)" }}>
            {numbered && <span style={{ color: "var(--accent, #5870F8)" }}>{i + 1}{"  "}</span>}
            <Runs runs={item.title} />
          </p>
          {item.kicker && (
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-3)" }}>{item.kicker}</p>
          )}
          <div className="mt-1.5 text-[12.5px]"><Inner blocks={item.blocks} /></div>
        </div>
      ))}
    </div>
  );
}

/* A chart, drawn by the same code as the PDF (docs/charts/chartSvg.js), on
   a white card whatever the theme, because that is how it will look on
   the page. The drawing is built from escaped text only, so it is safe to
   put in as it is. A chart that could not be drawn shows its table. */
/* Two drawings: the full one, and a narrower one for a phone, where the
   full one scaled down would make its labels too small to read. CSS picks
   which one shows, so nothing has to measure the screen. */
const PHONE_CHART = { width: 330, height: 270 };

/* A pie on a phone puts its key under it, so it needs more height: enough
   for the pie and one line per slice. */
function phoneSize(data) {
  if (data.kind !== "pie" && data.kind !== "doughnut") return PHONE_CHART;
  const slices = data.series?.[0]?.values.length ?? 0;
  return { width: PHONE_CHART.width, height: 230 + slices * 20 };
}

function Chart({ block, theme }) {
  const svg = chartSvg(block.data, theme);
  const phoneSvg = chartSvg(block.data, theme, phoneSize(block.data));
  if (!svg) {
    return (
      <figure className="my-3">
        {block.table && <Block block={block.table} previous />}
        <FigureCaption block={block} />
      </figure>
    );
  }
  return (
    <figure className="my-3">
      <div
        className="hidden sm:block rounded-[10px] bg-white p-2 [&>svg]:w-full [&>svg]:h-auto"
        role="img"
        aria-label={block.caption || "Chart"}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div
        className="sm:hidden rounded-[10px] bg-white p-1.5 [&>svg]:w-full [&>svg]:h-auto"
        role="img"
        aria-label={block.caption || "Chart"}
        dangerouslySetInnerHTML={{ __html: phoneSvg }}
      />
      <FigureCaption block={block} />
    </figure>
  );
}

function Block({ block, previous, images }) {
  if (block.type === "cards" || block.type === "steps") return <Cards block={block} />;
  if (block.type === "image") return <Picture block={block} images={images} />;
  if (block.type === "chart") return <Chart block={block} theme={THEME_FOR_PREVIEW} />;

  if (block.type === "stat") {
    return (
      <div className="flex flex-wrap items-stretch gap-3 my-3">
        <div className="rounded-[10px] px-4 py-3 text-center min-w-[120px]" style={{ backgroundColor: "#1E3A8A", color: "#fff" }}>
          <p className="text-[24px] font-bold leading-tight">{block.value}</p>
          {block.caption && <p className="text-[11.5px] mt-1" style={{ opacity: 0.95 }}>{block.caption}</p>}
        </div>
        <div className="flex-1 min-w-[160px] self-center"><Inner blocks={block.blocks} /></div>
      </div>
    );
  }

  if (block.type === "takeaway") {
    return (
      <p className="rounded-[10px] px-3.5 py-2.5 my-3 font-semibold text-[13px]" style={{ backgroundColor: "#1E3A8A", color: "#fff" }}>
        <Runs runs={block.runs} />
      </p>
    );
  }

  if (block.type === "label") {
    return (
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] mt-4" style={{ color: "var(--text-3)" }}>
        {block.text}
      </p>
    );
  }

  if (block.type === "h") {
    return (
      <>
      {block.label && (
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)", marginTop: previous ? "16px" : 0 }}>
          {block.label}
        </p>
      )}
      <p
        className="font-semibold"
        style={{
          color: "var(--text-1)",
          fontSize: HEADING_SIZE[block.level] ?? "13px",
          /* No gap above the first thing in the document. A heading that
             opens with empty space above it reads as a missing title. */
          marginTop: block.label ? "2px" : previous ? (block.level <= 2 ? "18px" : "14px") : 0,
          marginBottom: "6px",
        }}
      >
        <Runs runs={block.runs} />
      </p>
      </>
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

  if (!block.runs) return null;
  return (
    <p style={{ color: "var(--text-2)", marginBottom: "8px" }}>
      <Runs runs={block.runs} />
    </p>
  );
}

/* --------------------------------------------------------------------------
   SECTION 2: The document
   -------------------------------------------------------------------------- */

export default function DocumentView({ markdown, images = null }) {
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
        <Block key={i} block={block} previous={i > 0 || Boolean(doc.title)} images={images} />
      ))}
    </div>
  );
}
