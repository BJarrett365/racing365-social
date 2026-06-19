import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `R&D Assessment · Admin · ${BRAND_SUITE}`,
};

const rightsLayers = [
  ["Licensed sport data", "Football data via Opta, official horse racing data, official logos and racing silks where covered by licence."],
  ["Licensed imagery", "Alamy image licensing and approved visual assets covering brands using the Planet Sport Studio platform."],
  ["Owned content", "Planet Sport articles, creator output, archive material, editorial knowledge and brand guidance."],
  ["Official platform feeds", "LoopFeed access using official YouTube API and X/Twitter sources."],
  ["Publisher-permitted feeds", "XML/RSS feeds from publishers granting access to source content."],
  ["Governed external inputs", "YouTube transcripts, URLs and third-party sources with source status, review state and export restrictions."],
];

const stats = [
  ["4", "Core platform layers"],
  ["6", "Rights/source layers"],
  ["High", "Industry relevance"],
  ["High", "R&D potential"],
];

const platformPillars = [
  ["Source intelligence", "Licensed sports data, owned Planet Sport content, official API feeds, XML/RSS publisher feeds, video transcripts, images and future audio/video inputs."],
  ["Transformation engine", "Rewrite, translation, article generation, social output, quote extraction, short scripts, thumbnails, image/video variants and editorial repair."],
  ["Governance layer", "Source brands, content creator styles, knowledge files, protected terms, guardrails, market rules, quality checks and approval queues."],
  ["Distribution layer", "Export XML/JSON, review queue, library assets, CMS/feed connectors, social platform adaptation and future syndication workflows."],
];

const evolution = [
  ["LoopFeed", "Official/compliant source ingestion for YouTube, X/Twitter and third-party platform feeds."],
  ["CrowdyNews", "Real-time sports and social aggregation, surfacing emerging stories, fan conversation and live narratives."],
  ["CrowdyAI", "AI sports intelligence: classification, entity resolution, trend detection, moderation and match/content association."],
  ["Planet Sport Studio", "Production and governance layer for articles, translations, social images, shorts, audio/video scripts and exports."],
  ["Planet Sport AI Studio", "Strategic platform direction for rights-aware AI production across Planet Sport brands and creators."],
];

const industryNeeds = [
  ["Speed with control", "Publishers need faster production without losing editorial standards, house style, quote accuracy or compliance checks."],
  ["Format multiplication", "One story now needs to become an article, short script, caption, social image, thumbnail, app alert, voiceover, translation and platform-native post."],
  ["Creator scale", "Creators need to build a digital footprint across text, audio, image, voice, face and video without spending time on repetitive production mechanics."],
];

const priorities = [
  ["Editorial intelligence layer", "Policy-aware editorial agents that reason over facts, quotes, house style, rights status and export requirements.", "High"],
  ["Rights-aware provenance", "Track whether material came from licensed data, owned content, official APIs, permitted feeds or external sources.", "High"],
  ["Multimodal creator studio", "Treat text, images, thumbnails, audio, voice, face and video as one content graph for creator-scale output.", "High"],
  ["AI change review", "Show AI fixes as reviewable changes, learn from approved fixes and store lessons in knowledge files.", "High"],
  ["Publisher connectors", "Add CMS, feed, social, DAM and newsroom integrations so Planet Sport Studio becomes operating infrastructure.", "Medium"],
];

