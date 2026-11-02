# Images

## Where they go

Drop originals into `assets/source/`, then run:

```bash
npm run images
```

That writes optimised WebP at 640, 1024 and 1600 wide into `public/img/`.
Originals are gitignored because they are large and nothing serves them.
Only `public/img/` is published.

Filenames matter, because the pages ask for them by name.

| Drop in as | Appears |
| --- | --- |
| `assets/source/ops-room.png` | The banner in "Where we deploy" on the landing page |
| `assets/source/review.png` | Beside the security section, wide crop |
| `assets/source/review-portrait.png` | The same photograph on a phone, tall crop |
| `assets/source/anthony-nwobosi.png` | The founder page |

Any of `.png`, `.jpg`, `.webp` or `.tif` works as a source. The extension
of the source does not matter, only the name before it.

## The founder portrait, the quick way

`public/anthony-nwobosi.webp` is loaded directly by the founder page.
Replacing that one file with a new portrait works immediately with no code
change and no pipeline run. Use the pipeline instead when you want the
responsive widths.

## What the pipeline does, and why

Every photograph ships at three widths rather than one. A phone handed a
2400px file pays for all of it, decodes all of it, then throws most of it
away, and on a slow connection that is the difference between a page that
feels expensive and one that feels broken. `srcset` lets the browser take
the width it needs.

Quality is 82 for photographs, which is the point where WebP stops being
distinguishable from the source at normal viewing size. Logos and flat
graphics go to 90 with no chroma subsampling, because subsampling smears
hard colour edges. Nothing is ever upscaled: a 900px source will not be
written at 1600.

A rough guide to what to expect: an 8MB source at 2400x1350 comes out at
about 54kb at full width, and 2kb on a phone.

## If a photograph is missing

`Photo.jsx` removes itself when its file is not there, so a missing image
leaves no broken icon and no gap. Every photograph on the site is additive
rather than load bearing, and the sections read correctly without them.
