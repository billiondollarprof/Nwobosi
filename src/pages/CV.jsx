/* ==========================================================================
   CV
   One document, two outputs.

   On screen it belongs to the site: dark, spaced, the same type as every
   other page. Printed, it becomes a plain single column CV on white that an
   applicant tracking system can actually read.

   WHY IT IS BUILT THIS WAY RATHER THAN AS A FILE
   A CV kept as a separate PDF goes stale the moment anything changes, and
   the copy on the site and the copy in the document drift apart. This is one
   source. Edit it here and both the live page and the PDF are current.

   This file is also the source the job search reads. Anything that has to
   match a posting against this CV reads the constants below rather than a
   pasted copy, so there is still only one place to edit.

   HOW THE PDF IS MADE, AND THE TRAP THAT WAS AVOIDED
   Print the page and save as PDF. That is a real text PDF: selectable,
   parseable, single column.

   It is deliberately NOT generated with shared/download.js. That path uses
   html2canvas, which screenshots the page into an image and wraps it in a
   PDF. The result has no selectable text at all, so a parser sees an empty
   document. For a CV that is worse than useless, and worse than a design
   tool export, because it fails silently and nobody ever tells you.

   WHAT THE PRINT RULES ENFORCE
   Single column, black on white, no nav, no footer, no decoration, no icons
   carrying meaning, and no entry split across a page break. Multi column
   layouts, text boxes and graphics are the documented reasons CVs come out
   of parsers scrambled, so none of them appear here.

   Read top to bottom:

     1. The content, as data
     2. Small building blocks
     3. The document
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import { PageShell } from "../shared/ui.jsx";
import MarketingNav from "../shared/MarketingNav.jsx";

/* --------------------------------------------------------------------------
   1. THE CONTENT, AS DATA
   -------------------------------------------------------------------------- */

const ME = {
  name: "Anthony Nwobosi",
  title: "AI Automation Specialist",
  email: "anthony@stellaxafe.com",
  /* International format, because the reader is usually not in Nigeria. A
     local 0902 number is undiallable from abroad and some parsers will not
     recognise it as a phone number at all. Same number, +234 and the leading
     zero dropped. */
  phone: "+234 902 147 0715",
  linkedin: "linkedin.com/in/anthony-nwobosi-575b3717a",
  linkedinHref: "https://www.linkedin.com/in/anthony-nwobosi-575b3717a",
  site: "stellaxafe.com/anthony",
  siteHref: "/anthony",
  location: "Port Harcourt, Nigeria · WAT (UTC+1) · Open to remote",
};

/* The first thing anyone reads, and the only part of a CV that gets a
   reader's full attention rather than a scan.

   It opens on what he does rather than on a list of technologies, and the
   order of the four sentences is the argument. What he does, what that
   produces for the company, how he scopes the work, and what the finished
   thing is like to use. A position the reader can agree with is accepted
   before anything has been assessed, so every line under it is then read as
   evidence for a claim already accepted. Opening on a list of technologies
   gets the opposite: assessment first, and the rest of the page read
   sceptically.

   Anything longer than this stops being read and starts being skimmed. */
const SUMMARY =
  "I turn the work a business repeats by hand into systems that run on their own, and I make sophisticated AI tools easy for people to use. The result is simple: someone in their first week produces work to the standard of the best person in the room. I scope to what matters now, build with what is already there, design the interface people actually use, and ship inside the timeframe rather than after it.";

/* One role, four products beneath it.

   Listing the products as separate positions would read as four short stints
   of a few months each, which is the first thing a recruiter would notice and
   the last thing worth noticing. Held together under one heading, the same
   facts read as a continuous body of work, and the speed becomes the argument
   rather than the weakness: production in under three months, most of it
   spent on testing. That framing only survives scrutiny because Amara is live
   and a stranger can open it.

   The StellaXafe line says one month, and the month is the honest number.
   Most of it went on testing and on getting the product thinking right, which
   is a better answer to "why did that take a month" than a smaller number
   would be. The last product is marked in progress because it is not
   finished, and a CV that says so is worth more than one that does not. */
