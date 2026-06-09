# Football365 Editorial Calibration — ChatGPT Decisions Log

**Product:** Planet Sport Studio (Plexa)  
**Status:** Authoritative editorial rules for scoring, MIO, and publish gates  
**Companion:** [Preview scoring engine](./football365-preview-scoring-engine.md) · [Match Intelligence Engine](./plexa-match-intelligence-engine-plan.md)

---

## 0. Core Plexa rule (calibration anchor)

> **Editorial quality > commercial optimisation**

If Plexa scores **8.2** with stronger tactical insight and originality but slightly weaker commercial (7.5 vs F365’s 9.0) → **publish**. Readers come back for quality; commercial follows trust.

**Commercial can improve score. Commercial cannot fail score.**

Football365 readers come for **football first**.

---

## 1. Significance Engine (the moat)

AI tells you **what happened**. Good football writers tell you **why it matters**.

**`SIGNIFICANCE_ENGINE`** is a core MIO component. Every article must answer:

1. **Why should I care?**
2. **Why does this matter?**
3. **What happens next?**

Maps to MIO sections: `significance` (preview + report), `next_match_intelligence`, Preview Picture / Build Picture.

```typescript
export type SignificanceIntelligence = {
  whyCare: string;           // fan hook
  whyItMatters: string;      // stakes / consequence
  whatHappensNext: string;   // forward look
  tableImpact?: string;      // e.g. "A win moves Leeds into the automatic promotion places"
  confidence: number;
  sourceLayers: string[];
  digest: string;
};
```

---

## 2. Preview scoring dimensions & weights

| Dimension | Weight | Can block publish? |
|-----------|--------|-------------------|
| **Story** | 20% | Yes |
| **Insight** | 20% | Yes — significance / why it matters |
| **Tactical** | 15% | Yes |
| **Context** | 15% | Yes |
| **Readability** | 10% | Yes |
| **Originality** | 10% | Yes |
| **E-E-A-T** | 5% | Yes (low weight) |
| **Commercial** | 5% | **No** — bonus only |

**SEO:** enforced via section linter + title checks; not a weighted fail dimension.

### 2.1 Publish thresholds (preview)

| Tier | Publish ≥ | Auto-regen &lt; |
|------|-----------|----------------|
| T1 (WC, England, top-6 PL) | 8.0 | 8.0 |
| T2 | 7.5 | 7.5 |
| T3 | 7.0 | 7.0 |
| T4 friendlies | 6.5 | 6.5 |

### 2.2 Hero content

| Rule | Detail |
|------|--------|
| Score | **9.0+** = hero **candidate** only |
| Approval | **Editor approval required** — score alone never auto-hero |
| Rationale | Best content has qualities scoring engines miss |

---

## 3. Report scoring dimensions (different from preview)

| Dimension | Notes |
|-----------|--------|
| **Story** | Lead angle — why result matters |
| **Turning point** | Moment that changed the game |
| **Insight** | Why it happened (significance) |
| **Tactical analysis** | How the match was won |
| **Consequence** | What it means — table, title, relegation |
| **Readability** | F365 structure + banned phrases |
| **E-E-A-T** | Expertise demonstrated |
| **Originality** | Non-obvious thesis |
| **Creator DNA** | Brand 70% + creator 30% blend |

**Commercial:** same rule — cannot fail report score.

Suggested report weights (engineering default until editorial review):

| Dimension | Weight |
|-----------|--------|
| Story | 18% |
| Turning point | 15% |
| Insight | 18% |
| Tactical analysis | 15% |
| Consequence | 14% |
| Readability | 8% |
| E-E-A-T | 5% |
| Originality | 7% |
| Creator DNA | 8% |

---

## 4. Regeneration protocol

| Attempt | Trigger | Max |
|---------|---------|-----|
| **Automatic** | `overall < tier threshold` | **2** |
| **Editor-triggered** | Editor clicks “Regenerate with fixes” | **1** |
| **After 3 total** | — | **Human review required** — no more auto |

Prevents AI chasing its own tail.

---

## 5. Blind test protocol (quality validation)

**Minimum before claiming “better than F365”:**

- **3 editors**
- **Same fixture**
- **Current F365 article** vs **Plexa article**
- **Blind labels** (A/B)

**Questions only:**

1. Which would you publish?
2. Which is more useful?
3. Which feels more Football365?

**Target:** Plexa wins majority on all three for tier-1 fixtures.

---

## 6. Creator DNA — brand vs creator

