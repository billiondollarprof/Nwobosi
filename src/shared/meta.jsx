/* ==========================================================================
   PAGE META
   Title, description and canonical, per route.

   THE BUG THIS EXISTS TO FIX
   index.html carries one set of tags and a single page app never reloads it,
   so every route on the site was serving the home page's title, description
   and, worst of all, its canonical:

     <link rel="canonical" href="https://stellaxafe.com/" />

   A canonical pointing somewhere else is not a hint, it is an instruction.
   That line told a crawler that /anthony, /founder and /insights are all
   duplicates of the home page and that the home page is the one to keep.
   The most likely outcome is those pages never holding a position at all,
   which is the exact opposite of what /anthony is for.

   WHY CLIENT SIDE IS ENOUGH HERE
   There is no server rendering, so these are written into the document after
   the bundle boots. Google renders JavaScript and picks them up. Social
   scrapers mostly do not, so the static og: tags in index.html stay as the
   floor: a link shared from any page still gets a correct StellaXafe card
   rather than a blank one. Per route og: values are set here as well, which
   the scrapers that do execute scripts will read.

   Prerendering at build time would be strictly better and is the thing to do
   if search ever becomes a real channel. This removes the active harm today.

   HOW TO ADD A PAGE
   Add an entry to PAGES. Anything not listed falls back to the site default
   and is marked noindex, which is the safe direction: a page nobody wrote a
   description for is not a page that should be competing in search.
   ========================================================================== */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://stellaxafe.com";

/* Written for what somebody actually types. The product pages answer
   searches about private or company scoped AI; /anthony answers a recruiter
   searching for the skill, so its title leads on the name and the role
   rather than on the company, and its description carries the terms those
   roles are advertised under. */
const PAGES = {
  "/": {
    title: "StellaXafe — Private AI that already knows your company",
    description:
      "Every document, template and number your company runs on, already inside a private AI. Your staff ask in plain language and get finished work back. Nothing is trained on and nothing leaves your boundary.",
    index: true,
  },
  "/anthony": {
    title: "Anthony Nwobosi — AI Automation & Systems Builder",
    description:
      "I design and ship AI automation: AI agents, RAG knowledge systems, workflow automation and custom integrations, deployed to production. APIs and webhooks, WhatsApp Business API, edge functions, multi-tenant isolation. Open to remote roles and contract work.",
    index: true,
    person: true,
  },
  "/anthony/cv": {
    title: "Anthony Nwobosi — CV | AI Automation & Systems Builder",
    description:
      "Experience, publications, education and skills. AI orchestration, workflow automation, RAG and knowledge systems, integrations and APIs, human-in-the-loop design.",
    index: true,
  },
  "/founder": {
    title: "Anthony Nwobosi, Founder — StellaXafe",
    description:
      "The person behind StellaXafe. Builds AI automation: the workflows, agents and internal systems a company runs on, taken the whole way from first conversation to production.",
    index: true,
  },
  "/services": {
    title: "Services — Private AI deployment and workflow automation | StellaXafe",
    description:
      "Custom internal prompt engines, zero data retention environments, human in the loop workflows, and staff AI training. Built into the systems your organization already runs.",
    index: true,
  },
  "/insights": {
    title: "Tools by proxy: governing agents that can extend themselves | StellaXafe",
    description:
      "Agents are recursive and can reach tools they were never granted. Blocking every call is not viable and written rules miss the case nobody thought of. Research toward a checkpoint that carries its own rules and adapts.",
    index: true,
  },
  "/contact": {
    title: "Contact — StellaXafe",
    description:
      "Tell us what your organization runs on and what it needs to stop leaking. Deployments are built into your own systems.",
    index: true,
  },
};

const FALLBACK = {
  title: "StellaXafe — Private AI that already knows your company",
  description: PAGES["/"].description,
  index: false,
};

/* --------------------------------------------------------------------------
   Writing to the document
   Each helper finds an existing tag and updates it, or makes one. Updating
   in place matters: index.html already ships og: tags, and appending a
   second set would leave a scraper choosing between two.
   -------------------------------------------------------------------------- */

function setNamed(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setProperty(property, content) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/* The one tag that has to be removed rather than emptied. A robots meta left
   in place with an empty content attribute is not a no-op in every crawler,
   and an indexable page carrying a stale noindex is the worst failure this
   file could produce. */
function setRobots(index) {
  const existing = document.head.querySelector('meta[name="robots"]');
  if (index) {
    if (existing) existing.remove();
    return;
  }
  if (existing) {
    existing.setAttribute("content", "noindex, follow");
    return;
  }
  const el = document.createElement("meta");
  el.setAttribute("name", "robots");
  el.setAttribute("content", "noindex, follow");
  document.head.appendChild(el);
}

/* Structured data for the one page where it earns its place. A Person entry
   is how a search engine connects a name, a job title, a set of skills and
   the profiles that belong to the same human, which is the exact query a
   recruiter runs. Rewritten on every route change so it never lingers on a
   page that is not about him. */
function setPersonSchema(on) {
  const id = "sx-person-schema";
  const existing = document.getElementById(id);
  if (!on) {
    if (existing) existing.remove();
    return;
  }
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Anthony Nwobosi",
    jobTitle: "AI Automation & Systems Builder",
    url: `${SITE}/anthony`,
    email: "mailto:anthony@stellaxafe.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Port Harcourt",
      addressCountry: "NG",
    },
    sameAs: ["https://www.linkedin.com/in/anthony-nwobosi-575b3717a"],
    knowsAbout: [
      "AI automation",
      "AI agents",
      "AI orchestration",
      "Workflow automation",
      "Retrieval augmented generation",
      "Prompt engineering",
      "Human-in-the-loop design",
      "API integration",
      "Webhooks",
      "Product design",
    ],
    worksFor: { "@type": "Organization", name: "StellaXafe", url: SITE },
  };
  const el = existing || document.createElement("script");
  el.id = id;
  el.type = "application/ld+json";
  el.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(el);
}

/* --------------------------------------------------------------------------
   The component
   Mounted once inside the router. Reads the path on every change and writes
   the head to match.
   -------------------------------------------------------------------------- */

export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* A trailing slash is the same page. Without this, /anthony/ falls to the
       noindex fallback and quietly drops out of search. */
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    const page = PAGES[path] || FALLBACK;
    const url = SITE + (path === "/" ? "/" : path);

    document.title = page.title;
    setNamed("description", page.description);
    setCanonical(url);
    setRobots(page.index);

    setProperty("og:title", page.title);
    setProperty("og:description", page.description);
    setProperty("og:url", url);
    setNamed("twitter:title", page.title);
    setNamed("twitter:description", page.description);

    setPersonSchema(Boolean(page.person));
  }, [pathname]);

  return null;
}