const risks = [
  ["Commodity model risk", "Reduce by owning workflow memory, governance, rights context and integrations."],
  ["Rights risk", "Turn licensed data, owned content and permissioned feeds into a first-class advantage with audit trails."],
  ["Quality risk", "Move AI fixes into reviewable diffs with knowledge-file learning."],
  ["Operational risk", "Add queue states, retry logic, import diagnostics and export logs."],
  ["SME cost risk", "Enterprise tools (e.g. Adobe per-seat suites) do not scale; R&D must prove composable API + owned orchestration is viable."],
  ["Productionisation risk", "Cursor/Lovable demos multiply across UK and SA teams; without hardening, governance and security fail."],
  ["AI security risk", "Credential exposure and unauthorised cloud provisioning already occurred; human factor is the weakest control."],
  ["Trust / hallucination risk", "Raw AI not publish-ready; Plexa must anchor on licensed data and review gates."],
  ["Adoption risk", "Staff fear role loss; resistance blocks ROI from Cursor/Lovable investment."],
  ["Legal / GDPR risk", "Motion-from-image, voice clone, manipulation — lawful basis unclear without explicit R&D and legal review."],
];

const platformEvaluation = [
  ["Cursor", "MIO, parsers, fact-check, template studios — achieves streams that previously needed dedicated technicians.", "Active"],
  ["Lovable", "App projects around editorial/workflow UIs; validate UX before SA dev productionises in Plexa.", "Active"],
  ["OpenAI / model APIs", "Generation, classification, fact-check, editorial repair — selected per task with cost/quality logs.", "Active"],
  ["Runway / ElevenLabs / Apify", "Video, voice, ingestion — modular media capability layers.", "Active"],
  ["Adobe Creative Cloud", "Trialled for conventional video/motion production — rejected: per-seat cost prohibitive for Planet Sport SME scale; no native rights/review/export orchestration.", "Rejected"],
];

const securityProgramme = [
  ["2FA (two-factor authentication)", "Mandatory across admin, cloud, repository and AI platform accounts.", "Paramount"],
  ["Transfon", "Technical security partner — infrastructure lockdown and monitoring with internal technical team.", "Active"],
  ["Venture DK", "Technical security partner — cloud and access management with internal technical team.", "Active"],
  ["Mimecast", "Human-factor programme — phishing simulation and staff security training.", "Active"],
  ["AI secrets policy", "No production keys in Cursor/Lovable/chat; incident-driven after credential exposure and unauthorised AWS provisioning.", "Active"],
];

const roadmap = [
  ["Near term", "Strengthen Article Studio, rights/source status, content creator profiles, review queue counts, AI change previews and export observability."],
  ["Next", "Add source quote citations, social image generation, licensed image workflows, reusable prompt rules, platform templates and richer import diagnostics."],
  ["R&D", "Develop an editorial agent framework, rights-aware multimodal asset graph, automated compliance checks, creator identity tools and performance analytics."],
];

