/* ==========================================================================
   PHOTO
   A photograph from the image pipeline, at the right size for the screen
   asking for it.

   Three things it has to get right, and all three are things a plain <img>
   gets wrong:

     A phone must not download a 1600px file. srcset offers every width the
     pipeline wrote and the browser takes the one it needs.

     The space must be reserved before the bytes arrive. Without a known
     ratio the page reflows when each photograph lands, which on a slow
     connection is the single most expensive looking thing a site can do.

     A missing file must not show a broken image icon. Every photograph
     here is additive rather than load bearing, so if one is not there yet
     the component removes itself and the section reads as though it was
     never meant to have one.

   Run `npm run images` after dropping originals into assets/source/.
   ========================================================================== */

import { useState } from "react";

const WIDTHS = [640, 1024, 1600];

/* The pipeline never upscales, so a 1000px original only ever produces a
   640 file. Offering a width that was never written sends the browser to
   a 404, and this component treats a 404 as "no photograph" and removes
   itself. So each use declares the widths that actually exist on disk. */
function srcSet(name, widths) {
  return widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(", ");
}

export default function Photo({
  name,
  alt,
  ratio = "16 / 9",
  /* Which files the pipeline actually wrote for this name. Check
     public/img/ after a run rather than assuming all three. */
  widths = WIDTHS,
  /* What slice of the viewport this occupies, so the browser can choose a
     width before layout has settled. Wrong values here are the usual
     reason a responsive image still downloads the largest file. */
  sizes = "100vw",
  /* Art direction: a different crop on a phone. Pass the name of a second
     set from the pipeline, and its ratio if it differs, which it usually
     does, because the whole reason for a second crop is that a landscape
     frame and a portrait one are not the same picture. The breakpoint is
     fixed at 768 so the ratio swap can live in the stylesheet, where a
     media query belongs. */
  narrow,
  narrowRatio,
  narrowWidths,
  /* Fill the parent instead of reserving a ratio. For a photograph in a
     column whose height is set by whatever sits next to it. The parent
     has to be positioned, and has to have a height of its own. */
  fill = false,
  priority = false,
  className = "",
  imgClassName = "",
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  /* The plain src is the fallback for anything that ignores srcset, so it
     has to be a file that exists. Largest available, not a fixed 1024. */
  const widest = widths[widths.length - 1];

  const image = (
    <img
      src={`/img/${name}-${widest}.webp`}
      srcSet={srcSet(name, widths)}
      sizes={sizes}
      alt={alt}
      onError={() => setFailed(true)}
      /* The hero mark is the only thing on this page that should compete
         for the first bytes, so everything here waits its turn. */
      loading={priority ? "eager" : "lazy"}
      /* Lowercase. React 18 does not know this one, so a camelCase
         fetchPriority is passed through to the DOM with a warning on every
         render; the lowercase spelling is applied as a plain attribute,
         which is what the browser reads anyway. */
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
      className={`w-full h-full object-cover ${imgClassName}`}
    />
  );

  return (
    <div
      className={
        fill
          ? `absolute inset-0 overflow-hidden ${className}`
          : `sx-photo overflow-hidden ${className}`
      }
      style={fill ? undefined : { "--r-wide": ratio, "--r-narrow": narrowRatio || ratio }}
    >
      {narrow ? (
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={srcSet(narrow, narrowWidths || widths)}
            sizes={sizes}
          />
          <source srcSet={srcSet(name, widths)} sizes={sizes} />
          {image}
        </picture>
      ) : (
        image
      )}
    </div>
  );
}
