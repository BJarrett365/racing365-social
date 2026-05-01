import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `AI Studio R&D Report · Admin · ${BRAND_SUITE}`,
};

const evolution = [
  ["LoopFeed", "Official/compliant source ingestion for YouTube, X/Twitter and third-party platform feeds."],
  ["CrowdyNews", "Real-time sports and social aggregation, surfacing emerging stories, fan conversation and live narratives."],
  ["CrowdyAI", "AI sports intelligence: classification, entity resolution, trend detection, moderation and match/content association."],
  ["Plexa Studio", "Production and governance layer for articles, translations, social images, shorts, audio/video scripts and exports."],
  ["Planet Sport AI Studio", "Strategic platform direction for rights-aware AI production across Planet Sport brands and creators."],
];

const objectives = [
  "Automatically ingest heterogeneous source intelligence from LoopFeed, CrowdyNews, official APIs, XML/RSS feeds, YouTube transcripts, owned content and licensed data.",
  "Classify and enrich sports content using AI across source type, topic, sport, rights status, content style, entity, timeline and editorial purpose.",
  "Transform approved source intelligence into governed articles, rewrites, translations, social images, captions, short scripts, voiceover and export-ready assets.",
  "Maintain provenance, rights context, content creator style, quality checks, review state and export status across every generated derivative.",
  "Reduce manual production effort while allowing content creators to remain the expert voice in their field.",
];

const baseline = [
  ["Generic AI tools", "Could draft text or images, but did not preserve source provenance, rights status, content creator style, approval state or export readiness."],
  ["CMS and editorial systems", "Managed articles and assets, but did not coordinate AI transformation across articles, social, image, audio, video and feed exports."],
  ["Translation and media APIs", "Provided isolated capabilities, but required orchestration, validation, review and rights-aware workflow integration."],
  ["Feed importers", "Handled RSS/XML or platform data, but did not normalise source material into one governed editorial production model."],
  ["AI coding tools", "Opened up faster prototyping, but did not remove the technical uncertainty of making the product reliable, governed and production ready."],
];

const uncertaintyBlocks = [
  {
    title: "2.1 Rights-Aware Source Provenance",
    uncertainty:
      "It was not known how to preserve source rights, licence status, permission basis and source evidence through multiple AI-generated derivative outputs.",
    challenge:
      "A single story may combine Opta data, official racing data, Alamy imagery, owned Planet Sport content, LoopFeed platform data and publisher-permitted feeds. Each derivative output may have different reuse and export constraints.",
    approach:
      "The team is developing source models, metadata fields, review states and export restrictions that can travel with articles, scripts, social images, translations and feed output.",
    advancement:
      "A rights-aware content graph that treats provenance as part of the production workflow rather than a note attached after generation.",
  },
  {
    title: "2.2 Multi-Format AI Transformation",
    uncertainty:
      "It was not known whether one approved source could be transformed into multiple platform-specific outputs while preserving facts, quotes, tone, creator style and rights metadata.",
    challenge:
      "AI models can generate individual drafts, but outputs diverge across articles, captions, scripts, thumbnails, translations and voiceover when there is no shared context and validation layer.",
    approach:
      "The system uses content style, sport, source brand, content creator profile, editorial guidelines, protected terms and review state to shape each transformation.",
    advancement:
      "A governed production workflow that can reuse source intelligence across formats while keeping editorial control visible.",
  },
  {
    title: "2.3 Heterogeneous Ingestion Pipeline",
    uncertainty:
      "It was not known how to normalise fundamentally different source types into one editorial workflow without losing metadata or creating parsing failures.",
    challenge:
      "YouTube transcripts, official APIs, XML/RSS feeds, HTML pages, owned archives and licensed sports data all have different structures, error modes, rate limits and rights assumptions.",
    approach:
      "The team has tested transcript import, Apify/YouTube routes, HTML page extraction, XML parser safeguards, Language Studio import flows and source-brand parser settings.",
    advancement:
      "A more flexible ingestion architecture that records source type and can route content into Article Studio, Language Studio, review queues and exports.",
  },
  {
    title: "2.4 AI Editorial Repair And Learning",
    uncertainty:
      "It was not known how to let AI fix quality issues while showing changes for approval and preventing repeated mistakes.",
    challenge:
      "AI fixes can alter facts, quotes, dates or tone. Human editors need visibility before changes are accepted, and the system needs to learn from approved corrections.",
    approach:
      "The product direction uses reviewable changes, quality checks, knowledge files and editorial guardrails so AI repair is auditable rather than silent.",
    advancement:
      "A human-in-the-loop repair workflow where failures and fixes become reusable product knowledge.",
  },
  {
    title: "2.5 Toolchain And API Orchestration",
    uncertainty:
      "It was not known how to combine Cursor-assisted development, model APIs, specialist media APIs, official platform feeds and internal Planet Sport systems into a stable production workflow.",
    challenge:
      "Tools such as Cursor, Lovable, OpenAI, DeepL, Runway, Apify and LoopFeed accelerate experimentation, but production systems still require validation, retry handling, cost control, source governance and export reliability.",
    approach:
      "The team is testing tools and APIs as modular capabilities while keeping Plexa responsible for orchestration, review, source memory and production state.",
    advancement:
      "A platform architecture where external AI/API providers are replaceable capability layers rather than the product's core defensibility.",
  },
];

