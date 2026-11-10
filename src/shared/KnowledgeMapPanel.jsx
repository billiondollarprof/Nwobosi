/* ==========================================================================
   KNOWLEDGE MAP PANEL
   The admin's view of the same short map the assistant reads first: every
   source, its kind and size, what it holds, its sections, and where the
   brand colour came from.

   Why it exists. Anthony, 2026-11-10: a knowledge map "summarising every
   source, its sections and where it lives", that "says where the brand
   colour came from". The assistant reads it on every turn
   (supabase/functions/assistant/index.ts). Showing the admin the very same
   page means what they see is what the assistant sees.

   How it works: the map is built by supabase/functions/_shared/knowledgeMap.ts,
   the one file both sides use, from the sources that are ready and their
   text. It is rebuilt whenever the list of sources changes, so it is never
   out of date and nothing extra is stored.

   What it must never do:
     - Fail the Knowledge screen. If the text cannot be read, the panel says
       so in one line and the rest of the page carries on.
     - Show a technical word. The map itself is written in plain words.
   ========================================================================== */

import { useEffect, useState } from "react";
import { ChevronDown, Map as MapIcon } from "lucide-react";
import { supabase } from "./supabase.js";
import { GlassPanel } from "./ui.jsx";
import { BRAND } from "./tokens";
import { knowledgeMap } from "../../supabase/functions/_shared/knowledgeMap.ts";

/* --------------------------------------------------------------------------
   1. Reading the text of every ready source in one go
   -------------------------------------------------------------------------- */

async function textBySource(ids) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("source_id, content")
    .order("created_at", { ascending: true })
    .in("source_id", ids);
  if (error) throw error;
  const out = new Map();
  for (const row of data ?? []) out.set(row.source_id, (out.get(row.source_id) ?? "") + "\n" + (row.content ?? ""));
  return out;
}

/* --------------------------------------------------------------------------
   2. The panel
   -------------------------------------------------------------------------- */

export default function KnowledgeMapPanel({ items = [], company = null }) {
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState("");
  const [failed, setFailed] = useState(false);

  const ready = items.filter((s) => s.status === "ready");
  const key = ready.map((s) => s.id).join(",");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const texts = await textBySource(ready.map((s) => s.id));
        if (!alive) return;
        setMap(
          knowledgeMap(
            ready.map((s) => ({ name: s.name, description: s.description, kind: s.kind, location: s.location, text: texts.get(s.id) ?? "" })),
            { colour: company?.brand_color ?? "", from: company?.brand_color_source ?? "" },
          ),
        );
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // Rebuilt when the set of ready sources or the brand colour changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, company?.brand_color, company?.brand_color_source]);

  /* The first lines are the summary, shown even when folded: how many
     sources, how many words, and the brand colour. */
  const lines = map.split("\n");
  const summary = lines.slice(1, 3);
  const body = lines.slice(4);

  return (
    <GlassPanel className="p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <span>
          <span className="flex items-center gap-2 text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
            <MapIcon size={16} style={{ color: BRAND.accentSoft }} />
            Knowledge map
          </span>
          <span className="block text-[13px] mt-1 leading-relaxed" style={{ color: "var(--text-3)" }}>
            {failed
              ? "The map could not be read just now. Your sources are fine."
              : map
              ? summary.join(" ")
              : "Reading your sources."}
          </span>
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 mt-1"
          style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>

      {open && map && (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            This is the page the assistant reads first, to find the right source before it reads the text.
          </p>
          <ul className="space-y-3">
            {groupBySource(body).map((s) => (
              <li
                key={s.title}
                className="rounded-[12px] border px-4 py-3"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
              >
                <p className="text-[14px] font-medium break-words" style={{ color: "var(--text-1)" }}>
                  {s.title}
                </p>
                {s.details.map((d) => (
                  <p key={d} className="text-[13px] mt-1 leading-relaxed break-words" style={{ color: "var(--text-2)" }}>
                    {d}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassPanel>
  );
}

/* --------------------------------------------------------------------------
   3. Turning the map's lines back into one card per source
   A source line starts with "- "; the lines under it start with two spaces.
   -------------------------------------------------------------------------- */

function groupBySource(lines) {
  const out = [];
  for (const line of lines) {
    if (line.startsWith("- ")) out.push({ title: line.slice(2), details: [] });
    else if (line.startsWith("  ") && out.length) out[out.length - 1].details.push(line.trim());
  }
  return out;
}
