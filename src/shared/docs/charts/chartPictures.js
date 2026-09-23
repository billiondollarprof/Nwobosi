/* ==========================================================================
   A PICTURE COPY OF EVERY CHART, FOR WORD AND EXCEL

   The PDF and the preview draw the chart straight from its SVG. Word wants
   a picture copy beside the SVG for versions that cannot show SVG, and
   Excel only takes a picture. So before those files are written, every
   chart that can be drawn is turned into a PNG here, in the browser, at
   twice its size so it stays sharp when printed.

   Keyed by chartIndex, which documentModel.js gives every chart in reading
   order. structure.js counts charts the same way for the spreadsheet.

   WHAT IT MUST NEVER DO
   Stop a file being made. A chart that cannot be turned into a picture
   (no browser canvas, an odd font) is simply left out of the Map, and the
   writers show its table instead.
   ========================================================================== */

import { forEachBlock } from "../documentModel.js";
import { chartSvg, CHART_W, CHART_H } from "./chartSvg.js";

/* The Office font first, so the picture matches the Word text around it. */
const OFFICE_FONT = "Calibri, Carlito, Arial, sans-serif";

async function svgToPng(svg, scale = 2) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = CHART_W * scale;
  canvas.height = CHART_H * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function chartPictures(doc, theme) {
  const out = new Map();
  if (typeof document === "undefined") return out;
  const charts = [];
  forEachBlock(doc.blocks, (block) => {
    if (block.type === "chart" && !block.data.problem) charts.push(block);
  });
  for (const block of charts) {
    try {
      const svg = chartSvg(block.data, theme, { font: OFFICE_FONT });
      if (!svg) continue;
      out.set(block.chartIndex, { svg, png: await svgToPng(svg), width: CHART_W, height: CHART_H });
    } catch (error) {
      console.warn("could not make a picture of a chart", error);
    }
  }
  return out;
}
