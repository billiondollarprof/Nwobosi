# The mark

The Containment Seal. This file is the one that matters when the mark is
built or changed.

It exists because the mark has already drifted once. The concept was
written up in the old site repo, the code was written separately, and
what shipped was a different shape: two rings side by side, which is a
silhouette another company already owns. A spec that lives only in prose
in another repo is a spec that gets rebuilt from memory. This one lives
next to the code.

## The idea in one line

Two rings, one inside the other, with a bead of light running the channel
between them. The bead never gets out.

That is the product in one picture. Data moves, work happens, nothing
leaves. Most security marks are a lock or a shield, which say "closed",
and a closed system is a useless one. The claim here is the harder one:
things are moving in here, fast, and still nothing leaks.

The outer ring is the company boundary. The inner ring is the model
gateway. The bead is the company's data.

## Geometry

Drawn on a 100 by 100 grid.

| Part | Value |
| --- | --- |
| Centre | 50, 50 |
| Outer ring | radius 44, stroke 1.5 to 2 |
| Inner ring | radius 30, stroke 7 |
| Channel centreline | radius 37 |
| Bead | radius 3.5, travelling at radius 37 |

Both rings are complete circles. The gap between them is the channel, and
that is the only place anything moves.

The inner ring is much heavier than the outer. That hierarchy is
deliberate: the gateway is the hard part, the perimeter is the promise.

## Treatment

This is the part that separates the mark from a progress ring, and it is
the part a rebuild is most likely to lose.

**The inner ring is a lit tube, not a stroke.** Three layers, in order:

1. A blurred bloom underneath, the same gradient, roughly two to three
   times the stroke width, at low opacity. This is what makes the light
   feel like it is coming out of the ring rather than painted on it.
2. The ring itself, on the gradient below.
3. A specular highlight: a short, heavily feathered lighter arc inset on
   the upper left inner edge, as if a light source sits off that
   shoulder. Short, not a second ring.

**The inner gradient runs lower left to upper right, indigo into near
white.** The bright end going almost to white is what reads as light
travelling the ring. Stopping the gradient at navy kills it.

**The outer ring is a thin cool hairline**, clearly visible rather than a
whisper, carrying one brighter short segment that travels. Earlier drafts
had it at 22% opacity and it disappeared, which collapses the whole idea,
because with only one ring visible there is no channel and no containment.

**The bead is amber, with a tight warm bloom.** Small, bright, sitting in
the channel. It is the only warm colour anywhere in the mark.

## Colour

| Part | Value |
| --- | --- |
| Inner ring | gradient, indigo `#2030C8` into near white `#E8EBFF`, lower left to upper right |
| Outer ring | cool silver hairline |
| Bead | amber `#F5A820`, tight warm bloom |
| Verified pulse | green `#16B04A` |
| Blocked pulse | amber `#E8980A` |

On light backgrounds the outer ring becomes navy `#08113A` and the inner
gradient runs indigo into navy. The bead stays amber in both.

**The ground stays cool.** Near black with a faint blue cast, never warmed
toward brown. The amber bead is the only warm thing in the frame, and
warming the ground eats the contrast that makes it the focal point.

## Motion

Three states. The mark is telemetry, so its motion reports rather than
decorates.

| Motion | Duration | Easing |
| --- | --- | --- |
| Idle orbit | 10s per lap | linear |
| Bloom breath | 4s in and out | ease in out |
| Ring drift | 60s per lap, opposite directions | linear |
| Request lap | 1.5s | ease out |
| Green flash | 400ms | ease out |
| Blocked bounce | 900ms | ease in, then ease out |
| Amber flash | 600ms | ease out |

**Idle.** The bead travels the channel once every ten seconds at constant
speed. Both rings drift very slightly in opposite directions, done by
moving a highlight along them rather than spinning the shapes, so it never
reads as a loading spinner.

**A request passes.** The bead brightens and completes one faster lap, the
inner ring flashes green briefly, and the requests figure ticks up.

**Something is blocked.** The bead runs outward toward the boundary, meets
the outer ring, and is turned back. The outer ring flashes amber at the
point of contact. This is the most valuable three seconds in the identity:
it shows the product refusing to leak, without a word of explanation.

Under `prefers-reduced-motion` all orbiting stops, the bead rests at one
o'clock, and the states become colour only. Same information, no movement.

## Small sizes

Below about 40px the bead freezes at one o'clock in the channel and the
bloom is dropped. Below 24px raise the outer stroke to 3 and drop the
inner to 5, so both rings still read. Nothing else changes.

The two rings and the amber bead are the whole silhouette. If a size
cannot hold all three, it is too small for the mark.

## The readout

Where the mark is paired with figures, they are set as two large numerals
in indigo with small letterspaced labels beneath each, and a thin divider
between them. Not a single line of monospace.

```
   0                        14
RECORDS  |  REQUESTS
EGRESSED |  CHECKED
```

**The one rule: those numbers must always be real**, read from the gateway
log. A live zero is far stronger than an impressive fake, and the entire
claim of the page collapses the moment someone asks and the answer is that
the figure is decorative. Where there is nothing real to read from, the
readout does not appear at all.

## The wordmark

**StellaXafe** in Sora 600, mark to the left, gap about half the cap
height. The word is never broken up and the mark is never stretched.
