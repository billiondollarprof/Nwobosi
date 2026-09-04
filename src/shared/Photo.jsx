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

function srcSet(name) {
  return WIDTHS.map((w) => `/img/${name}-${w}.webp ${w}w`).join(", ");
}

export default function Photo({
  name,
  alt,
  ratio = "16 / 9",
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
  priority = false,
  className = "",
  imgClassName = "",
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const image = (
    <img
      src={`/img/${name}-1024.webp`}
      srcSet={srcSet(name)}
      sizes={sizes}
      alt={alt}
      onError={() => setFailed(true)}
      /* The hero mark is the only thing on this page that should compete
         for the first bytes, so everything here waits its turn. */
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`w-full h-full object-cover ${imgClassName}`}
    />
  );

  return (
    <div
      className={`sx-photo overflow-hidden ${className}`}
      style={{ "--r-wide": ratio, "--r-narrow": narrowRatio || ratio }}
    >
      {narrow ? (
        <picture>
          <source media="(max-width: 767px)" srcSet={srcSet(narrow)} sizes={sizes} />
          <source srcSet={srcSet(name)} sizes={sizes} />
          {image}
        </picture>
      ) : (
        image
      )}
    </div>
  );
}