const EXPERIENCE = [
  {
    /* The searched title first, "Founder" second. An applicant tracking
       system weights the role headings in Experience as heavily as the one
       at the top, so a CV that says Specialist in the header and Builder in
       every role scores worse than it should. Both words are true of this
       job, so the order is the only decision, and the order that helps is
       the one that leads with what the posting is called. */
    role: "AI Automation Specialist and Founder",
    org: "StellaXafe",
    place: "Port Harcourt, Nigeria",
    dates: "2026 – Present",
    lead: "Design and ship complete AI automation systems: architecture, data model, access control, integrations, interface and deployment. Four products taken from a business problem to working software inside a year, built with AI coding agents (Claude Code and a DeepSeek harness), which is how one person ships at the pace of a team.",
    items: [
      {
        name: "Amara",
        note: "amara.ng",
        body: "Guest experience and automated CRM for hospitality, live with businesses today. It catches unhappy guests before they leave a one-star review: they scan a QR code and say privately what went wrong while they are still on site, and an instant WhatsApp alert lets the manager fix it before it becomes a bad review or a lost guest. Returning guest records, an authenticated check-in webhook a property management system can call, and automated WhatsApp messaging on arrival and departure. Each property runs as an isolated workspace. The whole product, interface included, went from first line to live production in under three months.",
      },
      {
        name: "StellaXafe",
        note: null,
        body: "Private, company-scoped AI for organisations that cannot risk a data leak. Staff ask for a report, proposal or deck, and it works from the company's approved files, reads back what it understood, and builds the finished Word, PDF, Slides or Excel file, charts included. Multi-tenant isolation enforced in the database rather than in application code, retrieval restricted to admin-approved sources, staged model routing to control cost, a model layer that runs on Claude or DeepSeek per company, and a human checkpoint before anything is sent or spent. One month from start to finished product, most of it spent on testing on top of getting the product thinking and design right. A deployment for a company can take longer still, because testing edge cases takes time and waiting on API access is sometimes part of that too.",
      },
      {
        name: "XALOM",
        note: "xalom.stellaxafe.com",
        body: "A trust passport for the digital market in Africa, where buying from a stranger online still runs on screenshots. A seller verifies once and gets an XID, a trust record that grows with every closed deal and honest review, which a buyer checks in seconds before paying. Conceived 2024, deployed mobile first with the desktop version to follow, and in active development with a team since 2026, as its own codebase and deployment so the identity layer stays isolated from anything beside it.",
      },
      {
        name: "SHOMEA",
        note: "shomea.pages.dev (in testing)",
        body: "An automated Bible verse display, built for my church. It listens to the sermon with on-device speech recognition, hears a Bible reference the moment the preacher says it, and puts that verse on screen, switching versions on request. It runs offline with nobody operating it, which removes the person who used to do it by hand.",
      },
    ],
  },
  {
    role: "Mathematics Teacher",
    org: "Urhiapele Mixed Secondary School",
    place: "Delta State, Nigeria",
    dates: "Aug 2023 – Jul 2024",
    lead: null,
    items: [],
    bullets: [
      "Taught final year students and prepared them for the WASSCE examination.",
      "Rebuilt explanations around the exact points students were getting wrong rather than around the syllabus order.",
    ],
  },
  {
    role: "Community Development Service President",
    org: "National Youth Service Corps",
    place: "Delta State, Nigeria",
    dates: "May 2024 – Jul 2024",
    lead: null,
    items: [],
    bullets: [
      "Led community outreach projects, managed funding, and organised hospital and school campaigns.",
      "Also served as overall chairman for community projects during the same period.",
    ],
  },
];

/* Leadership held separately from Education, because the two answer different
   questions. One says what he studied, the other says what he was trusted
   with while he studied, and a reader scanning for the second should not have
   to find it inside the first. */
const LEADERSHIP = [
  "Chairman, Technical Interest Group (TIG), Federal University Otuoke, 2018 – 2022. Led engineering students to national competition wins and prepared the next team before graduation.",
  "Best Student Representative, Faculty of Engineering, 2022.",
  "Assistant leader, church facilities unit (declined full leadership due to relocation plans).",
];

/* Published work and original research. Both predate the tech work and both
   still earn their place: one is evidence of making a hard subject usable,
   which is the training offer stated as a fact rather than a claim, and the
   other is evidence of original research that ended in a recommendation. */
const WRITING = [
  {
    title: "Organic Nomenclature Simplified: IUPAC System Made Easy",
    meta: "Co-author with Edet Odokwo · Dozie Prints & Publishing, 2019",
    body: "A guide to organic nomenclature for students, approved by the Delta State Ministry of Education and available on Amazon (ASIN B07N7CV3BY). Students still use it, and it carries strong feedback online and offline.",
  },
  {
    title: "Methane emissions from abandoned oil and gas wells",
    meta: "Academic research · Federal University Otuoke, 2022",
    body: "The first study of its kind in Nigeria, quantifying emissions from abandoned wells and setting out policy recommendations to mitigate them.",
  },
];