| Rule | Value |
|------|--------|
| Priority | **Brand > Creator** always |
| Blend | **70% brand** · **30% creator** |
| Outcome | Football365 should always feel like Football365 |

`creatorSignals` in MIO applies weighted blend to `promptBlock`.

---

## 7. Football365 banned phrase list

Each hit in body copy → readability penalty (−0.25 per phrase, cap −3.0).

```
clash
mouthwatering
all eyes will be on
fascinating encounter
set to lock horns
huge test
must-watch
anything can happen
throw the form book out
six-pointer
battle royale
titanic struggle
footballing giant
will be hoping to
will be looking to
could prove decisive
in-form star
crunch match
game of two halves
fine margins
at the end of the day
moving forward
gave 110%
deserved all three points
hard-fought victory
statement win
cagey affair
entertaining encounter
quality outfit
world-class talent
```

**Pre-match only ban:** `game of two halves` (already in list).

Store as `F365_BANNED_PHRASES` in `app/lib/match-report/editorial-governance.ts` or `mio/banned-phrases.ts`.

---

## 8. Humour dial by fixture type

| Fixture type | Humour level |
|--------------|--------------|
| Friendly | High |
| Mid-table PL | Medium |
| Relegation | Low |
| Title race | Low |
| England tournament | Very low |

Football365 should be **witty**, not stand-up comedy.  
`creatorSignals.humourLevel` set from competition + fixture tier.

---

## 9. Team intelligence — source tiers

| Source | Rule |
|--------|------|
| Official (club, FA) | **Fact** — Tier 1 |
| BBC / Sky | **Reliable** — Tier 2 |
| Named journalist | **Attributed** — Tier 2 |
| Social rumour | **Exclude** — never enter MIO |

Never let Twitter rumours into Team Intelligence.

---

## 10. Predicted XI confidence labelling

| Confidence | Editorial label |
|------------|-------------------|
| **100%** | Confirmed |
| **80–99%** | Expected XI |
| **60–79%** | Predicted XI |
| **&lt;60%** | Probable changes |

Copy must use matching qualifier. Fact-check enforces when lineups not confirmed in SixLogics.

---

## 11. Tactical minimum (V1)

Acceptable tactical block must include **all four**:

1. Likely formation  
2. One tactical strength  
3. One tactical weakness  
4. One key battle  

Anything less → tactical dimension capped at **5.0**.

Full `tactical_context` layer is **V2**; V1 can be Preview Picture + minimum linter.

---

## 12. What happens next — mandatory scope

| Competition | `next_match_intelligence` required? |
|-------------|-------------------------------------|
| World Cup | Yes |
| Euros | Yes |
| Premier League | Yes |
| Champions League | Yes |
| Friendlies | Optional |

**Table impact in previews:** **Yes** — e.g. *A win would move Leeds into the automatic promotion places.*

---

## 13. Commercial & compliance

| Rule | Detail |
|------|--------|
| Responsible gambling | **Once per article** — not every odds mention |
| Odds in copy | Verbatim OK: *England are 2/11 favourites* |
| Odds in copy | Qualitative OK: *England are overwhelming favourites* |
| Commercial score | Bonus only — never blocks publish |

---

## 14. Content type priority — World Cup 2026

1. Match preview  
2. Match report  
3. Push  
4. Social  
5. Hero  
6. Short video  
7. Newsletter  
8. Live blog  
9. Podcast script  

Push and social drive more traffic than podcasts.

---

## 15. Data Studio cutover

| Vertical | Policy |
|----------|--------|
| **Football** | **Hard cutover** to Match Report Builder — one emergency fallback only |
| Non-football | Keep Data Studio |

---

## 16. Phase 2 MVP (2 weeks) — locked priorities

| Priority | Deliverable | Why |
|----------|-------------|-----|
| **1** | **Preview Picture** | Without it, previews stay generic |
| **2** | **Team Intelligence** | Without it, previews aren’t trustworthy |
| **3** | **Scoring Engine** | Without it, Plexa can’t tell good from bad |

**Delay:** tactical context V2 · fancy HTML · additional outputs

---

## 17. Human in the loop — success target

| Target | Not target |
|--------|------------|
| **70% publish with light edits** | 100% autonomous |
| AI removes **~80% of work** | AI removes 100% of judgement |

The best publishers still have editors.

---

*Source: ChatGPT + editorial calibration session, May 2026. Engineering implements via scoring engine + MIO modules.*
