/* ==========================================================================
   FORM BUILDER AND AUTOMATION PAGE
   The intake, scheduling, and reminder product. A full standalone page at
   /form-builder, not a modal. Read top to bottom:

     1. Hero
     2. What it does
     3. Who it is for
     4. How it is delivered
     5. Call to action
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import { ClipboardCheck, CalendarDays, MessageCircle, Download } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import { GlassPanel, PrimaryButton, GhostButton } from "../shared/ui.jsx";
import { MarketingPage, PageHero, SectionHead, GradientText, Divider } from "../shared/marketing.jsx";

/* --------------------------------------------------------------------------
   Page content
   -------------------------------------------------------------------------- */

const JOBS = [
  {
    icon: ClipboardCheck,
    title: "Custom intake forms",
    body: "Built to your fields, your branding, your flow, for visitors, guests, patients, or customers.",
  },
  {
    icon: CalendarDays,
    title: "Appointment scheduling",
    body: "Guests book straight into your calendar. No back and forth.",
  },
  {
    icon: MessageCircle,
    title: "Automated WhatsApp reminders",
    body: "A reminder lands the day before, every time, without a staff member sending it.",
  },
  {
    icon: Download,
    title: "CSV and CRM export",
    body: "Every guest, client, or booking exportable. Your full contact list, always yours.",
  },
];

const AUDIENCES = [
  {
    title: "Churches and ministries",
    body: "Visitor follow up, event registration, and campaign or invitation sends.",
  },
  {
    title: "Clinics and hospitals",
    body: "Patient intake and appointment reminders that cut down no shows.",
  },
  {
    title: "Small and mid size businesses",
    body: "Client booking and follow up without adding headcount.",
  },
  {
    title: "Enterprise and franchises",
    body: "Multi location intake with centralized guest data.",
  },
];

const DELIVERY = [
  { label: "Setup model", value: "Managed by StellaXafe" },
  { label: "Hosting", value: "StellaXafe subdomain or your domain" },
  { label: "Roadmap", value: "Self serve subscription" },
];

export default function FormBuilder() {
  const navigate = useNavigate();

  return (
    <MarketingPage>
      {/* ====================================================================
          1. HERO
          ==================================================================== */}

      <PageHero
        eyebrow="Product"
        title={
          <>
            Collect, schedule, and follow up.{" "}
            <GradientText>Without lifting a finger.</GradientText>
          </>
        }
        lead="Custom intake forms, appointment scheduling, and automated WhatsApp reminders for churches, hospitals, and businesses of any size, with a full CSV and CRM export of everyone who books."
      >
        <div className="flex flex-wrap items-center gap-3 mt-8">
          <PrimaryButton onClick={() => navigate("/contact")} className="px-6 py-3.5 text-[15px]">
            Request a setup
          </PrimaryButton>
          <GhostButton onClick={() => navigate("/setup")} className="px-6 py-3.5 text-[14.5px]">
            See the core engine
          </GhostButton>
        </div>
      </PageHero>

      <Divider />

      {/* ====================================================================
          2. WHAT IT DOES
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionHead eyebrow="What it does" title="One system, four jobs" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {JOBS.map((job) => (
              <GlassPanel key={job.title} className="p-6">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${BRAND.purple}1F` }}
                >
                  <job.icon size={19} style={{ color: BRAND.accentSoft }} />
                </div>
                <h3
                  className="text-[16px] font-bold mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {job.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {job.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          3. WHO IT IS FOR
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionHead
            eyebrow="Who it is for"
            title="Any organization that books people in"
            sub="Same core system, adapted to how each organization actually runs."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((audience) => (
              <GlassPanel key={audience.title} className="p-6">
                <h3
                  className="text-[15.5px] font-bold mb-2"
                  style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
                >
                  {audience.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {audience.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ====================================================================
          4. HOW IT IS DELIVERED
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <GlassPanel className="p-8 sm:p-11 grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <SectionHead
                eyebrow="How we deliver it"
                title="Managed setup today. Self serve tomorrow."
                sub="Right now, we set this up directly for each client, either hosted on a StellaXafe subdomain or cloned onto your own domain. There is no self serve signup yet. You tell us what you need and we build it. A subscription version is on the roadmap."
              />
            </div>
            <div className="flex flex-col gap-2.5">
              {DELIVERY.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border px-4 py-3"
                  style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <span className="text-[14px]" style={{ color: "var(--text-2)" }}>
                    {row.label}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* ====================================================================
          5. CALL TO ACTION
          ==================================================================== */}

      <section className="relative z-10 px-5 sm:px-8 pb-24 text-center">
        <PrimaryButton
          onClick={() => navigate("/contact")}
          className="px-7 py-3.5 text-[15px] mx-auto"
        >
          Request a setup for your organization
        </PrimaryButton>
      </section>
    </MarketingPage>
  );
}
