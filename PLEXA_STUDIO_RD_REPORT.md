# Plexa / Planet Sport AI Studio - R&D Technical Report

Prepared for Planet Sport, Launch Accounting and R&D tax experts.

This document is a draft technical R&D narrative. It is not tax advice and should be reviewed by the company's accountants and R&D advisers before being used to support any formal claim.

## Table of Contents

1. Project Overview
2. Technological Uncertainties Addressed
3. Outcomes and Learnings
4. Match Intelligence and Editorial Production R&D
5. Sport365 Visual Template and Data Studio R&D
6. Platform Case Studies And R&D Acceleration
7. Related R&D Document Registry

*(Sections 2.6–2.11 — platforms, productionisation, security, trust, adoption, legal/GDPR — sit within Section 2.)*

## Executive Summary

This report documents the Research and Development activities being undertaken in creating the **Plexa / Planet Sport AI Studio**: a rights-aware AI editorial production platform for sports and media teams.

The project involves configuring and combining existing AI capabilities, official platform feeds, licensed sports data, owned Planet Sport content, content creator expertise and editorial governance to create a novel multi-format sports media production system.

The R&D work addresses multiple technological uncertainties requiring systematic investigation and experimentation, including rights-aware provenance, multi-source ingestion, AI editorial repair, multi-format transformation, orchestration of tools/APIs into a reliable production workflow, **AI trust and hallucination control**, **human adoption**, and **legal/ethical/GDPR boundaries** for generative media.

Technology is moving faster than at the time of Planet Sport's **previous R&D claim cycle**, when dedicated **technicians** were typically required to build prototypes, manage feeds, handle security and produce designs. **Cursor**, **Lovable** and composable AI APIs now allow a smaller distributed team (UK product — including Nik Keene and David Jarrett — plus South Africa development) to pursue the same ambitions **despite reduced headcount** in traditional technical roles — but only where outputs are **productionised** through **Plexa**, which controls untrusted raw AI with licensed data, owned content, fact-checking and review gates.

The strongest product direction is not simply to generate content faster. It is to turn approved source intelligence into governed, reusable, multi-format output with clear provenance — because **raw AI is still not trusted** in a newsroom.

## 1. Project Overview

### 1.1 Project Objectives

To develop an intelligent sports media production platform that can:

1. Automatically ingest heterogeneous source intelligence from LoopFeed, CrowdyNews, official APIs, XML/RSS feeds, YouTube transcripts, owned content and licensed data.
2. Classify and enrich sports content using AI across source type, topic, sport, rights status, content style, entity, timeline and editorial purpose.
3. Transform approved source intelligence into governed articles, rewrites, translations, social images, captions, short scripts, voiceover and export-ready assets.
4. Maintain provenance, rights context, content creator style, quality checks, review state and export status across every generated derivative.
5. Reduce manual production effort while allowing content creators to remain the expert voice in their field.

### 1.2 Product Evolution

**LoopFeed** provides a more compliant and reliable ingestion route for third-party platform content, including YouTube and X/Twitter, using official APIs where available. In the Planet Sport AI Studio architecture, LoopFeed should act as a trusted source gateway, recording source type, API route, permission basis, metadata and downstream use restrictions.

**CrowdyNews** provides the real-time sports and social aggregation layer. Its value is in identifying emerging narratives, fan conversation, breaking stories, social signals and source material during live sports moments.

**CrowdyAI** adds AI classification and sports intelligence, including multi-dimensional content classification, sports relevancy scoring, entity resolution, match/content temporal association, trend detection and moderation.

**Plexa Studio** becomes the production layer. It turns approved source intelligence into articles, rewrites, translations, social posts, social images, News Shorts, podcast/audio scripts, video scripts, captions, subtitles, export XML/JSON and library assets.

**Planet Sport AI Studio** is the broader strategic direction: a rights-aware AI production platform for Planet Sport brands, partner publishers and content creators.

### 1.3 Baseline Knowledge

At project inception, the following represented available tools and techniques:

**Generic AI tools:** OpenAI and other model APIs could draft text, classify content, summarise, translate or generate images, but they did not preserve source provenance, rights status, content creator style, approval state or export readiness.

**CMS and editorial systems:** Content management systems could store and publish articles/assets, but did not coordinate AI transformation across articles, social images, audio/video scripts, translations and feed exports.

**Translation and media APIs:** DeepL, Runway, ElevenLabs, Apify and related tools provided isolated capabilities, but required orchestration, validation, review and rights-aware workflow integration.

**Feed importers:** XML/RSS and platform-data importers could acquire content, but did not normalise source material into one governed editorial production model.

**AI coding tools:** Cursor, Lovable, OpenClaw and similar tools opened up faster prototyping and product-led coding, but did not remove the technical uncertainty of making the system reliable, governed and production-ready.

The competent professionals could not readily deduce how to combine these components into a single rights-aware editorial production system that preserved provenance, quality, review state and export readiness across multiple content formats.

## 2. Technological Uncertainties Addressed

### 2.1 Rights-Aware Source Provenance

**Uncertainty**

It was not known how to preserve source rights, licence status, permission basis and source evidence through multiple AI-generated derivative outputs.

**Technical Challenge**

A single story may combine Opta data, official racing data, Alamy imagery, owned Planet Sport content, LoopFeed platform data and publisher-permitted feeds. Each derivative output may have different reuse and export constraints. It is not sufficient to attach a simple source note after generation; the rights context must travel through transformation and export.

**Resolution Approach**

The team is developing source models, metadata fields, review states and export restrictions that can travel with articles, scripts, social images, translations and feed output. The Article Studio, Language Studio and YouTube transcript workflows provide early routes for capturing source material, generated outputs and review state.

**Advancement Achieved**

The expected advancement is a rights-aware content graph that treats provenance as part of the production workflow rather than an after-the-fact compliance note.

### 2.2 Multi-Format AI Transformation

**Uncertainty**

It was not known whether one approved source could be transformed into multiple platform-specific outputs while preserving facts, quotes, tone, content creator style and rights metadata.

**Technical Challenge**

AI models can generate individual drafts, but outputs diverge across articles, captions, scripts, thumbnails, translations and voiceover when there is no shared context and validation layer. Sports content increases the challenge because quotes, scores, fixtures, injuries, transfers and regulated terms must be preserved accurately.

**Resolution Approach**

The system uses content style, sport, source brand, content creator profile, editorial guidelines, protected terms and review state to shape each transformation. Article Studio and Language Studio now provide workflows for rewrite, translation, YouTube transcript article generation, review queues and export.

**Advancement Achieved**

The expected advancement is a governed production workflow that can reuse source intelligence across formats while keeping editorial control visible.

### 2.3 Heterogeneous Ingestion Pipeline

**Uncertainty**

It was not known how to normalise fundamentally different source types into one editorial workflow without losing metadata or creating parsing failures.

**Technical Challenge**

