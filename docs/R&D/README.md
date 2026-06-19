# R&D — Planet Sport Studio (Plexa)

Master index for the **Full R&D Report** and all related R&D documents. Prepared for Planet Sport, Launch Accounting and R&D tax advisers. Not tax advice.

## Full R&D Report (start here)

| Format | File / route |
|--------|----------------|
| **Markdown (authoritative source)** | [`PLEXA_STUDIO_RD_REPORT.md`](../../PLEXA_STUDIO_RD_REPORT.md) (repo root) |
| **API download** | `/api/docs/plexa-studio-rd-report` · add `?download=1` to save |
| **Admin — R&D Assessment** | [/admin/reports/rd-assessment](/admin/reports/rd-assessment) — positioning, rights layers, UKRI fit, priorities |
| **Admin — R&D Report** | [/admin/reports/rd-report](/admin/reports/rd-report) — technical narrative (Sections 1–3) |
| **Admin — R&D hub** | [/admin/reports](/admin/reports) — entry point + Gateway evidence |

The root markdown file is the **complete** technical report including Match Intelligence, Sport365 visual templates, document registry and UK R&D tax context.

---

## Match Report Builder

| Format | File |
|--------|------|
| **Markdown (source)** | [match-report-builder-rd-plan.md](../match-report-builder-rd-plan.md) |
| **API download** | `/api/docs/match-report-builder-rd` |

**Match Report Builder V1** — editorial brief first (Football → Match Report → Brand → Content Creator Profile), then Match ID, MIO data layers, AI generation, Image Intelligence, Fact Check, Editorial Score, Review, Publish.

---

## Match Preview & Match Intelligence Engine

| Document | File |
|----------|------|
| **Match Intelligence Engine (master plan)** | [plexa-match-intelligence-engine-plan.md](../plexa-match-intelligence-engine-plan.md) |
| **F365 Editorial Calibration (authoritative)** | [football365-editorial-calibration.md](../football365-editorial-calibration.md) |
| **F365 Preview 10/10 Scoring Engine** | [football365-preview-scoring-engine.md](../football365-preview-scoring-engine.md) |
| **Match Preview V1 product spec** | [match-preview-v1-spec.md](../match-preview-v1-spec.md) |
| **Editorial & SEO benchmark R&D** | [match-preview-rd-report.md](../match-preview-rd-report.md) |

**Match Intelligence Engine** — one **MIO** (not separate EIO/PIO) powers previews, Report 2.0, Team Intelligence, Build Picture, insight scoring, and future outputs (social, push, YouTube).

**Match Preview V1** — `contentType: match_preview`, dual schedule, preview fact-check and editorial score gates. F365 benchmark: [England v Costa Rica](https://www.football365.com/match-preview/england-v-costa-rica-prediction-preview) (7.4/10 → 9.5+ target).

---

## Sport365 visual template studios (2026)

Documented in **Section 5** of the [Full R&D Report](../../PLEXA_STUDIO_RD_REPORT.md). Implementation in repo:

| Studio | Hub route |
|--------|-----------|
| Team Line Up | `/team-line-up` |
| Team Sheet | `/team-sheet` |
| Score Line | `/score-line` |
| Football Lineups | `/football-lineups` |
| Planet Football Table | `/planet-football-table` |

R&D themes: kit intelligence, formation layout, Sport365 import parsers, brand themes, HTML scene render and MP4 export.

---

## Platform evaluation (SME toolchain)

Documented in **Sections 2.6–2.8** and **Tools, Collaborations And API Context** of the [Full R&D Report](../../PLEXA_STUDIO_RD_REPORT.md).

| Status | Platforms / themes |
|--------|-------------------|
| **Woven into Plexa** | Cursor, Lovable, OpenAI, DeepL, Runway, ElevenLabs, Apify, LoopFeed — used by UK product (Nik Keene, David Jarrett) and SA development teams |
| **Rejected (example)** | Adobe Creative Cloud — per-seat cost prohibitive; workflow not aligned with rights-aware orchestration |
| **Productionisation** | Biggest R&D gap: hardening AI prototypes into governed Plexa releases |
| **Trust / hallucination** | Raw AI not trusted; Plexa controls output via licensed data, owned content, fact-check |
| **Human adoption** | Staff fear role loss; visible review and creator voice required |
| **Legal / GDPR** | Image→motion, voice clone, manipulation — lawful basis must be evidenced |
| **R&D acceleration** | Last claim cycle: technician-heavy prototypes; this cycle: Cursor + Lovable apps, smaller team |
| **Security** | **Incident & vulnerability register** — log via Gateway template; dated record of failures, root cause and remediation |

Capture via **Gateway R&D evidence templates** on [/admin/reports](/admin/reports) — start with **Security incident & vulnerability log** for each event.

---

## Evidence discipline

R&D claims should be supported by:

- Dated engineering notes, commits, screenshots
- Failed prototypes and abandoned approaches
- Parser/import errors (Sport365, WhoScored, FotMob, SixLogics, feeds)
- Prompt and model comparison tests
- Fact-check and editorial score calibration runs
- Gateway R&D evidence entries (`/admin/reports`)

---

*Generated from the consolidated R&D specification. Last updated June 2026.*
