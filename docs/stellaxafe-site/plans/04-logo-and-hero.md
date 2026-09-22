# StellaXafe — Logo and Hero

Standalone spec for the first build. StellaXafe only.

## Part 1: The logo, the Containment Seal

### The idea in one line

Two rings, one inside the other, with a bead of light travelling the
channel between them. The bead never gets out.

That is the whole product in one picture. Data moves, work happens,
nothing escapes the perimeter.

### Why it works

Most security marks show a lock, a shield, or a padlock. Those say
"closed", which is the wrong message, because a closed system is a
useless one. Our claim is different: **things are moving in here, fast,
and still nothing leaks.** A shield cannot say that. A sealed orbit can.

The outer ring is the company boundary. The inner ring is the model
gateway. The bead is the company's data. It runs the channel forever and
never crosses either wall.

### Geometry

Drawn on a 100 by 100 grid so it scales anywhere.

| Part | Value |
| --- | --- |
| Centre | 50, 50 |
| Outer ring | radius 44, stroke 2 |
| Inner ring | radius 30, stroke 6 |
| Channel centreline | radius 37 |
| Bead | radius 3.5, travelling the channel at radius 37 |

Both rings are complete circles. No gaps, no breaks. The gap is the
channel between them, and that is the only place anything moves.

The inner ring is deliberately heavier than the outer. It reads as the
solid core with a lighter boundary drawn around it, which is the correct
hierarchy: the gateway is the hard part, the perimeter is the promise.

### Colour

| Part | Colour |
| --- | --- |
| Outer ring | navy `#08113A` at 22% opacity |
| Inner ring | gradient, indigo `#2030C8` into navy `#08113A`, running lower left to upper right |
| Bead | gold `#F5A820`, with a soft gold glow at about 30% opacity |
| Verified pulse | green `#16B04A` |
| Blocked pulse | amber `#E8980A` |

Gold for the bead is the point. Gold is what you protect. It is the only
warm colour in the mark, so the eye goes straight to the thing being
kept safe.

On dark surfaces the outer ring lifts to white at 25% and the inner ring
inverts to indigo into white. The bead stays gold.

### The static mark

For the nav bar, the favicon, and anywhere under about 40 pixels, the
bead freezes at the upper right of the channel, roughly the one o'clock
position, and the glow is removed. Everything else stays identical.

At small sizes the outer ring's 2 pixel stroke gets thin, so below 24
pixels raise it to 3 and drop the inner ring to stroke 5. Nothing else
changes.

### The wordmark

**StellaXafe** set in Sora, weight 600, with the mark to the left of the
text and a gap of about half the cap height. The word is never broken up
and the mark is never stretched.

## Part 2: The hero

### Layout

Centred, not split. A split hero fills the space, and filling the space
is the opposite of command. Confidence is a lot of air and one thing to
look at.

Top to bottom, all centred, on a near white background `#F6F7FE`:

1. Generous space above. Roughly 120 pixels on desktop, 72 on a phone.
2. **The Seal**, about 280 pixels across on desktop, 200 on a phone.
3. A small monospace readout directly beneath it.
4. The headline.
5. One line of supporting copy.
6. The access code field and its button.
7. Nothing else above the fold. No logos, no badges, no scroll hint.

The whole point is that a judge lands on the page and sees one moving
object and one sentence.

### Copy

**Readout under the seal**
```
0 RECORDS EGRESSED   ·   14 REQUESTS CHECKED
```
Monospace, small, letter spaced, muted grey. The numbers are live, read
from the gateway log. They are not decoration, and that is worth saying
out loud in the demo.

**Headline**
> Your team gets the model.
> Your data never leaves.

Sora, weight 700, two lines, break held exactly there. "never leaves"
carries the emphasis colour.

**Supporting line**
> Every request is checked, stripped of anything private, and written to
> a log before it goes anywhere. Nothing reaches a public model.

One line, generous measure, muted body colour.

**Call to action**
A single field reading "Enter access code" with a solid navy button next
to it. No sign up, no email capture, nothing else competing.

### Part 3: How the logo animates

Three states. The mark is the product telemetry, so its motion is not
decorative, it reports what is actually happening.

**State one, idle.** The bead travels the channel once every ten
seconds, at constant speed. Slow enough to be calm, fast enough that you
know it is alive. Both rings drift very slightly in opposite directions,
achieved by moving a dashed stroke rather than spinning the shapes, so
the mark never looks like a loading spinner. The gold glow breathes
gently, about four seconds in and out.

**State two, a request passes.** When a real request clears the gateway,
the bead brightens and completes one faster lap, roughly one and a half
seconds, then eases back to idle. The inner ring flashes green once, very
briefly, and the "requests checked" number ticks up. This fires on real
events, so during a live demo the mark reacts while you talk.

**State three, something is blocked.** When the sanitiser strips
something, the bead runs outward toward the boundary, meets the outer
ring, and is turned back inward. The outer ring flashes amber at the
point of contact. The bead returns to the channel and resumes.

That third state is the most valuable three seconds on the page. It
shows the product refusing to leak, visibly, without a word of
explanation.

### Timing

| Motion | Duration | Easing |
| --- | --- | --- |
| Idle orbit | 10s per lap | linear |
| Glow breath | 4s in and out | ease in out |
| Ring drift | 60s per lap, opposite directions | linear |
| Request lap | 1.5s | ease out |
| Green flash | 400ms | ease out |
| Blocked bounce | 900ms | ease in, then ease out |
| Amber flash | 600ms | ease out |

### Accessibility and cost

Under `prefers-reduced-motion`, all orbiting stops. The bead sits at the
one o'clock position and the state changes become colour only, no
movement. The information is identical, the motion is not.

The animation is plain SVG and CSS. No library, no canvas, no images. It
costs nothing to load and nothing to run.

### The one rule

The numbers under the seal must always be real. If the demo ever shows a
figure that is not read from the gateway log, the entire claim of the
page collapses the moment someone asks. A live zero is far stronger than
an impressive fake.