YouTube transcripts, official APIs, XML/RSS feeds, HTML pages, owned archives and licensed sports data all have different structures, error modes, rate limits and rights assumptions. Previous work has already shown issues such as transcript source variation, Apify actor differences, malformed HTML/XML content and "Maximum nested tags exceeded" parser errors.

**Resolution Approach**

The team has tested transcript import, Apify/YouTube routes, HTML page extraction, XML parser safeguards, Language Studio import flows and source-brand parser settings. The product has begun separating HTML-page parsing from XML/RSS parsing and routing YouTube transcripts into Article Studio and Language Studio review flows.

**Advancement Achieved**

The expected advancement is a more flexible ingestion architecture that records source type and can route content into Article Studio, Language Studio, review queues and exports.

### 2.4 AI Editorial Repair And Learning

**Uncertainty**

It was not known how to let AI fix quality issues while showing changes for approval and preventing repeated mistakes.

**Technical Challenge**

AI fixes can alter facts, quotes, dates or tone. Human editors need visibility before changes are accepted, and the system needs to learn from approved corrections. Without this, teams repeatedly fix the same problems manually and cannot build reliable editorial memory.

**Resolution Approach**

The product direction uses reviewable changes, quality checks, knowledge files and editorial guardrails so AI repair is auditable rather than silent. Failed outputs, rejected fixes, repeated article body issues and parser failures should become structured evidence and reusable knowledge.

**Advancement Achieved**

The expected advancement is a human-in-the-loop repair workflow where failures and fixes become reusable product knowledge.

### 2.5 Toolchain And API Orchestration

**Uncertainty**

It was not known how to combine Cursor-assisted development, model APIs, specialist media APIs, official platform feeds and internal Planet Sport systems into a stable production workflow.

**Technical Challenge**

Tools such as Cursor, Lovable, OpenClaw, OpenAI, DeepL, Runway, Apify and LoopFeed accelerate experimentation, but production systems still require validation, retry handling, cost control, source governance and export reliability. Rapid prototyping does not automatically create a reliable operating system.

**Resolution Approach**

The team is testing tools and APIs as modular capabilities while keeping Plexa responsible for orchestration, review, source memory and production state. Cursor has materially changed the speed at which product people can test ideas and resolve problems, but the R&D focus remains the non-readily deducible system design and validation.

**Advancement Achieved**

The expected advancement is a platform architecture where external AI/API providers are replaceable capability layers rather than the product's core defensibility.

### 2.6 Platform Evaluation And SME Toolchain Economics

**Uncertainty**

It was not known which combination of new AI development platforms, creative tools and API services could deliver governed, multi-format sports media production at the scale and cost structure of a small enterprise such as Planet Sport — without defaulting to expensive enterprise creative suites or opaque all-in-one SaaS products that could not be integrated into a rights-aware workflow.

**Technical and commercial challenge**

A wave of new platforms has changed how product and engineering teams experiment:

| Category | Platforms evaluated / in use | Role in Plexa R&D |
|----------|------------------------------|-------------------|
| **AI-assisted development** | Cursor, Lovable, OpenClaw | Faster prototyping, debugging and iteration on non-routine integration problems; product-led validation before production hardening |
| **Foundation models** | OpenAI and compatible model APIs | Article generation, classification, fact-check assistance, editorial repair, image prompts |
| **Translation** | DeepL (and workflow-ready alternatives) | Market-local output with glossary and protected-term governance |
| **Video / image AI** | Runway, Apify actors, in-house HTML scene render | Short-form video, thumbnails, template studios (Team Line Up, Score Line, etc.) |
| **Voice / audio** | ElevenLabs | Voiceover, News Shorts, racing templates |
| **Data / ingestion** | LoopFeed, Apify, Sport365/WhoScored/FotMob parsers, SixLogics | Heterogeneous source normalisation into MIO |
| **Enterprise creative suites** | Adobe Creative Cloud (e.g. After Effects, Premiere, Express at scale) | **Evaluated and rejected for core workflow** — per-seat and suite pricing prohibitive for a small enterprise running many experimental production paths |

Planet Sport is not a large broadcaster with dedicated design, motion and engineering teams on enterprise tool contracts. The R&D question is therefore not only technical (“can AI generate this asset?”) but economic and architectural: **can we assemble equivalent production capability from composable APIs and owned orchestration at SME cost?**

**Example — Adobe rejected on cost and fit**

Adobe was trialled as a conventional route for video, motion graphics and brand asset production. For Planet Sport's scale:

- Per-seat Creative Cloud licensing does not scale economically across editorial, product and experimental R&D users.
- Workflow is optimised for manual creative production, not governed AI ingestion → fact-check → publish pipelines.
- Export and automation paths do not align with Plexa's need for rights metadata, review state and feed export in one system.

The abandoned Adobe-centric route is **qualifying R&D evidence**: a competent professional could not readily deduce that enterprise creative software alone would solve multi-format AI production for an SME publisher; systematic evaluation was required.

**Resolution approach**

The team is weaving new platforms into Plexa as **replaceable capability layers**, not as the product itself:

1. **Cursor** — accelerates investigation of parser failures, API integrations, MIO assembly, render pipelines and fact-check logic; reduces time from hypothesis to testable prototype; R&D value is in the non-routine problems solved, not routine typing.
2. **Lovable** — used to build **app-level prototypes** (workflow UIs, editorial tools, studio shells) quickly; multiple **Lovable projects** explore product concepts around apps before production hardening in the Plexa repo; outcomes are compared against governance, persistence, rights and export requirements.
3. **Model and media APIs** — selected per task with cost, latency, quality and rights constraints recorded; failures and substitutions are logged.
4. **Owned Plexa orchestration** — Language Studio, Match Report Builder, template studios and export paths remain the system of record; external tools do not hold provenance or approval state.

**Headcount and the prior R&D cycle**

In the previous R&D claim period, Planet Sport relied more heavily on **technicians and specialists** to build prototypes, wire feeds, maintain security baselines and produce design assets. The current cycle investigates whether **Cursor + Lovable + Plexa** can achieve equivalent or greater output with a **smaller team** — not by removing human expertise, but by removing repetitive technical mechanics. That shift is itself uncertain and must be evidenced: which Lovable app experiments graduated to production, which were discarded, and where manual technicians are still required.

**Platform case studies (see Section 6)** should be maintained for each tool that materially advances R&D — Cursor, Lovable app projects, OpenAI/DeepL, Runway, ElevenLabs, and Plexa as the trust layer.

**What is qualifying R&D vs routine tool use**

| Activity | Typical treatment |
|----------|-------------------|
| Using Cursor to fix a typo or restyle a button | Routine development |
| Using Cursor to debug Sport365 parser shape drift, design MIO section registry, or prototype preview publish gates | Qualifying investigation |
| Subscribing to OpenAI and calling chat completion | Routine once approach is settled |
| Comparing models/prompts for fact-check accuracy, editorial score calibration, hallucination rates | Qualifying experimentation |
| Buying Adobe for one editor | Commercial procurement |
| Evaluating Adobe vs API-first render + template studios; documenting rejection on cost/integration grounds | Qualifying platform evaluation |

