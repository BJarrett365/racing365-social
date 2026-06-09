# Match Preview — Editorial & SEO Benchmark R&D Report

**Product:** Planet Sport Studio (Plexa)  
**Repo:** `racing365-social`  
**Status:** R&D — competitive benchmark & product target (May 2026)  
**Companion specs:** [Match Preview V1 spec](./match-preview-v1-spec.md) · [Match Report Builder R&D](./match-report-builder-rd-plan.md)  
**Purpose:** Handoff for ChatGPT / editorial planning — what “good” looks like on Football365 today, gaps vs a 9.5/10 Plexa preview, and how intelligence layers should close them.

---

## 1. Reference article

| Field | Value |
|-------|-------|
| **URL** | [England v Costa Rica: Prediction, team news, lineups and odds](https://www.football365.com/match-preview/england-v-costa-rica-prediction-preview) |
| **Brand** | Football365 |
| **Competition** | National Friendlies (pre–World Cup 2026) |
| **Kick-off** | Wed 10 Jun 2026, 21:00 BST · Inter&Co Stadium (Exploria Stadium) |
| **Byline** | Nathan Egerton (related previews in sidebar) |
| **Estimated length** | ~600–800 words (body + widgets) |

### 1.1 Live article structure (observed)

**Title / H1:** England v Costa Rica: Prediction, team news, lineups and odds

**In-page nav / widgets:** Article · Match Prediction · Stats Comparison · Predicted Lineups · Related Player · Win Probability · Recent Form · Recent Meetings

**Body sections (narrative):**

1. Intro — context (NZ win, Kane header, Tuchel, World Cup group opener vs Croatia/Ghana/Panama)
2. Kick-off time
3. How to watch (ITV1, BBC Radio 5 Live, talkSPORT)
4. England team news (Rice/Eze/Saka/Madueke rest; rotation vs NZ; Bellingham/James/O’Reilly/Anderson pushing)
5. Costa Rica team news (not at WC; Bran/Vargas/Madrigal sent home; Navas absent)
6. Odds (England 2/11, Draw 15/2, Costa Rica 18/1)
7. Prediction — short narrative + betting angles (win both halves 6/5, win to nil 8/11, Kane FGS 11/4, Rashford anytime 15/8)
8. **Football365's match prediction** — one-line hook + quoted pick
9. Embedded widgets: Stats comparison, Season stats, Predicted lineups, Related player analysis, More predictions

**Commercial:** Betting recommendations woven into prediction (not a separate advertorial block).

---

## 2. Editorial & SEO scorecard (external review)

Benchmark review of the F365 article as both **editor** and **Google Helpful Content** lens:

| Area | Score | Notes |
|------|-------|-------|
| **SEO** | 7.5/10 | Title matches high-intent queries: England v Costa Rica, prediction, team news, lineups, odds |
| **Google Helpful Content** | 7/10 | Clear structure; lacks depth and unique reasoning in prediction |
| **E-E-A-T** | 6.5/10 | Journalist byline present; weak demonstration of expertise, model, or evidence behind picks |
| **User Experience** | 8/10 | Easy to scan; team news → odds → prediction → lineups flow works |
| **Match Preview Quality** | 7.5/10 | Covers basics; prediction section thin vs major international fixture |
| **Commercial Intent** | 9/10 | Betting angles integrated naturally |
| **Overall** | **7.4/10** | Solid commercial preview; not differentiated on insight or data depth |

### 2.1 What’s good

- **Clear search-intent match** — title and H1 target the keyword cluster editors and users expect.
- **Scannable structure** — team news, odds, prediction, lineups, betting angles; good for readers and crawlers.
- **Commercial integration** — prices and angles feel editorial, not bolted-on affiliate copy.
- **Widget layer** — stats comparison, predicted lineups, win probability, form, H2H (even when body copy is short).

### 2.2 What’s holding it back

| Gap | Detail | Plexa implication |
|-----|--------|-------------------|
| **Thin unique insight** | Prediction is a few paragraphs; generic “England stronger, Kane to score” | PIO + Build Picture must mandate **tactical thesis** and **evidence-backed reasoning**, not template narrative |
| **Missing deeper stats** | Last 5, xG trends, goals for/against, H2H, home/away, Kane England record, Tuchel record | PIO sections: `FORM_DIGEST`, `H2H_DIGEST`, `LEAGUE_SEASON_STATS_DIGEST`, player-season context; V2: xG / SofaScore |
| **Weak E-E-A-T signals** | No “why trust this pick”; no model or methodology | Surface **creator profile**, **confidence score**, **fact-check status**, **source tiers** in review/publish UI |
| **Too short for fixture tier** | ~600–800 words; major England friendly should be 1,200–1,800 | Generation prompt + brand guidelines: **word-count bands by competition tier** (friendly / PL / WC) |
| **Predicted XI under-labelled** | Widget lineups vs confirmed teams | Fact-check: `preview-unconfirmed-lineup`; PIO `LINEUP_CONTEXT` must label predicted vs confirmed |

---

## 3. Target structure — “10/10” preview

Sections recommended to lift F365-style output from **7.4 → 9.5+**:

### 3.1 Data-led blocks (PIO-fed, Tier 1–2 only)

| Section | Example content | Data source (Plexa) |
|---------|-----------------|---------------------|
| **Key stats** | England unbeaten in X; Costa Rica W/L in last Y; Kane England goals; H2H | SixLogics `availableData`, `fixtureContext`, league season stats |
| **Form** | Last 5 both sides | `FORM_DIGEST` |
| **Head-to-head** | Historical meetings + scores | `H2H_DIGEST` |
| **xG / chance quality** | Trends last N games | V2: SofaScore / WhoScored pre-match; V1: season stats proxy |
| **Manager context** | Tuchel record in charge | Manual sources + Loop Feed; V2: structured manager stats |

### 3.2 Editorial / tactical blocks (Tier 3 — evidence-backed)

| Section | Purpose |
|---------|---------|
| **Tactical battle** | How England attack (width, press, Kane role); how Costa Rica hurt them (counter, set pieces) |
| **Player to watch** | 2–3 named players with **stats or quotes** from Tier 2 |
| **Key battles** | Match-up narratives tied to lineups or formations when known |

### 3.3 Prediction & commercial (with guardrails)

| Section | F365 today | Plexa target |
|---------|------------|--------------|
| **AI match prediction** | “England should win”; Kane FGS | **Probabilistic framing** when odds/sim data exists: e.g. “Model/projects: England 74%, Draw 17%, Costa Rica 9%” — only if sourced from feed or explicit model output |
| **Score prediction** | Implicit in copy | Explicit scoreline + **confidence rating** (e.g. ⭐⭐⭐⭐☆) tied to `ArticleScore` / confidence |
| **Betting angles** | Integrated prices | Keep; enforce `preview-odds-without-disclaimer` fact-check |
| **Football365's match prediction** | Branded one-liner + quote | Brand-variant **standfirst hook** + creator voice |

### 3.4 UX / SERP extras (already on F365 — Plexa should match or exceed)

- Kick-off time · venue · competition  
- How to watch / broadcast (when in foundation or manual sources)  
- Predicted lineups widget  
- Stats comparison / season stats  
- Win probability (when data supplied)  
- Recent form · recent meetings  
- Related player analysis  
- Video embeds (V2: Language Studio / library)

---

## 4. Plexa product targets

| Metric | F365 (current) | Plexa V1 (builder + PIO) | Plexa goal |
|--------|----------------|---------------------------|------------|
| **Overall editorial score** | 7.4/10 | ~8.0 (structure + fact-check + PIO) | **9.5+/10** |
| **Data depth** | Widgets + thin copy | Form, H2H, table, season stats, odds, team news digests | + xG, player records, sim probabilities |
| **E-E-A-T** | Byline only | Creator profile, layer weights, confidence, fact-check panel | Published methodology + source manifest |
| **Length (tier 1 intl)** | ~600–800 words | Prompt-driven; tier rules TBD | 1,200–1,800 words for marquee fixtures |
| **Fabrication risk** | Human + desk process | Deterministic preview fact-check | Block publish on unsourced injuries / invented scores |

### 4.1 Intelligence stack to beat newspapers

Combine (phased):

| Source | Role in preview |
|--------|-----------------|
| **SixLogics** | Foundation, form, H2H, odds, lineups when confirmed |
| **Sport365** | League table, top scorers, team season patterns |
| **Loop Feed** | Press quotes, social sentiment, injury chatter (Tier 2) |
| **WhoScored / SofaScore** | Pre-match xG, player form, “ones to watch” (V2) |
| **Manual sources** | Team news, BBC/Sky/Athletic injury lines |
| **PIO assembly** | Never raw JSON — structured digests to LLM |
| **AI tactical analysis** | Build Picture → narrative threads with factual anchors |
| **Preview fact-check** | No invented scores, unsourced injuries, unqualified XIs |
| **Video / social** | Embeds and posts from Media Builder + Image Intelligence |

---

## 5. Mapping benchmark → Plexa V1 implementation

| Benchmark requirement | V1 status | Module / next step |
|----------------------|-----------|-------------------|
| Form + H2H | ✅ Import `preview_fixture_context` | `pio-summaries.ts`, Six Logic foundation |
| Team news both sides | ✅ Manual + Loop Feed | `TEAM_NEWS_DIGEST`, `MANUAL_SOURCE_DIGEST` |
| Odds from feed | ✅ `ODDS_DIGEST` | SixLogics `availableData.odds` |
| Predicted lineups | ⚠️ Widget + labelling | `LINEUP_CONTEXT` + fact-check qualifier |
| Deeper stats block | ⚠️ Partial | `LEAGUE_SEASON_STATS_DIGEST`; expand player records V1.2 |
| Tactical battle | ❌ Generation | `build-preview-picture.ts` — pre-match angles (V1.1) |
| AI win % / score prediction | ❌ | V2: simulation or odds-implied model; must be sourced |
| 1,200+ words tier 1 | ❌ Prompt | Brand guidelines + competition tier in `editorial-governance` |
| E-E-A-T in UI | ⚠️ Partial | Review screen: show confidence, skipped layers, fact-check |
| Schedule preview vs report | ✅ | `FootballScheduleClient`, `schedule-brand-status.ts` |
| Data Studio migration | ✅ Banner | `preview-migration.ts`, Data Studio notice |

---

## 6. Generation outline — F365-parity + stretch (for prompts)

Suggested **HTML section order** for Football365-style previews (PIO-informed):

1. **Intro** — stakes, competition context, narrative hook  
2. **Kick-off time** — from foundation  
3. **How to watch** — manual source or foundation broadcast field  
4. **`{Home} team news`** — Tier 2 quotes; injuries flagged if unsourced  
5. **`{Away} team news`**  
6. **Odds** — verbatim from feed; responsible gambling line if brand requires  
7. **Key stats** — PIO block (form, H2H, season snippets)  
8. **Tactical battle** — Build Picture threads (V1.1+)  
9. **Players to watch** — 2–3 with evidence (V1.2 / WhoScored)  
10. **Prediction** — reasoned paragraphs, not generic  
11. **`{Brand}'s match prediction`** — headline pick + standfirst quote  
12. **Betting angles** — commercial, sourced prices only  
13. **Widgets** — stats comparison, predicted lineups (embed or HTML tables from PIO)

**Word-count guidance (editorial):**

| Fixture tier | Target words | Example |
|--------------|--------------|---------|
| Marquee international / WC | 1,200–1,800 | England v Costa Rica (pre-WC) |
| Premier League top-six | 1,000–1,400 | Arsenal v Liverpool |
| Standard PL / group WC | 800–1,200 | Mid-table PL |
| Friendly / low stakes | 600–900 | Current F365 length acceptable |

---

## 7. Fact-check & E-E-A-T alignment

Preview fact-check rules ([`preview-fact-check.ts`](../app/lib/match-report/preview-fact-check.ts)) directly address benchmark risks:

| Risk in F365-style copy | Rule ID | Severity |
|-------------------------|---------|----------|
| Final score before kickoff | `preview-invented-score` | high |
| Named XI without “predicted” | `preview-unconfirmed-lineup` | medium |
| Injury claim not in sources | `preview-unsourced-injury` | high |
| Odds without disclaimer | `preview-odds-without-disclaimer` | medium |
| Headline missing team names | `preview-team-name-mismatch` | high |

**E-E-A-T publish package (target):** byline + creator profile + confidence % + skipped-layer disclosure + fact-check status + “sources used” manifest from PIO import summaries.

---

## 8. Roadmap summary (R&D)

| Phase | Deliverable | Closes benchmark gap |
|-------|-------------|----------------------|
| **V1.0** ✅ | PIO, workflow, schedule dual columns, fact-check | Structure, fabrication guardrails, form/H2H/odds |
| **V1.1** | `build-preview-picture.ts`, `generate-preview-media.ts` | Tactical battle, longer reasoned prediction, F365 section order |
| **V1.2** | Ones to watch, press transcripts, word-count tiers | Player focus, E-E-A-T depth, marquee length |
| **V2** | SofaScore/xG, win-probability model, video embeds | Key stats depth, AI match prediction %, 9.5+ bar |
| **V2.1** | Data Studio → Builder deep-link | Migration off raw JSON |
| **V3** | Remove legacy Data Studio preview | Single PIO path |

---

## 9. Handoff summary for ChatGPT

**One-liner:** F365’s England v Costa Rica preview scores **7.4/10** — strong SEO/commercial UX, weak on unique insight, stats depth, E-E-A-T, and length for a marquee friendly. Plexa should target **9.5+/10** by PIO-structured data (form, H2H, stats, odds, team news) + tactical Build Picture + sourced predictions + fact-check + creator/confidence signals — not by dumping raw fixture JSON.

**Canonical specs:** [match-preview-v1-spec.md](./match-preview-v1-spec.md)  
**Implementation index:** [match-preview-v1-spec.md §8](./match-preview-v1-spec.md#8-file-index-new--modified)

---

*Last updated: May 2026 — benchmark source: Football365 England v Costa Rica preview + editorial review.*
