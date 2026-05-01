# Plexa / Planet Sport AI Studio - R&D Technical Report

Prepared for Planet Sport, Launch Accounting and R&D tax experts.

This document is a draft technical R&D narrative. It is not tax advice and should be reviewed by the company's accountants and R&D advisers before being used to support any formal claim.

## Table of Contents

1. Project Overview
2. Technological Uncertainties Addressed
3. Outcomes and Learnings

## Executive Summary

This report documents the Research and Development activities being undertaken in creating the **Plexa / Planet Sport AI Studio**: a rights-aware AI editorial production platform for sports and media teams.

The project involves configuring and combining existing AI capabilities, official platform feeds, licensed sports data, owned Planet Sport content, content creator expertise and editorial governance to create a novel multi-format sports media production system.

The R&D work addresses multiple technological uncertainties requiring systematic investigation and experimentation, including rights-aware provenance, multi-source ingestion, AI editorial repair, multi-format transformation and orchestration of tools/APIs into a reliable production workflow.

The strongest product direction is not simply to generate content faster. It is to turn approved source intelligence into governed, reusable, multi-format output with clear provenance.

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

## 3. Outcomes and Learnings

### 3.1 Technical Outcomes

1. **Article Studio:** Central hub for import, rewrite, translation, YouTube transcripts, News Shorts and review queue workflows.
2. **Language Studio governance:** Source brands, content creators, guardrails, knowledge files, glossary, protected terms, market rules, quality checks and export feeds.
3. **YouTube/script pipeline:** Metadata, transcript import, AI output generation and article creation from video source material.
4. **R&D evidence loop:** Failures, parser errors, AI limitations, prompt tests, API barriers and manual bottlenecks are treated as learning evidence.
5. **Product positioning:** Plexa / Planet Sport AI Studio is framed as an AI-native editorial operating system, not an AI wrapper.

### 3.2 Knowledge Contribution

The R&D is establishing new approaches and techniques for:

- Sports-specific prompt and workflow design for article, rewrite, translation, social and script generation.
- Source and rights metadata patterns for AI-assisted publishing workflows.
- HTML/XML/transcript ingestion safeguards for inconsistent third-party source formats.
- Review queue and quality-check patterns for human-in-the-loop AI production.
- Evidence discipline for accountants and R&D tax experts, including failures, abandoned approaches and barriers.

### 3.3 Evidence To Keep

The evidence pack should capture:

- Failed prototypes, abandoned approaches and barriers encountered.
- Prompt/model tests, validation failures and hallucination controls.
- Parser, import, transcript and feed errors.
- Rights/provenance schema iterations and export restrictions.
- Latency, cost, retry, queue and export reliability measurements.
- Human review feedback and manual production steps removed.

R&D is not always about successful outcomes. Failed imports, broken parsers, unsuitable model outputs, rejected prompts, rights barriers, API limits and manual bottlenecks are important evidence because they show the technical uncertainty and systematic work needed to reach a working solution.

## Report Note

This report is intended for review with Launch Accounting and R&D tax specialists. It should be supported by dated engineering notes, screenshots, commits, failed test records, API/error logs, prompt iterations and evidence from competent professionals.

## Tools, Collaborations And API Context

The current wave of AI tools and APIs has opened up creativity for product and editorial teams.

Tools such as Cursor, Lovable, OpenClaw, OpenAI, DeepL, Runway, Apify and specialist data APIs allow product people, editors and engineers to test workflows much faster than before.

This matters because the innovation process itself has changed:

- Product people can now prototype and test ideas directly.
- Engineers can resolve integration and debugging issues faster.
- Editorial teams can see working tools earlier.
- AI can help generate, inspect and repair code.
- APIs can be combined into new production workflows.
- The gap between idea and working prototype is much smaller.

However, using these tools is not in itself the R&D. The R&D lies in the non-routine technical uncertainty of combining them into a reliable, governed, rights-aware production architecture.

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