**Advancement achieved (expected)**

A documented **SME-viable toolchain strategy**: enterprise creative suites are not required for governed multi-format output when composable AI APIs, AI-assisted development tools and an owned orchestration layer are combined — but only after systematic trial, cost analysis and integration testing. Abandoned platforms (including Adobe) and retained platforms (Cursor, Lovable, OpenAI, Runway, ElevenLabs, etc.) should both appear in the evidence pack.

**Evidence to keep**

- Platform trial notes (what was tested, duration, outcome).
- Cost comparisons (Adobe/seat-based tools vs API usage meters).
- Screenshots or exports from Lovable/Cursor prototypes superseded by production code.
- API bills, rate-limit errors and model swap decisions.
- Gateway R&D entries recording “tried X, blocked because Y”.

### 2.7 Productionisation And Distributed Team Adoption

**Uncertainty**

It was not known how to move from fast AI-assisted prototypes (Cursor, Lovable, model APIs) to **production-grade** Plexa workflows when adoption spreads beyond a single engineering group — including product leadership and distributed development teams in South Africa — without losing governance, security discipline or release quality.

**Technical and organisational challenge**

New platforms have lowered the barrier to building demos. The harder R&D problem is **productionisation**:

- Prototypes that bypass review gates, environment controls or secrets management must be hardened or discarded.
- **Nik Keene**, **David Jarrett** and the **South Africa development team** now use Cursor, Lovable and Plexa-connected AI tooling alongside UK product and engineering — multiplying the number of people who can spin up integrations, scripts and cloud resources.
- What works in a local experiment does not automatically survive multi-user, multi-region, rights-aware production.

**Resolution approach**

- Plexa remains the system of record; experiments must graduate into governed code paths with tests, review and deployment controls.
- Shared engineering standards across UK and SA teams for env vars, API keys, branch workflow and admin access.
- Gateway R&D evidence captures “prototype → production” gaps and manual steps still required before publish.

**Advancement achieved (expected)**

A repeatable path from AI-accelerated prototype to production workflow that distributed teams can follow without each person inventing their own toolchain or cloud setup.

### 2.8 AI-Era Security — Technical Controls And Human Factor

**Uncertainty**

It was not known how to adopt powerful AI development and automation platforms while preventing credential leakage, unauthorised cloud provisioning and social-engineering attacks — especially when **the human operator is the most vulnerable control point**, not only the server.

**Technical challenge**

AI-assisted tools can move faster than security policy: agents and assistants may suggest or execute actions involving API keys, environment files and cloud infrastructure. Planet Sport has already experienced a **security incident** in which AI-platform-related activity contributed to **exposed credentials and unauthorised AWS environment creation**. That incident is qualifying R&D evidence: it proved that default tool behaviour and informal experimentation are insufficient for a publisher handling licensed data and production keys.

Security in an AI-heavy stack must intensify on **two axes**:

| Axis | Risk | Response (in progress) |
|------|------|-------------------------|
| **Technical** | Keys in prompts/repos, rogue cloud resources, weak auth | Secrets rotation, least-privilege IAM, environment separation, mandatory **2FA**, technical lockdown led with **Transfon**, **Venture DK** and the internal technical team |
| **Human** | Phishing, rushed approvals, pasting secrets into chat, trusting AI output | Staff training and simulation via **Mimecast**; clear rules for what may never enter an AI session; human-in-the-loop for production changes |

**Resolution approach**

1. **Contain AI tooling** — no production keys in Cursor/Lovable/chat contexts; scoped dev credentials; audit what AI agents can reach.
2. **Mandatory two-factor authentication (2FA)** — treated as non-negotiable for admin, cloud, repo and AI platform accounts.
3. **Partner-led security operations** — Transfon and Venture DK working with Planet Sport technical leadership to lock down infrastructure and monitor exposure.
4. **Human-factor programme** — Mimecast (or equivalent) phishing simulation and training so editorial, product and engineering staff recognise attacks that target AI-curious workflows.
5. **Incident-driven hardening** — post-breach runbooks, key rotation evidence, AWS environment reviews and blocked automation patterns documented for R&D file.
6. **Structured incident and vulnerability logging** — every security event recorded via Gateway R&D templates on `/admin/reports` (see below). This is not optional paperwork; it is **qualifying evidence** of non-routine technological uncertainty in the AI era.

### Security incident logging — why this belongs in the R&D file

UK R&D relief rewards **systematic investigation** when outcomes are uncertain. Security failures in AI-assisted development are **not routine IT tickets** for Planet Sport: they demonstrate that competent professionals could not readily deduce safe operating boundaries for tools such as Cursor, Lovable and cloud-connected agents **before** incidents occurred.

A dated **security incident and vulnerability log** records:

| What the log captures | Why it belongs in R&D evidence |
|-----------------------|--------------------------------|
| Real incidents (e.g. credential exposure, unauthorised AWS provisioning via AI tooling) | Technological uncertainty was genuine, not theoretical |
| Root-cause analysis and failed prior assumptions | Systematic work to resolve uncertainty |
| Remediation experiments (2FA rollout, secrets policy, agent boundaries, Mimecast, Transfon, Venture DK) | Investigation and iteration, not only hygiene |
| Open vulnerabilities still being addressed | Work continues; not all problems are solved |

SME publishers adopting AI dev platforms face **novel vulnerability classes** that legacy security guidance barely covers:

- API keys and env files pasted into AI chat or agent context.
- AI assistants suggesting or executing cloud provisioning outside approved pipelines.
- Phishing targeted at staff experimenting with new tools.
- Cross-border teams (UK + South Africa) with inconsistent security habits.

Documenting these patterns — **redacted for external sharing, detailed internally** — records what **actually broke** and what was tried next. The answer is not “don’t use AI,” but **document vulnerabilities, remediate systematically, and build control layers like Plexa**.

**Logging standard (use Gateway template “Security incident & vulnerability log”):**

1. **Detect** — what happened, when, which platform (Cursor/Lovable/AWS/repo/AI API).
2. **Classify** — human factor vs technical vs process gap; severity (low/medium/high/critical).
3. **Vulnerability** — what control failed or did not exist yet.
4. **Remediate** — actions taken; partners involved (Transfon, Venture DK).
5. **Prevent** — policy, 2FA, training (Mimecast), engineering change.
6. **R&D link** — which uncertainty (Section 2.8) this informs.

*Where legal or regulatory notification is required (e.g. personal data breach under UK GDPR), logging here **supplements** but does not replace formal obligations to ICO, insurers or counsel.*

**What is qualifying R&D**

