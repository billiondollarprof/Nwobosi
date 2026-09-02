/* ==========================================================================
   CONTACT PAGE
   The one form on the public site. It really sends: the fields go to an
   edge function, which emails them to StellaXafe with the sender set as
   the reply address. Reads as a modal, with a real URL at /contact.

   Read top to bottom:

     1. Heading
     2. The form
     3. Sent
     4. Coverage
   ========================================================================== */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

import { BRAND, FONTS } from "../shared/tokens";
import {
  GlassPanel,
  PrimaryButton,
  GhostButton,
  Field,
  TextInput,
  TextArea,
  Spinner,
} from "../shared/ui.jsx";
import { MarketingPage, GradientText, Eyebrow } from "../shared/marketing.jsx";
import ModalCard from "../shared/ModalCard.jsx";
import { sendContactRequest, nameProblem, emailProblem } from "../shared/contactApi.js";

export default function Contact() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", organization: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState(null);

  /* The button stays dim until the two fields that matter are filled, so
     nobody has to press it to find out what is missing. */
  const ready = !nameProblem(form.name) && !emailProblem(form.email);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setProblem(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    const result = await sendContactRequest(form);
    setSending(false);

    if (result.ok) setSent(true);
    else setProblem(result.reason);
  }

  return (
    <MarketingPage>
      <ModalCard label="Contact">
        {/* ==================================================================
            1. HEADING
            ================================================================== */}

        <Eyebrow>Get in touch</Eyebrow>
        <h1
          className="text-[27px] sm:text-[34px] font-bold leading-[1.15] tracking-tight mt-4"
          style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
        >
          Book a <GradientText>live call</GradientText>
        </h1>
        <p className="text-[15.5px] leading-relaxed mt-4 max-w-xl" style={{ color: "var(--text-2)" }}>
          45 minutes to map your current stack, your risk surface, and where a private AI system
          would earn its keep first.
        </p>

        {sent ? (
          /* ================================================================
             3. SENT
             The form is gone rather than sitting there filled in. It has
             been sent, so there is nothing left to do on it.
             ================================================================ */
          <GlassPanel className="p-8 mt-8 text-center">
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(22,176,74,0.12)" }}
              >
                <Check size={22} style={{ color: BRAND.green }} />
              </div>
            </div>
            <h2
              className="text-[19px] font-bold mb-2"
              style={{ fontFamily: FONTS.display, color: "var(--text-1)" }}
            >
              Received
            </h2>
            <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              We will follow up within one business day, at {form.email}.
            </p>
            <GhostButton onClick={() => navigate("/")} className="mt-6">
              Back to home
            </GhostButton>
          </GlassPanel>
        ) : (
          /* ================================================================
             2. THE FORM
             ================================================================ */
          <form onSubmit={submit} className="mt-8" noValidate>
            <Field label="Full name" required>
              <TextInput
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            </Field>

            <Field label="Work email" required>
              <TextInput
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                autoComplete="email"
                maxLength={254}
              />
            </Field>

            <Field label="Organization">
              <TextInput
                value={form.organization}
                onChange={(event) => set("organization", event.target.value)}
                autoComplete="organization"
                maxLength={160}
              />
            </Field>

            <Field label="What are you looking to solve?">
              <TextArea
                rows={4}
                value={form.message}
                onChange={(event) => set("message", event.target.value)}
                maxLength={4000}
              />
            </Field>

            {problem && (
              <p className="text-[13.5px] mb-4" style={{ color: BRAND.red }}>
                {problem}
              </p>
            )}

            <PrimaryButton
              type="submit"
              disabled={!ready || sending}
              className="flex items-center gap-2.5 px-6 py-3.5 text-[15px]"
            >
              {sending && <Spinner size={14} color="#FFFFFF" />}
              {sending ? "Sending" : "Confirm live call request"}
            </PrimaryButton>
          </form>
        )}

        {/* ==================================================================
            4. COVERAGE
            ================================================================== */}

        <GlassPanel className="p-6 mt-7">
          <h3
            className="text-[12px] font-semibold uppercase tracking-wide mb-2.5"
            style={{ color: "var(--text-3)" }}
          >
            Coverage
          </h3>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Serving organizations across the United States, United Kingdom, and Nigeria. Remote
            first, on site by arrangement.
          </p>
        </GlassPanel>
      </ModalCard>
    </MarketingPage>
  );
}