const outcomes = [
  ["Article Studio", "Central hub for import, rewrite, translation, YouTube transcripts, News Shorts and review queue workflows."],
  ["Language Studio governance", "Source brands, content creators, guardrails, knowledge files, glossary, protected terms, market rules, quality checks and export feeds."],
  ["YouTube/script pipeline", "Metadata, transcript import, AI output generation and article creation from video source material."],
  ["R&D evidence loop", "Failures, parser errors, AI limitations, prompt tests, API barriers and manual bottlenecks are now treated as learning evidence."],
  ["Product positioning", "Plexa / Planet Sport AI Studio is framed as an AI-native editorial operating system, not an AI wrapper."],
];

const knowledge = [
  "Sports-specific prompt and workflow design for article, rewrite, translation, social and script generation.",
  "Source and rights metadata patterns for AI-assisted publishing workflows.",
  "HTML/XML/transcript ingestion safeguards for inconsistent third-party source formats.",
  "Review queue and quality-check patterns for human-in-the-loop AI production.",
  "Evidence discipline for accountants and R&D tax experts, including failures, abandoned approaches and barriers.",
];

const evidence = [
  "Failed prototypes, abandoned approaches and barriers encountered.",
  "Prompt/model tests, validation failures and hallucination controls.",
  "Parser, import, transcript and feed errors.",
  "Rights/provenance schema iterations and export restrictions.",
  "Latency, cost, retry, queue and export reliability measurements.",
  "Human review feedback and manual production steps removed.",
];

export default function RdReportPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Technical R&D Report</p>
        <h1 className="mt-1 text-3xl font-black text-white">Plexa / Planet Sport AI Studio R&D Report</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Draft technical report prepared for Planet Sport, Launch Accounting and R&D tax experts. The structure
          follows the CrowdyAI technical report format: project overview, technological uncertainties addressed,
          outcomes and learnings.
        </p>
      </div>

      <Panel title="Table of contents">
        <ol className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
          <li>1. Project Overview</li>
          <li>2. Technological Uncertainties Addressed</li>
          <li>3. Outcomes and Learnings</li>
        </ol>
      </Panel>

      <Panel title="Executive summary">
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            This report documents the Research and Development activities being undertaken in creating the Plexa /
            Planet Sport AI Studio: a rights-aware AI editorial production platform for sports and media teams.
          </p>
          <p>
            The project involves configuring and combining existing AI capabilities, official platform feeds,
            licensed sports data, owned Planet Sport content, content creator expertise and editorial governance to
            create a novel multi-format sports media production system.
          </p>
          <p>
            The R&D work addresses multiple technological uncertainties requiring systematic investigation and
            experimentation, including rights-aware provenance, multi-source ingestion, AI editorial repair,
            multi-format transformation and orchestration of tools/APIs into a reliable production workflow.
          </p>
        </div>
      </Panel>

      <Panel title="1. Project overview">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">1.1 Project objectives</h2>
            <p className="mt-2 text-sm text-slate-400">To develop an intelligent sports media production platform that can:</p>
            <ol className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              {objectives.map((item, index) => (
                <li key={item} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                  <span className="font-bold text-[#eab308]">{index + 1}. </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">1.2 Product evolution</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {evolution.map(([name, description]) => (
                <div key={name} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                  <p className="text-sm font-bold text-white">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="1.3 Baseline knowledge">
        <p className="mb-4 text-sm text-slate-300">
          At project inception, the following represented available tools and techniques. They provided useful
          components, but did not readily solve the combined production problem.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {baseline.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="2. Technological uncertainties addressed">
        <div className="space-y-4">
          {uncertaintyBlocks.map((block) => (
            <div key={block.title} className="rounded-xl border border-[#1f2d26] bg-[#0a0e0c] p-4">
              <h2 className="text-lg font-bold text-white">{block.title}</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">Uncertainty</p>
                  <p className="mt-1 text-sm text-slate-300">{block.uncertainty}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">Technical challenge</p>
                  <p className="mt-1 text-sm text-slate-300">{block.challenge}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">Resolution approach</p>
                  <p className="mt-1 text-sm text-slate-300">{block.approach}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">Advancement achieved</p>
                  <p className="mt-1 text-sm text-slate-300">{block.advancement}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="3. Outcomes and learnings">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">3.1 Technical outcomes</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {outcomes.map(([name, description]) => (
                <div key={name} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                  <p className="text-sm font-bold text-white">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">3.2 Knowledge contribution</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {knowledge.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <Panel title="Evidence to keep for accountants and R&D tax experts">
        <p className="mb-4 text-sm text-slate-300">
          R&D is not always about successful outcomes. The evidence pack should capture the barriers, failures and
          abandoned routes as well as working features.
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          {evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Report note">
        <p className="text-sm text-slate-300">
          This page is a technical narrative for review with Launch Accounting and R&D tax specialists. It should be
          supported by dated engineering notes, screenshots, commits, failed test records, API/error logs, prompt
          iterations and evidence from competent professionals. It is not a final tax claim or tax advice.
        </p>
      </Panel>

      <Link href="/admin/reports" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to R&D reports →
      </Link>
    </div>
  );
}