| Activity | Typical treatment |
|----------|-------------------|
| Turning on 2FA for one user | Routine IT hygiene |
| Designing secrets policy for AI dev tools after a credential incident; testing agent boundaries | Qualifying investigation |
| Mimecast phishing campaign | Security operations (supporting evidence for human-factor uncertainty) |
| Logging a security incident with vulnerability class, root cause and remediation in the R&D evidence register | Qualifying — documents uncertainty and systematic response |
| Annual penetration test with no incidents | Routine (unless testing novel AI attack vectors with documented failures) |

**Advancement achieved (expected)**

A documented **AI-safe development and operations model** for SME publishers: fast AI platforms for investigation, strict human and technical gates for production — informed by a real incident, not theoretical best practice.

**Evidence to keep**

- Incident timeline and remediation notes (redacted for external sharing).
- Key rotation and AWS cleanup records.
- 2FA rollout status across teams (UK product, SA development).
- Mimecast training completion and phishing simulation results.
- Transfon / Venture DK security review outputs.
- Policy: what staff may and may not paste into AI tools.
- **Security incident & vulnerability register** — Gateway entries with incident ID, severity, platform vector, remediation status (ongoing internal register).

### 2.9 AI Trust, Hallucination And The Plexa Control Layer

**Uncertainty**

It was not known whether sports publishers could use generative AI in production when **models still hallucinate frequently** and are **not inherently trusted** by editorial staff, readers or regulators — without a dedicated control layer that constrains output to **licensed data**, **owned content** and **approved sources**.

**Technical challenge**

Raw AI can invent scores, quotes, injuries and odds. A competent professional could not assume that prompting alone would make output publishable. Plexa exists to answer: **who owns this sentence, which tier of data supports it, and has a human approved it?**

**Resolution approach**

- **Tiered source hierarchy** — Tier 1 match data cannot be overridden; narrative layers must be evidence-backed.
- **Fact-check and editorial score gates** — block or flag publish when fabrication risk is high.
- **Licensed data and content ownership** — Opta/SixLogics, Alamy, owned Planet Sport archive; provenance travels with derivatives.
- **Review queues** — nothing export-ready without explicit approval state.
- **Creator profiles** — human expertise remains visible; AI assists mechanics, not voice.

**Advancement achieved (expected)**

A **trusted production layer** above commodity models: AI speed with publisher-grade control — the moat is governance, not the LLM.

### 2.10 Human Adoption And Role Anxiety

**Uncertainty**

It was not known how to deploy AI production tools when **many humans fear role erosion or replacement** — leading to passive resistance, shadow IT, or refusal to adopt workflows that would otherwise reduce repetitive work.

**Organisational challenge**

Editors and creators hear “AI will do your job.” In practice, Planet Sport's direction is **creator-scale leverage**: experts stay the voice; Plexa removes reformatting, resizing, translation mechanics and multi-platform duplication. But that message only works if:

- Changes are **visible and reviewable** (diffs, not silent rewrites).
- **Credit and bylines** remain with creators.
- Training explains **what AI does not do** (judgement, trust, accountability).
- Job design emphasises **higher-value work** unlocked by tooling.

**Resolution approach**

- Human-in-the-loop repair and publish gates.
- Editorial calibration that privileges quality over automation.
- Change management alongside Mimecast-style security training — adoption is a human R&D problem, not only a technical one.

**Evidence to keep**

- Staff feedback sessions, adoption blockers, workflows still done manually “because AI isn't trusted.”
- Gateway R&D notes on resistance themes and mitigations tried.

### 2.11 Legal, Ethical And GDPR Boundaries For Generative Media

**Uncertainty**

It was not known which AI media capabilities are **lawful, ethical and compliant** for a UK/EU-facing publisher when tools can **turn a still image into motion video**, **clone a voice**, or **manipulate likeness** — and when **GDPR** applies to personal data in feeds, voice models, logs and training context.

**Legal and ethical challenge**

| Capability | Example risk | Plexa R&D response |
|------------|--------------|-------------------|
| Image → motion video | Rights in source image; misleading manipulation | Licensed/owned assets only; review before publish; provenance record |
| Voice synthesis / clone | Personality rights, consent, deepfake harm | ElevenLabs with licensed scripts; no cloning of real individuals without rights basis |
| Synthetic quotes or events | Defamation, betting integrity | Fact-check against Tier 1 data; fabrication gates |
| **GDPR** | Personal data in lineups, logs, prompts, voice | Data minimisation, retention policy, DPA with processors, EU/UK lawful basis documentation |

These are **non-routine** questions accelerated by fast-moving AI — not settled by buying a tool subscription.

**Resolution approach**

- Rights-aware content graph: record permission basis before derivative export.
- Legal review checkpoints for new media types (motion from image, synthetic voice).
- GDPR: map what personal data enters Plexa, LoopFeed, AI APIs; document subprocessors and retention.
- Ethical red lines documented (e.g. no deceptive synthetic presenter content without disclosure).

**Evidence to keep**

- Legal/ethics review notes (redacted externally as needed).
- GDPR processing records updates when new AI features ship.
- Blocked features where lawful basis was unclear.

## 3. Outcomes and Learnings

### 3.1 Technical Outcomes

1. **Article Studio:** Central hub for import, rewrite, translation, YouTube transcripts, News Shorts and review queue workflows.
2. **Language Studio governance:** Source brands, content creators, guardrails, knowledge files, glossary, protected terms, market rules, quality checks and export feeds.
3. **YouTube/script pipeline:** Metadata, transcript import, AI output generation and article creation from video source material.
4. **R&D evidence loop:** Failures, parser errors, AI limitations, prompt tests, API barriers, **abandoned platform trials (e.g. Adobe on cost/fit grounds)** and manual bottlenecks are treated as learning evidence.
5. **Product positioning:** Plexa / Planet Sport AI Studio is framed as an AI-native editorial operating system, not an AI wrapper.
6. **SME toolchain strategy:** Cursor, Lovable and composable AI/media APIs are woven into development and production; enterprise creative suites evaluated and rejected where cost and governance fit fail.
7. **Distributed adoption:** Nik Keene, David Jarrett and SA development teams use AI dev platforms alongside UK product/engineering; productionisation is the critical path.
8. **AI-era security programme:** Incident-driven hardening — 2FA, Mimecast human-factor training, Transfon/Venture DK technical lockdown, secrets policy for AI tooling.
9. **Trust layer (Plexa):** Fact-check, licensed data, owned content, review gates — raw AI not trusted for publish without control.
10. **Adoption and ethics programme:** Human role anxiety addressed through visible review; legal/GDPR boundaries for motion, voice and manipulation.

### 3.2 Knowledge Contribution

The R&D is establishing new approaches and techniques for:

