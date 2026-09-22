# StellaXafe — Positioning and Brand Direction

Planning document. No code. Written so any later session can pick this
up without re-reading the conversation it came from.

## 1. What StellaXafe actually is

StellaXafe is **the parent company**, not a single product. It is a
trust and safety company. The thing it sells is an **enterprise private
AI gateway**: a zero trust layer that lets a company use AI models on
top of its own private data without that data leaving the perimeter.

The one line version: *staff get the power of a frontier model, the
company keeps its data.*

### The portfolio under the umbrella

| Name | What it is | Nature |
| --- | --- | --- |
| **StellaXafe** | Private AI gateway and data sovereignty layer for enterprises | The company and the core engine |
| **XALOM** | Digital trust, reputation and identity protocol. A layer that sits on top of informal and social commerce markets | Infrastructure |
| **Amara** | Guest intelligence and reputation SaaS for hospitality, aiming to stand beside the rating systems as its own category | Product (SaaS) |

**Form Builder & Automation is removed from StellaXafe.** It is no
longer part of the story, the site, or the roadmap. If a business asks
for it, it is handled separately as private work. It should come off the
site, out of the nav, out of the footer, and out of the products
section.

### What the core engine does

1. **Private AI gateway and data sovereignty**
   - Sits as a runtime proxy between employees and the model.
   - Stops company data, credentials and IP reaching public model
     training sets or third party APIs.
   - Validates and sanitises the payload before anything leaves the
     perimeter.
2. **Enterprise knowledge and document generation**
   - Retrieval over verified internal files, held in an isolated
     backend with strict tenant isolation.
   - Staff query company documentation, automate daily work, and
     generate real business documents.
3. **Deployment**
   - On premise or private cloud (VPC on GCP or AWS) for companies with
     budget.
   - Managed multi tenant with strict row level security for companies
     without.
4. **The staff platform**
   - Every staff member gets an account inside the company workspace.
   - An admin dashboard sets a weekly token budget per staff member.
   - Staff can connect their own accounts (for example Canva) so design
     work does not burn model tokens.
5. **WhatsApp support agent** — real, but **not now**. Most US companies
   do not run support on WhatsApp, and it doubles the build. Parked
   until after the build and after the first pitches.

## 2. The design language we are borrowing from XALOM

XALOM is already designed at infrastructure grade, so StellaXafe adopts
its language rather than inventing a second one. Pulled directly from
the XALOM page:

**Palette.** Light and institutional, not dark. Deep navy ink
(`#08113A`), indigo (`#2030C8`, `#3A4EE8`, `#5870F8`), gold foil amber
(`#E8980A`, `#F5A820`, `#FFD068`), verification green (`#16B04A`), on
near white surfaces (`#F6F7FE`, `#ECEFFE`).

**Type.** Sora for display, DM Sans for body. Both are Google Fonts, so
they are free and, unlike Fontshare, they load in our build sandbox,
which means design work can finally be checked properly.

**Surface.** Generous radii (8 to 36px) and soft layered shadows rather
than glowing borders. Lots of white space. Calm, not loud.

**Structure.** Hero, then proof, then the problem stated plainly, then
three steps, then who it is for, then architecture, then safety, then
mission, then close.

**The move away from the current site.** Drop the dark violet and pink
treatment. Keep the discipline (inline SVG icons, both themes, no em
dashes) and change the surface to light, navy and gold. More white
space, more command, fewer glows.

## 3. The physical artifact

XALOM's emotional centre is a physical object: the **Digital Trust
Passport**, a card with a holder name, an XID number, and a gold ring
dial reading 94% verified. It works because a passport is a thing you
can picture holding.

StellaXafe needs its own object, and it should be the enterprise mirror
of the passport:

> **XALOM proves who you are. StellaXafe proves nothing left.**

### Recommendation: the Containment Seal

The seal on a diplomatic pouch, an evidence bag, a vault door. Two
concentric rings that cannot be separated. Nothing crosses without being
recorded.

On the hero this becomes a live component:

- An **outer ring**: the company perimeter.
- An **inner ring**: the gateway and the model.
- The two are locked together and **counter rotate** slowly, so the mark
  is always alive but never busy.
- In the centre, a live readout: **`0 records egressed`**.
- Around the ring, tick marks that light green as requests pass
  validation.

This satisfies the brief exactly: two circles inside each other,
inseparable, rotating, meaning nothing leaks. It also doubles as the
logo when frozen, and it gives us a **Containment Certificate** card,
the direct counterpart to XALOM's passport card, showing tenant name,
deployment ID, egress count and isolation status.

Crucially it is not decoration. The number in the middle is real, read
from the gateway's egress log. The brand mark *is* the product telemetry.

### Runner up, if the seal does not land

**The airlock.** Two doors, never both open at once. Equally apt for a
gateway and slightly more literal about the proxy. Less good as a logo,
because it is harder to reduce to a mark.

## 4. What happens to the current site

The current StellaXafe site is dark violet, built around a different
story, and now carries a product we are cutting. It needs a rebrand, not
a patch.

**Recommendation: do not surgically remove Form Builder from the current
design.** The whole surface is being replaced. Removing one page from a
site that is about to be rebuilt is throwaway work. Fold the removal
into the rebrand.

The exception is if the current site is about to be shown to anyone. If
it is, the removal takes about ten minutes and can be done immediately.

Sequencing:

1. **Now to Thursday** — the first build. A short landing page borrowing this
   language gets slapped on at the end. See `03-build-schedule.md`.
2. **After the first build** — full StellaXafe rebrand on the new palette,
   new logo, new positioning, Form Builder gone.