const EDUCATION = {
  degree: "B.Eng Civil Engineering",
  school: "Federal University Otuoke, Bayelsa State, Nigeria",
  dates: "Graduated February 2023",
  detail: "CGPA 4.21 / 5.0 (Second Class Upper)",
};

/* Grouped rather than listed flat, because a parser reads the whole line and
   a human reads the group label. Every term here is something that has been
   used in something shipped. */
const SKILLS = [
  {
    group: "AI and automation",
    items:
      "AI orchestration, agents, workflow automation, RAG and knowledge systems, prompt engineering, human-in-the-loop design, staged model routing, model-agnostic backends (Claude and DeepSeek, switched per company), LLM tooling (Claude, DeepSeek, ChatGPT, Gemini), on-device speech recognition (Whisper, Moonshine)",
  },
  {
    group: "AI-assisted development",
    items:
      "Claude Code and DeepSeek agent harnesses. Builds and ships production systems with AI coding agents, without writing code by hand, with written rules, tests and deploy checks that keep the agents' output safe to ship",
  },
  {
    group: "Integration",
    items:
      "REST APIs, webhooks, OAuth connectors, WhatsApp Business API, transactional email, scheduled jobs, n8n, Make, Zapier",
  },
  {
    group: "Data and delivery",
    items:
      "Postgres, row-level security, multi-tenant architecture, edge functions, Supabase, Cloudflare, Git",
  },
  {
    group: "Product",
    items:
      "Product thinking, UI and UX design, requirements gathering, technical documentation, technical writing",
  },
];

/* --------------------------------------------------------------------------
   2. SMALL BUILDING BLOCKS
   Section heading and entry, so the document below reads as a document
   rather than as a wall of markup.
   -------------------------------------------------------------------------- */