- Sports-specific prompt and workflow design for article, rewrite, translation, social and script generation.
- Source and rights metadata patterns for AI-assisted publishing workflows.
- HTML/XML/transcript ingestion safeguards for inconsistent third-party source formats.
- Review queue and quality-check patterns for human-in-the-loop AI production.
- Evidence discipline for accountants and R&D tax experts, including failures, abandoned approaches and barriers.
- **Platform evaluation methodology** for SME publishers: AI dev tools (Cursor, Lovable), composable APIs vs enterprise creative suites (Adobe rejected on cost/integration grounds).
- **Productionisation patterns** for distributed teams moving from AI prototype to governed release.
- **AI-safe operations** combining technical controls (2FA, IAM, secrets) with human-factor training (Mimecast) after real credential/cloud incidents.
- **Trust and hallucination control** patterns for publishers — why orchestration beats raw model output.
- **Change management** for AI adoption when staff fear role loss.
- **Legal/ethical/GDPR frameworks** for image-to-video, voice synthesis and synthetic media in sports publishing.

### 3.3 Evidence To Keep

The evidence pack should capture:

- Failed prototypes, abandoned approaches and barriers encountered.
- Prompt/model tests, validation failures and hallucination controls.
- Parser, import, transcript and feed errors.
- Rights/provenance schema iterations and export restrictions.
- Latency, cost, retry, queue and export reliability measurements.
- Human review feedback and manual production steps removed.
- **Platform evaluation records:** Cursor/Lovable prototype iterations, Adobe and other suite trials, API cost comparisons, rejected vendors.
- **Security and productionisation:** incident remediation notes, 2FA rollout, Mimecast training records, AWS cleanup, AI secrets policy, Transfon/Venture DK review outputs.
- **Platform case studies** (Section 6): Cursor, Lovable app projects, media APIs, Plexa trust layer — dated before/after headcount or technician effort.
- **Adoption and legal:** staff feedback on AI fear, legal review outcomes, GDPR impact notes for new features.

R&D is not always about successful outcomes. Failed imports, broken parsers, unsuitable model outputs, rejected prompts, rights barriers, API limits and manual bottlenecks are important evidence because they show the technical uncertainty and systematic work needed to reach a working solution.

## Report Note

This report is intended for review with Launch Accounting and R&D tax specialists. It should be supported by dated engineering notes, screenshots, commits, failed test records, API/error logs, prompt iterations and evidence from competent professionals.

## Tools, Collaborations And API Context

The current wave of AI tools and APIs has opened up creativity for product and editorial teams — especially for **small enterprises** that previously could not afford large engineering and creative departments on enterprise tool contracts.

### New platforms in the Plexa R&D story

Planet Sport has systematically evaluated and woven in:

- **Cursor** — AI-assisted development; product and engineering can test integrations, parsers and workflows far faster than traditional cycles.
- **Lovable** — rapid app/UI prototyping; concepts are validated before production hardening in the main repo.
- **OpenClaw** and similar agents — experimentation with automated task flows (orchestration remains in Plexa).
- **OpenAI and model APIs** — generation, classification, fact-check assistance, editorial repair.
- **DeepL** — translation with glossary and governance hooks.
- **Runway, ElevenLabs, Apify** — video, voice and ingestion experiments.
- **LoopFeed and data parsers** — official and licensed source routes.

**Rejected or deprioritised:** **Adobe Creative Cloud** and comparable per-seat enterprise creative suites — trialled but **not adopted as the core production stack** because licensing cost is prohibitive for Planet Sport's scale and the tools do not natively support rights-aware, review-gated, multi-format export in one orchestration layer. Building template studios, HTML scene render and API-driven media inside Plexa is the alternative under investigation.

This is not an anti-Adobe statement; it is **R&D evidence** that competent professionals had to investigate whether SME-viable production could be achieved without defaulting to enterprise creative software — and could not deduce the answer without trial.

Tools such as Cursor, Lovable, OpenClaw, OpenAI, DeepL, Runway, Apify and specialist data APIs allow product people, editors and engineers to test workflows much faster than before.

This matters because the innovation process itself has changed:

- Product people can now prototype and test ideas directly.
- Engineers can resolve integration and debugging issues faster.
- Editorial teams can see working tools earlier.
- AI can help generate, inspect and repair code.
- APIs can be combined into new production workflows.
- The gap between idea and working prototype is much smaller.

However, using these tools is not in itself the R&D. The R&D lies in the non-routine technical uncertainty of combining them into a reliable, governed, rights-aware production architecture — and **productionising** them safely when adoption spreads across UK product leadership (including Nik Keene and David Jarrett) and **South Africa development teams**.

### Productionisation is the bottleneck

Cursor and Lovable shrink the gap from idea to prototype. The remaining uncertainty is how to harden those prototypes into Plexa production: review gates, tests, secrets management, export reliability and multi-user discipline. Demos are not deliverables.

### Security after a real incident

Planet Sport has learned that AI platforms amplify both speed and risk. A security incident involving **AI-related credential exposure and unauthorised AWS environment creation** demonstrated that technical controls alone are insufficient — **humans are the vulnerable control point** when keys are pasted into chats, agents are over-permissioned or phishing targets AI-curious staff.

The response is layered:

- **Technical:** Transfon, Venture DK and the internal technical team locking down infrastructure; mandatory **2FA**; secrets rotation; least-privilege cloud access; policies for what AI tools may never see.
- **Human:** Mimecast phishing simulation and training so editorial, product and engineering staff treat AI-assisted workflows with the same scepticism as email and links.

This incident and remediation are **qualifying R&D evidence** — they show non-routine uncertainty about operating AI-accelerated development safely at SME scale.

### Why Plexa — AI is fast but not trusted

Generative AI **still hallucinates**. Editorial teams, readers and regulators do not trust raw model output for sports news. Planet Sport's R&D therefore centres on **Plexa as the control layer**:

- **Licensed data** (e.g. Opta/SixLogics) and **owned content** as the factual anchor.
- **Content ownership and provenance** recorded through transformation and export.
- **Fact-check, editorial score and review queues** before publish.
- Creators remain the accountable voice; AI handles production mechanics.

Without this layer, faster tools (Cursor, Lovable, OpenAI) would increase risk, not value.

### Human adoption — fear of replacement

A major non-technical uncertainty is **human resistance**: staff worry roles will be eroded or taken over. R&D must record how workflows are designed so experts **gain leverage** (more formats, faster turnaround) without silent replacement — visible diffs, bylines, creator profiles and editorial judgement still required.

### Legal, ethical and GDPR pressure

AI can turn an image into motion video or synthesise voice. It is **uncertain** which uses are lawful and ethical for a publisher — personality rights, misleading manipulation, betting integrity, and **GDPR** for personal data in squads, logs and voice pipelines. Plexa must gate features until rights basis and compliance are clear. This area of R&D is **more relevant than ever** as technology outpaces regulation and newsroom norms.

### R&D acceleration vs the previous claim cycle