export default function RdAssessmentPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">R&D Assessment</p>
        <h1 className="mt-1 text-3xl font-black text-white">Planet Sport Studio R&D Assessment</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Planet Sport Studio is evolving into a production layer for AI-native sports and
          media teams that turns approved source intelligence into governed, reusable, multi-format output with
          clear provenance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["AI-native editorial operating system", "Rights-aware production", "Multimodal studio", "Creator scale tools"].map((item) => (
            <span key={item} className="rounded-full border border-[#1f2d26] bg-[#0a0e0c] px-3 py-1 text-xs font-semibold text-slate-300">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-[#1f2d26] bg-[#0a0e0c] p-4">
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <Panel title="Core thesis">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-base font-semibold text-white">A production layer for AI-native sports and media teams.</p>
            <p className="mt-2 text-sm text-slate-300">
              The strongest product direction is not &quot;generate content faster&quot;; it is to turn approved source
              intelligence into governed, reusable, multi-format output with clear provenance.
            </p>
          </div>
          <div className="rounded-lg border border-[#1f2d26] bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">Not just an AI wrapper</p>
            <p className="mt-2 text-sm text-slate-400">
              The defensible layer is the workflow, source memory, rights status, governance, creator style,
              review process and export reliability around the models.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Technical platform view">
        <div className="grid gap-3 md:grid-cols-2">
          {platformPillars.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-4">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Product evolution">
        <div className="grid gap-3 md:grid-cols-2">
          {evolution.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-[#1f2d26] bg-black/20 p-4">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Rights and source advantage">
        <p className="mb-4 text-sm text-slate-300">
          The rights layer is one of Planet Sport Studio&apos;s strongest differentiators because the platform starts from
          trusted, licensed or permissioned source material rather than open-ended prompt generation.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {rightsLayers.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-4">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Industry needs">
        <div className="grid gap-3 md:grid-cols-3">
          {industryNeeds.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-[#1f2d26] bg-black/20 p-4">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="R&D priorities">
        <div className="overflow-hidden rounded-lg border border-[#1f2d26]">
          <div className="grid grid-cols-[1fr_2fr_100px] bg-[#0a0e0c] px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>Theme</span>
            <span>Why it matters</span>
            <span>Priority</span>
          </div>
          {priorities.map(([theme, why, priority]) => (
            <div key={theme} className="grid grid-cols-[1fr_2fr_100px] gap-3 border-t border-[#1f2d26] px-4 py-3 text-sm">
              <span className="font-semibold text-white">{theme}</span>
              <span className="text-slate-400">{why}</span>
              <span className="text-[#eab308]">{priority}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cutting edge opportunities">
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="font-semibold text-white">1. Editorial agent system</p>
              <p className="mt-1 text-slate-400">Specialised agents for import, rewrite, quote validation, SEO, compliance, social adaptation and export readiness.</p>
            </div>
            <div>
              <p className="font-semibold text-white">2. Rights-aware generation</p>
              <p className="mt-1 text-slate-400">Every output should carry source type, permission basis, quote evidence, image licence status and export restrictions.</p>
            </div>
            <div>
              <p className="font-semibold text-white">3. Multimodal asset graph</p>
              <p className="mt-1 text-slate-400">Treat each story as a graph of article, transcript, thumbnail, quote card, short script, social copy, translation, voiceover, image and export state.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Risks to solve">
          <div className="space-y-3">
            {risks.map(([name, description]) => (
              <div key={name}>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="mt-1 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Why Plexa — trust over raw AI">
        <p className="text-sm text-slate-300">
          Generative AI <strong className="font-semibold text-white">hallucinates</strong> and is not trusted by editors
          or readers. Planet Sport builds Plexa to control output:{" "}
          <strong className="font-semibold text-white">licensed data</strong>,{" "}
          <strong className="font-semibold text-white">owned content</strong>, fact-check, provenance and human
          approval — not another chatbot wrapper.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Humans also <strong className="font-semibold text-slate-300">fear role erosion</strong>. Adoption is an R&D
          problem: workflows must keep creators as the accountable voice while removing repetitive production mechanics.
        </p>
      </Panel>

      <Panel title="R&D acceleration vs previous claim cycle">
        <p className="text-sm text-slate-300">
          Technology is moving faster than ever. The last R&D claim relied more on{" "}
          <strong className="font-semibold text-white">technicians</strong> to build prototypes, manage feeds, security
          and designs. This cycle tests whether <strong className="font-semibold text-white">Cursor</strong>,{" "}
          <strong className="font-semibold text-white">Lovable app projects</strong> and AI APIs let a smaller
          distributed team (UK + SA) deliver the same ambitions{" "}
          <strong className="font-semibold text-white">despite reduced headcount</strong> — with case studies evidencing
          productionised outcomes, not demos alone.
        </p>
      </Panel>

      <Panel title="Security incident register">
        <p className="text-sm text-slate-300">
          Log every security incident and material vulnerability on{" "}
          <Link href="/admin/reports" className="font-semibold text-[#22c55e] hover:underline">
            /admin/reports
          </Link>{" "}
          using <strong className="font-semibold text-white">Security incident & vulnerability log</strong>. Record
          what failed, what was not known beforehand, and what remediation followed. Not a substitute for formal ICO
          notification where GDPR requires it.
        </p>
      </Panel>

      <Panel title="Legal, ethical and GDPR">
        <p className="text-sm text-slate-300">
          AI can turn a still into motion video or synthesise voice. It is uncertain which uses are lawful and ethical
          for a UK/EU publisher — personality rights, misleading manipulation, betting integrity, and{" "}
          <strong className="font-semibold text-white">GDPR</strong> for personal data in squads, logs and voice
          pipelines. Blocked and approved paths are both R&D evidence.
        </p>
      </Panel>

      <Panel title="Productionisation (UK + SA teams)">
        <p className="text-sm text-slate-300">
          Nik Keene, David Jarrett and the South Africa development team now use Cursor, Lovable and Plexa-connected AI
          tooling alongside UK engineering. The R&D bottleneck is not building demos — it is{" "}
          <strong className="font-semibold text-white">productionising</strong> them: review gates, tests, secrets
          management, export reliability and shared standards across distributed teams.
        </p>
      </Panel>

      <Panel title="AI-era security programme">
        <p className="mb-4 text-sm text-slate-300">
          AI amplifies speed and risk. Planet Sport has experienced a security incident involving AI-platform-related
          credential exposure and unauthorised AWS environment creation. Security must intensify on{" "}
          <strong className="font-semibold text-white">technical and human</strong> axes — 2FA is paramount.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2d26] text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4">Control</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {securityProgramme.map(([name, role, status]) => (
                <tr key={name} className="border-b border-[#1f2d26]/60">
                  <td className="py-3 pr-4 font-semibold text-white">{name}</td>
                  <td className="py-3 pr-4 text-slate-400">{role}</td>
                  <td className="py-3">
                    <span
                      className={
                        status === "Paramount"
                          ? "rounded-full bg-amber-950/50 px-2 py-0.5 text-xs font-semibold text-amber-400"
                          : "rounded-full bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-400"
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Platform evaluation (SME toolchain)">
        <p className="mb-4 text-sm text-slate-300">
          Planet Sport cannot assume enterprise creative software is the answer. R&D includes evaluating new AI
          platforms — Cursor, Lovable, model APIs — and documenting why some routes (including Adobe) were abandoned on
          cost and integration grounds.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2d26] text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">R&D role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {platformEvaluation.map(([name, role, status]) => (
                <tr key={name} className="border-b border-[#1f2d26]/60">
                  <td className="py-3 pr-4 font-semibold text-white">{name}</td>
                  <td className="py-3 pr-4 text-slate-400">{role}</td>
                  <td className="py-3">
                    <span
                      className={
                        status === "Rejected"
                          ? "rounded-full bg-red-950/50 px-2 py-0.5 text-xs font-semibold text-red-400"
                          : "rounded-full bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-400"
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Suggested R&D roadmap">
        <div className="space-y-3">
          {roadmap.map(([horizon, focus]) => (
            <div key={horizon} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-4">
              <p className="text-sm font-bold text-[#eab308]">{horizon}</p>
              <p className="mt-1 text-sm text-slate-300">{focus}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Positioning recommendation">
        <p className="text-sm text-slate-300">
          Planet Sport Studio should position itself as an AI-native editorial operating system for
          sports and publisher teams. The competitive edge will come from LoopFeed ingestion, CrowdyNews/CrowdyAI
          intelligence, governed workflows, content memory, rights-cleared source provenance, multimodal production,
          creator-scale tooling and export reliability, not simply exposing AI models in a nicer interface.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          R&D should also record the failures and barriers: malformed feeds, transcript gaps, prompt failures,
          model hallucinations, API limits, missing rights metadata, slow workflows, export errors,{" "}
          <strong className="font-semibold text-slate-300">abandoned platform trials (e.g. Adobe on cost grounds)</strong>
          , and manual production steps that block content creators from being creative.
        </p>
      </Panel>

      <Link href="/admin/reports" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to R&D reports →
      </Link>
    </div>
  );
}