function Section({ title, children }) {
  return (
    <section className="cv-section mt-9 print:mt-5">
      <h2
        className="cv-h2 text-[13px] font-semibold uppercase tracking-[0.14em] pb-2 mb-4 border-b"
        style={{ fontFamily: FONTS.display, color: BRAND.accentSoft, borderColor: "var(--border)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function EntryHead({ role, org, place, dates }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <span
          className="cv-role text-[16px] font-semibold"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
        >
          {role}
        </span>
        <span className="cv-org text-[15px]" style={{ color: "var(--text-2)" }}>
          {org ? ` — ${org}` : ""}
        </span>
      </div>
      <div className="cv-dates text-[13px] whitespace-nowrap" style={{ color: "var(--text-3)" }}>
        {dates}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   3. THE DOCUMENT
   -------------------------------------------------------------------------- */

export default function CV() {
  const navigate = useNavigate();

  return (
    <PageShell scroll>
      {/* Both of these are print:hidden. Everything the reader needs to act
          on lives on screen; the printed page is only the document. */}
      <div className="print:hidden">
        <MarketingNav />
      </div>

      <div className="px-5 sm:px-8 pb-20 print:px-0 print:pb-0">
        <div className="max-w-3xl mx-auto print:max-w-none">
          {/* The controls. Print is the whole PDF story, so it is a real
              button rather than an instruction telling somebody to press
              ctrl+P. */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pt-8 pb-7">
            <button
              type="button"
              onClick={() => navigate("/anthony")}
              className="inline-flex items-center gap-2 text-[14px] font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--text-3)" }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.02]"
              style={{
                borderColor: "var(--border-2)",
                backgroundColor: "var(--surface)",
                color: "var(--text-1)",
              }}
            >
              <Printer size={15} style={{ color: BRAND.accentSoft }} />
              Save as PDF
            </button>
          </div>

          {/* The document itself. cv-sheet is what the print rules target. */}
          <article className="cv-sheet">
            {/* ============================================================
                HEADER
                ============================================================ */}
            <header className="pb-6 mb-2 border-b" style={{ borderColor: "var(--border)" }}>
              <h1
                className="cv-name text-[30px] sm:text-[34px] font-semibold tracking-tight"
                style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
              >
                {ME.name}
              </h1>
              <p
                className="cv-title text-[13.5px] font-semibold uppercase tracking-[0.1em] mt-2"
                style={{ color: BRAND.accentSoft }}
              >
                {ME.title}
              </p>
              <p className="cv-contact text-[14px] leading-[1.9] mt-3" style={{ color: "var(--text-2)" }}>
                <a href={`mailto:${ME.email}`} className="cv-link">
                  {ME.email}
                </a>
                {" · "}
                {ME.phone}
                {" · "}
                <a href={ME.linkedinHref} target="_blank" rel="noreferrer" className="cv-link">
                  {ME.linkedin}
                </a>
                {" · "}
                {ME.site}
                <br />
                {ME.location}
              </p>
            </header>

            {/* ============================================================
                SUMMARY
                ============================================================ */}
            <Section title="Summary">
              <p className="cv-body text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>
                {SUMMARY}
              </p>
            </Section>

            {/* ============================================================
                EXPERIENCE
                ============================================================ */}
            <Section title="Experience">
              <div className="flex flex-col gap-7 print:gap-4">
                {EXPERIENCE.map((job) => (
                  <div key={job.role + job.org} className="cv-entry">
                    <EntryHead role={job.role} org={job.org} place={job.place} dates={job.dates} />

                    {job.lead && (
                      <p
                        className="cv-body text-[14.5px] leading-[1.6] mt-2"
                        style={{ color: "var(--text-2)" }}
                      >
                        {job.lead}
                      </p>
                    )}

                    {job.bullets && (
                      <ul className="cv-list list-disc pl-5 mt-2 flex flex-col gap-1">
                        {job.bullets.map((b) => (
                          <li
                            key={b}
                            className="cv-body text-[14.5px] leading-[1.6]"
                            style={{ color: "var(--text-3)" }}
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {job.items.length > 0 && (
                      <div className="flex flex-col gap-3.5 mt-3.5 print:gap-2.5">
                        {job.items.map((item) => (
                          <div key={item.name} className="cv-product">
                            <div
                              className="cv-product-name text-[14.5px] font-semibold"
                              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                            >
                              {item.name}
                              {item.note && (
                                <span
                                  className="cv-note font-normal text-[13.5px]"
                                  style={{ color: BRAND.accentSoft }}
                                >
                                  {"  "}
                                  {item.note}
                                </span>
                              )}
                            </div>
                            <p
                              className="cv-body text-[14.5px] leading-[1.6] mt-1"
                              style={{ color: "var(--text-3)" }}
                            >
                              {item.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* ============================================================
                LEADERSHIP
                ============================================================ */}
            <Section title="Leadership">
              <ul className="cv-list list-disc pl-5 flex flex-col gap-1">
                {LEADERSHIP.map((l) => (
                  <li
                    key={l}
                    className="cv-body text-[14.5px] leading-[1.6]"
                    style={{ color: "var(--text-3)" }}
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </Section>

            {/* ============================================================
                PUBLICATION AND RESEARCH
                ============================================================ */}
            <Section title="Publication and research">
              <div className="flex flex-col gap-5 print:gap-3">
                {WRITING.map((w) => (
                  <div key={w.title} className="cv-entry">
                    <div
                      className="cv-role text-[15px] font-semibold"
                      style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                    >
                      {w.title}
                    </div>
                    <div className="cv-dates text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      {w.meta}
                    </div>
                    <p
                      className="cv-body text-[14.5px] leading-[1.6] mt-1.5"
                      style={{ color: "var(--text-3)" }}
                    >
                      {w.body}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ============================================================
                EDUCATION
                ============================================================ */}
            <Section title="Education">
              <div className="cv-entry">
                <EntryHead role={EDUCATION.degree} org={null} place={null} dates={EDUCATION.dates} />
                <div className="cv-body text-[14.5px] mt-1" style={{ color: "var(--text-2)" }}>
                  {EDUCATION.school}
                </div>
                <div className="cv-body text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {EDUCATION.detail}
                </div>
              </div>
            </Section>

            {/* ============================================================
                SKILLS
                Grouped, with the group name inline rather than as a heading,
                so a parser reads one continuous line per group.
                ============================================================ */}
            <Section title="Skills">
              <div className="flex flex-col gap-2.5 print:gap-1.5">
                {SKILLS.map((s) => (
                  <p
                    key={s.group}
                    className="cv-body text-[14.5px] leading-[1.6]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--text-2)" }}>
                      {s.group}:
                    </span>{" "}
                    {s.items}
                  </p>
                ))}
              </div>
            </Section>
          </article>
        </div>
      </div>
    </PageShell>
  );
}