On the **last R&D claim**, Planet Sport typically needed **technicians** to build prototypes, manage feeds, maintain security and produce designs. This cycle tests whether **Cursor**, **Lovable app projects** and AI APIs let a **smaller distributed team** achieve the same goals **despite reduced headcount** in traditional technical roles — with evidence that prototypes were productionised, not abandoned demos. Tech is moving faster; the qualifying work is proving **governed production** at that speed.

The defensible work is the orchestration layer:

- Which source should be trusted?
- What rights status does it carry?
- Which AI model should be used for which task?
- How are generated outputs validated?
- How are quotes preserved?
- How are fixes reviewed?
- How are lessons stored for future runs?
- How does content move from import to review to export?
- How do creators keep control of their voice and expertise?

## UK Research And Innovation Context

UK AI commercialisation research repeatedly highlights several themes that align with Plexa Studio:

- AI creates value when applied to a real industry problem.
- Sector-specific data is a major commercialisation enabler.
- AI adoption requires teams with both technical and sector expertise.
- Trust, explainability and standards are critical for adoption.
- Creative industries and createch are areas of UK strategic interest.
- Compute, data and commercial adoption are central to UK AI policy.

Plexa Studio aligns with this policy context because it is not a generic chatbot. It is applied AI for sports media, publishing and creator production.

Potential UKRI / Innovate UK themes include:

- Creative industries innovation.
- Applied AI adoption.
- Createch and content production.
- Rights-aware AI workflows.
- Human-AI collaboration.
- Provenance and content authenticity.
- AI tools for creator productivity.
- Knowledge Transfer Partnerships around AI evaluation, provenance, multimodal workflows or editorial governance.

## UK R&D Tax Credit Context

For accounting periods beginning on or after 1 April 2024, UK R&D relief operates through the merged R&D expenditure credit scheme for eligible companies, with enhanced R&D intensive support available for certain loss-making R&D-intensive SMEs.

HMRC also requires an Additional Information Form to be submitted before or on the same day as the Company Tax Return. Any formal claim should be prepared and reviewed by Planet Sport's tax advisers.

For Plexa / Planet Sport AI Studio, the R&D claim narrative should not be "we used AI tools". Instead, it should focus on whether competent professionals faced scientific or technological uncertainty that could not be readily deduced from public knowledge or routine engineering.

## Proposed R&D Project

### Project Title

Rights-Aware AI Editorial Production Architecture for Sports and Media Content

### Main Field Of Science Or Technology

Software engineering and computer science, specifically:

- Applied AI systems.
- Distributed content ingestion.
- AI-assisted editorial workflows.
- Rights-aware data modelling.
- Multimodal content transformation.
- Real-time sports intelligence.
- Validation and provenance systems.
- Export pipeline reliability.

### Scientific Or Technological Advance Sought

The project seeks to determine whether it is technically feasible to build an AI-native editorial production system that can transform heterogeneous sports and media source intelligence into governed, reusable, multi-format outputs while preserving:

- Source provenance.
- Rights and permission status.
- Factual accuracy.
- Quote integrity.
- Content creator style.
- Editorial guidelines.
- Review state.
- Export readiness.
- Cross-format consistency.

This goes beyond normal CMS development or basic AI integration. The advance lies in coordinating multiple AI services, source systems, rights layers, editorial rules and content formats into a single production architecture.

## Baseline Knowledge And Limitations

At the start of the project, several individual capabilities existed:

- CMS platforms for article management.
- Social publishing tools for scheduling content.
- AI tools for generating text or images.
- Translation APIs.
- Transcription APIs.
- RSS/XML feed ingestion.
- Sports data feeds.
- Image libraries.
- Browser-based AI coding tools.

However, these systems generally operate in isolation. They do not provide an integrated method for:

- Tracking rights provenance from source to derivative asset.
- Combining licensed data, owned content, official APIs and publisher feeds.
- Preserving editorial memory across AI runs.
- Showing AI repairs as reviewable changes.
- Learning from approved editorial fixes.
- Creating linked article, social image, video script, audio and export assets from one source.
- Maintaining creator identity and voice across formats.
- Automating export without losing approval and compliance state.

Generic AI tools can generate useful drafts, but they do not reliably solve the publisher production problem.

## Candidate Technological Uncertainties

### 1. Rights-Aware Content Graph

It is uncertain how to model source material, licence status, permissions, derivative outputs and export restrictions in a way that remains reliable across articles, images, social posts, video scripts, audio outputs and feed exports.

This requires more than tagging a piece of content. The system must preserve provenance through transformations and combinations of sources.

### 2. AI Editorial Repair With Human Approval

It is uncertain whether AI can identify and fix editorial quality issues while:

- Preserving facts and quotes.
- Showing changes clearly.
- Waiting for human approval.
- Learning from approved fixes.
- Avoiding hallucination.
- Avoiding repeated mistakes.

This requires iterative experimentation with prompts, validation, diffing, review state and knowledge file updates.

### 3. Multi-Format Transformation Consistency

It is uncertain whether one approved source can be transformed into multiple platform-specific assets while maintaining factual consistency, tone, rights status and creator style.

The challenge is not producing one output. The challenge is keeping all outputs aligned.

### 4. Heterogeneous Ingestion And Normalisation

It is uncertain how to normalise sources including YouTube transcripts, official APIs, XML/RSS feeds, HTML pages, owned archives, licensed data and social feeds into one consistent editorial workflow.

Previous work has already shown parsing and ingestion complexity, including feed errors, transcript extraction differences and inconsistent metadata.

### 5. Creator-Scale Automation

It is uncertain how to reduce manual production effort while keeping content creators in control of their expertise, voice, face, tone and approval.

The goal is not replacing creators. The goal is giving them the production leverage to build a larger digital footprint.

### 6. Toolchain Orchestration

It is uncertain how to combine Cursor-assisted development, AI app builders, model APIs, specialist media APIs, official feeds and internal systems into a stable production workflow.

Rapid prototyping is easier than before, but productionising the outcome remains technically complex.

## Qualifying Activities To Evidence

A future R&D file should capture evidence such as:

- Failed prototypes and abandoned approaches.
- Prompt and model comparison tests.
- Parser and ingestion failures.
- Transcript import issues and fallback handling.
- AI output validation problems.
- Rights/provenance schema iterations.
- Editorial diff and approval experiments.
- Export feed reliability issues.
- Performance, latency and cost measurements.
- Human review findings.
- Content creator feedback.
- Use of Cursor or similar tools to debug, inspect and iterate on non-routine problems.
- **Platform trials and rejections** (e.g. Adobe cost/fit analysis, Lovable prototype superseded by production build).
- **Security incident remediation** — credential rotation, AWS cleanup, 2FA enforcement, Mimecast training, AI secrets policy.
- **Platform case studies** — Cursor, Lovable app projects, trust-layer outcomes, headcount vs prior technician-led cycle.
- **Legal/ethics/GDPR reviews** for motion-from-image, voice synthesis, personal data in AI pipelines.
- **Human adoption evidence** — staff feedback on role anxiety and trust in AI output.
- **Security incident & vulnerability register** — dated Gateway entries with severity, platform vector, root cause, remediation (redact sensitive detail for external sharing).

The evidence should distinguish between:

- Qualifying technical investigation.
- Routine UI development.
- Content writing.
- Commercial planning.
- Marketing.
- Normal API configuration.

## Expected Outcomes

The expected outcome is a platform that can:

- Ingest trusted source intelligence.
- Record source and rights status.
- Generate governed multi-format outputs.
- Preserve facts, quotes and editorial rules.
- Let AI fix quality issues with visible approval.
- Store lessons in knowledge files.
- Support content creator profiles.
- Produce social, image, video, audio and translation variants.
- Export approved content reliably.
- Give Planet Sport a defensible workflow layer above commodity AI models.

## Commercial And Strategic Impact

Plexa / Planet Sport AI Studio can help solve one of the biggest operational problems for publishers and content creators: the explosion of content types and platform requirements.

Instead of creators spending time manually reformatting, rewriting, resizing, translating and preparing content for different channels, the platform should handle production mechanics.

Creators can then focus on:

- Expertise.
- Opinion.
- Analysis.
- Personality.
- Story judgement.
- Audience trust.
- Brand authority.

This is the creative opportunity: remove repetitive production effort and give content creators the tools to build a trusted digital footprint at scale.

## R&D Roadmap

### Near Term

- Strengthen Article Studio and Language Studio workflows.
- Add clear source/rights status to imported content.
- Improve review queue counts and export visibility.
- Expand content creator profiles.
- Add AI change previews and approvals.
- Capture technical evidence during experimentation.
- **Productionise** Cursor/Lovable prototypes into governed Plexa releases (UK + SA teams).
- **Enforce 2FA** and AI secrets policy; continue Mimecast training; technical lockdown with Transfon and Venture DK.

### Next Phase

- Build rights-aware source citations.
- Add social image and thumbnail generation workflows.
- Add licensed image selection/change/delete options.
- Improve YouTube/API feed integration through LoopFeed.
- Add reusable prompt and quality rules.
- Create platform-specific output templates.
- Add export logs and retry handling.

### R&D Phase

- Develop an editorial agent framework.
- Build a rights-aware multimodal content graph.
- Add automated compliance and quality checks.
- Add creator identity tools across text, image, voice and video.
- Add performance analytics by content type and platform.
- Explore academic / UKRI collaboration around provenance, human-AI workflows and creative industry AI adoption.

## Summary Recommendation

Plexa / Planet Sport AI Studio should be positioned as an AI-native editorial operating system for sports and publisher teams.

Its competitive edge should come from:

- LoopFeed ingestion.
- CrowdyNews real-time aggregation.
- CrowdyAI sports intelligence.
- Licensed data and imagery.
- Owned Planet Sport content.
- Publisher-permitted feeds.
- Rights-aware provenance.
- Content creator memory.
- Human-in-the-loop AI repair.
- Multimodal production.
- Export reliability.

The opportunity is not to build another AI wrapper. The opportunity is to build the governed production layer that lets sports publishers and creators use AI safely, creatively and at scale.

## 4. Match Intelligence and Editorial Production R&D

### 4.1 Match Report Builder and Match Intelligence Object (MIO)

A major R&D workstream since 2025–2026 replaces the earlier “dump raw fixture JSON to OpenAI” approach with a governed, data-driven editorial pipeline.

**Technological uncertainties investigated:**

- Whether heterogeneous match sources (SixLogics core, Sport365, WhoScored, FotMob, LoopFeed, manual inputs, YouTube transcripts) can be normalised into one **Match Intelligence Object (MIO)** without sending raw feed JSON to AI models.
- Whether AI-generated match reports can be **fact-checked against a source hierarchy** (Tier 1 match events cannot be overridden; Tier 2 supplements; Tier 3 is narrative only when evidence-backed).
- Whether **editorial quality** can be scored objectively enough to gate publish (story, insight, tactical depth, brand fit, commercial balance) without blocking legitimate journalism.
- Whether **match previews** and **match reports** can share one intelligence layer (`matchPhase` + `contentType`) rather than diverging EIO/PIO systems.

**Resolution approach (in progress):**

- Linear wizard: editorial brief → match ID → incremental data layers → Build Picture → Player Intelligence → Image Intelligence → Media Builder → Fact Check → Editorial Score → Review → Publish.
- MIO registry with section builders (`foundation`, `significance`, `fixture_context`, `league_table`, `opta_players`, etc.) assembled per content type.
- Preview-specific gates: `preview-fact-check`, `preview-editorial-score`, `preview-publish-gate`, section lint.
- Report-specific gates: `report-section-lint`, `report-editorial-score`, repair-fact-check workflows.
- Significance engine: every article must answer why the match matters, not only what happened.

**Evidence to keep:** parser failures on Sport365/WhoScored/FotMob HTML, SixLogics shape mismatches, fact-check false positives/negatives, editorial score calibration runs, rejected publish gates, prompt iterations, and manual steps still required before publish.

**Primary documents:** see Section 6 — Match Report Builder R&D Plan, Match Intelligence Engine plan, Match Preview V1 spec, F365 editorial calibration, F365 preview scoring engine, Match Preview benchmark report.

### 4.2 Multi-Brand Football Editorial Calibration

Football365, TEAMtalk, Planet Football and Sport365 share infrastructure but require distinct brand voice, commercial posture and section structure.

**Uncertainty:** Whether one scoring and generation framework can enforce **editorial quality over commercial optimisation** while still supporting betting-integrated brands.

**Approach:** Authoritative calibration rules (`editorial quality > commercial optimisation`), weighted preview scoring dimensions, banned phrase lists, brand knowledge files, and creator DNA profiles.

**Documents:** Football365 Editorial Calibration, Football365 Preview 10/10 Scoring Engine.

## 5. Sport365 Visual Template and Data Studio R&D

Parallel R&D extends Planet Sport Studio beyond long-form articles into **rights-aware visual and short-form production** for football (and adjacent sports templates).

### 5.1 Template studios (2026)

| Studio | R&D focus |
|--------|-----------|
| **Team Line Up** | Formation layout, kit intelligence, player label positioning, Sport365 brand themes, export dimensions |
| **Team Sheet** | Squad list cards, national crest resolution, brand-specific typography |
| **Score Line** | Live/final score graphics, subtitle burn, card content modes |
| **Football Lineups** | Sport365 import pipeline, bundle build for render scenes |
| **Planet Football Table** | Sport365 standings import, multi-brand table cards, AI context for league tables |
| **Racing / F1 templates** | Driver image sync, results layout, voiceover prompt engineering |

**Technological uncertainties:**

- Whether kit colours, crests and formation positions can be inferred reliably from partial feed data (kit intelligence engine).
- Whether HTML render templates can produce consistent MP4/social exports across brands without manual design per fixture.
- Whether Sport365 page parsers survive feed markup changes without breaking import pipelines.

**Evidence to keep:** kit misclassification logs, layout overlap failures, import parser errors, render dimension mismatches, and manual correction steps removed over time.

## 6. Platform Case Studies And R&D Acceleration

Maintain a **dated case study** for each platform that materially supports the R&D claim. Use the Gateway R&D evidence template **“Platform case study”** on `/admin/reports`. Redact secrets; focus on uncertainty, trial, outcome and headcount/technician impact.

### 6.1 Case study format (template)

| Field | What to record |
|-------|----------------|
| **Platform** | Cursor / Lovable / OpenAI / Runway / ElevenLabs / Plexa / other |
| **Project** | e.g. Lovable app name, Match Report Builder, Team Line Up studio |
| **Date range** | |
| **Team** | UK product, SA dev, editorial |
| **Problem** | What could not be readily deduced? |
| **Approach** | What was built or trialled? |
| **Outcome** | Productionised / rejected / blocked on legal or security |
| **vs prior R&D cycle** | Would this have needed a dedicated technician before? |
| **Evidence** | Commits, screenshots, Lovable export URL, Gateway entry ID |

### 6.2 Cursor — case study themes (populate with dated entries)

- **Match Intelligence Object (MIO)** — registry, section builders, preview vs report assembly.
- **Multi-source parsers** — Sport365, WhoScored, FotMob, SixLogics normalisation.
- **Fact-check and editorial score** — hallucination gates, publish blocks.
- **Template studios** — kit intelligence, formation layout, HTML scene render.
- **Security hardening** — post-incident secrets policy, env separation.

*Add a completed case study per major stream via Gateway R&D evidence.*

### 6.3 Lovable — app project case study themes

Lovable is used for **app-level prototypes** — standalone workflow UIs and studio concepts around editorial and production apps — before merge into the Plexa codebase.

| Lovable project theme | R&D question | Typical outcome |
|-----------------------|--------------|-----------------|
| Editorial workflow app | Can non-engineers validate UX before SA dev hardens? | UX learnings → Plexa production |
| Match/report studio shell | Can preview/report wizard be user-tested in days? | Discard or port patterns to `match-report-builder` |
| Visual template playground | Can brand teams preview Sport365 card ideas? | Feeds Team Line Up / Score Line requirements |

*Record each Lovable project URL, hypothesis, and productionise/reject decision.*

### 6.4 Plexa — the trust-layer case study

**Central thesis for accountants and editors:** competitors expose chatbots; Planet Sport builds **Plexa** because:

1. AI hallucinates — Tier 1 data + fact-check required.
2. Licensed data and owned content must anchor output.
3. Humans must approve before export.
4. Legal/GDPR and manipulation risks require provenance.

This is the **counter-case-study** to raw OpenAI/Runway usage: same underlying models, different **governed architecture**.

### 6.5 Media API case studies (Runway, ElevenLabs)

Document separately where **legal/ethical review** was required:

- Still image → motion video (rights in source asset? misleading output?).
- Voiceover vs voice clone (licensed script only? consent?).

Blocked or approved paths are both evidence.

### 6.6 Security incident and vulnerability register

Maintain a **running register** of security incidents and material vulnerabilities via Gateway R&D on `/admin/reports`. Use template **“Security incident & vulnerability log”** for each entry.

| Field | Purpose |
|-------|---------|
| Incident ID / date | Timeline |
| Platform vector | Cursor, Lovable, AWS, repo, phishing, AI API, other |
| Vulnerability class | Credential exposure, unauthorised provisioning, weak auth, human error, etc. |
| Severity | Low / medium / high / critical |
| Root cause | What was not known until this happened? |
| Remediation | 2FA, rotation, Transfon/Venture DK, policy, Mimecast |
| Status | Open / mitigated / accepted risk |
| R&D uncertainty link | e.g. Section 2.8 |

Aggregated, redacted summaries from this register document real-world **AI-era SME vulnerability patterns** and the systematic work to address them.

*Do not store live secrets, keys, passwords or exploitable paths in Gateway entries.*

## 7. Related R&D Document Registry

Use this registry as the master index. Admin UI mirrors the two top-level reports; detailed specs live in `docs/` and the repo root.

### 7.1 Top-level reports (Launch Accounting / R&D tax)

| Document | Location | Purpose |
|----------|----------|---------|
| **Full R&D Technical Report** (this document) | [`PLEXA_STUDIO_RD_REPORT.md`](./PLEXA_STUDIO_RD_REPORT.md) | CrowdyAI-format technical narrative: uncertainties, outcomes, UK R&D tax context, evidence discipline |
| **R&D Assessment** | Admin → `/admin/reports/rd-assessment` | Strategic positioning, rights layers, UKRI fit, priorities, roadmap |
| **R&D Report (UI)** | Admin → `/admin/reports/rd-report` | Interactive summary of Sections 1–3 for internal review |
| **R&D hub** | Admin → `/admin/reports` | Entry point, **case study templates**, Gateway R&D evidence |

### 7.2 Match intelligence and editorial specs

| Document | Location |
|----------|----------|
| Match Report Builder V1 — R&D Plan | [`docs/match-report-builder-rd-plan.md`](./docs/match-report-builder-rd-plan.md) |
| Plexa Match Intelligence Engine — master plan | [`docs/plexa-match-intelligence-engine-plan.md`](./docs/plexa-match-intelligence-engine-plan.md) |
| Match Preview V1 — product spec | [`docs/match-preview-v1-spec.md`](./docs/match-preview-v1-spec.md) |
| Match Preview — editorial & SEO benchmark | [`docs/match-preview-rd-report.md`](./docs/match-preview-rd-report.md) |
| Football365 Editorial Calibration | [`docs/football365-editorial-calibration.md`](./docs/football365-editorial-calibration.md) |
| Football365 Preview 10/10 Scoring Engine | [`docs/football365-preview-scoring-engine.md`](./docs/football365-preview-scoring-engine.md) |
| R&D folder index | [`docs/R&D/README.md`](./docs/R&D/README.md) |

### 7.3 Downloadable markdown (API)

When the dev server is running, related specs can be fetched as markdown:

- `/api/docs/plexa-studio-rd-report`
- `/api/docs/match-report-builder-rd`
- `/api/docs/match-intelligence-engine`
- `/api/docs/match-preview-v1-spec`
- `/api/docs/match-preview-rd-report`
- `/api/docs/football365-editorial-calibration`
- `/api/docs/football365-preview-scoring-engine`

Append `?download=1` to save as a file.

### 7.4 Live R&D evidence

Use **Plexa Gateway → R&D action** or **structured templates** on `/admin/reports` to append dated evidence — including **platform case studies**, legal/GDPR notes and adoption feedback.

---

*Last updated: June 2026. Review with Launch Accounting before any formal R&D tax submission.*

