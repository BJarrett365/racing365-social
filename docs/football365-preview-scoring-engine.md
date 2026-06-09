# Football365 Preview 10/10 — Editorial Scoring Engine

**Product:** Planet Sport Studio (Plexa)  
**Repo:** `racing365-social`  
**Status:** R&D specification — Phase 2 focus (editorial intelligence)  
**Authoritative calibration:** [Football365 Editorial Calibration](./football365-editorial-calibration.md)  
**Companion:** [Match Intelligence Engine plan](./plexa-match-intelligence-engine-plan.md) · [F365 preview benchmark](./match-preview-rd-report.md)

---

## 0. Core rule

> **Editorial quality > commercial optimisation**

Commercial can **improve** score. Commercial **cannot fail** score. See [calibration doc §0](./football365-editorial-calibration.md).

---

## 1. Why this exists

> **How does Plexa know a preview is better than the Football365 preview published today?**

Benchmark: [England v Costa Rica](https://www.football365.com/match-preview/england-v-costa-rica-prediction-preview) — **7.4/10**.

Three layers:

1. **Fabrication gate** — `preview-fact-check.ts` (truth)  
2. **Editorial score** — this document (quality)  
3. **Significance engine** — MIO `significance` section (why it matters — the moat)

---

## 2. Preview scoring dimensions (0–10 each)

Weighted mean. Weights from editorial calibration:

| Dimension | Weight | Blocks publish? | Question |
|-----------|--------|-----------------|----------|
| **Story** | 20% | Yes | Why does this match matter in the lead? |
| **Insight** | 20% | Yes | Significance — why should I care? (not just what) |
| **Tactical** | 15% | Yes | Formation, strength, weakness, one battle (V1 minimum) |
| **Context** | 15% | Yes | Competition, table, tournament path |
| **Readability** | 10% | Yes | F365 scan + voice + no banned phrases |
| **Originality** | 10% | Yes | Non-obvious thesis |
| **E-E-A-T** | 5% | Yes | Expertise shown, not implied |
| **Commercial** | 5% | **No** | Bonus only — odds natural; gamble responsibly once |

**SEO:** section linter (title, H1, H2 team news / prediction) — feeds readability hints, **not** a fail dimension.

```
overall = Σ (dimensionScore × weight)   // commercial included but see §3.3
publishOverall = Σ (dimensionScore × weight) excluding commercial fail logic
```

---

## 3. Publish, regen & hero rules

### 3.1 Hard gates (cannot publish)

| Gate | Action |
|------|--------|
| Fact-check `blocked` | Fix or audited editor override |
| Any **blocking** dimension &lt; 4.0 | Regenerate |
| Mandatory sections missing | Regenerate |
| Word count &lt; tier minimum | Regenerate |
| Social rumour in team news | Block — exclude from MIO |

### 3.2 Regeneration cap

| Type | Max |
|------|-----|
| Automatic (`overall < threshold`) | **2** |
| Editor-triggered | **1** |
| **Total** | **3** → then **human review required** |

### 3.3 Commercial rule

```typescript
function applyCommercialRule(dimensions: PreviewEditorialDimensions): number {
  // Commercial contributes to overall but never pulls below publish threshold alone
  const withoutCommercial = weightedMean(dimensions, PREVIEW_WEIGHTS, { exclude: ["commercial"] });
  const withCommercial = weightedMean(dimensions, PREVIEW_WEIGHTS);
  return Math.max(withoutCommercial, withCommercial); // commercial only helps
}

function canPublish(overall: number, tier: PreviewFixtureTier, factCheckBlocked: boolean): boolean {
  return !factCheckBlocked && overall >= TIER_PUBLISH_FLOOR[tier];
}
```

**Calibration example:** 8.2 overall with commercial 7.5 → **publish yes**.

### 3.4 Hero

| Condition | Result |
|-----------|--------|
| `overall >= 9.0` | Hero **candidate** |
| Editor approves | Hero **published** |
| Score only | **Never** auto-hero |

### 3.5 Fixture tiers

| Tier | Examples | Min words | Publish ≥ | Auto-regen &lt; |
|------|----------|-----------|-----------|----------------|
| **T1** | WC, England, top-6 PL | 1,200 | 8.0 | 8.0 |
| **T2** | Standard PL, cup SF+ | 900 | 7.5 | 7.5 |
| **T3** | Lower PL, group WC | 700 | 7.0 | 7.0 |
| **T4** | Low-stakes friendly | 600 | 6.5 | 6.5 |

---

## 4. Report scoring (separate engine)

Reports use **different dimensions**. See [calibration §3](./football365-editorial-calibration.md).

| Dimension | Default weight |
|-----------|----------------|
| Story | 18% |
| Turning point | 15% |
| Insight | 18% |
| Tactical analysis | 15% |
| Consequence | 14% |
| Readability | 8% |
| E-E-A-T | 5% |
| Originality | 7% |
| Creator DNA (70% brand / 30% creator) | 8% |

Module: `app/lib/match-report/report-editorial-score.ts` (Phase 3).

---

## 5. Banned phrases (readability)

Full list: [calibration §7](./football365-editorial-calibration.md).

```typescript
export const F365_BANNED_PHRASES = [
  "clash", "mouthwatering", "all eyes will be on", "fascinating encounter",
  "set to lock horns", "huge test", "must-watch", "anything can happen",
  "throw the form book out", "six-pointer", "battle royale", "titanic struggle",
  "footballing giant", "will be hoping to", "will be looking to",
  "could prove decisive", "in-form star", "crunch match", "game of two halves",
  "fine margins", "at the end of the day", "moving forward", "gave 110%",
  "deserved all three points", "hard-fought victory", "statement win",
  "cagey affair", "entertaining encounter", "quality outfit", "world-class talent",
] as const;
```

−0.25 per hit, cap −3.0 on readability dimension.

---

## 6. Humour dial

Set from fixture type → `creatorSignals.humourLevel`:

| Fixture | Level |
|---------|-------|
| Friendly | high |
| Mid-table | medium |
| Relegation / title race | low |
| England tournament | very_low |

---

## 7. Tactical V1 minimum linter

Before scoring tactical dimension, require in copy or Preview Picture:

- [ ] Likely formation  
- [ ] One tactical strength  
- [ ] One tactical weakness  
- [ ] One key battle  

If &lt;4 present → tactical score **capped at 5.0**.

---

## 8. TypeScript interfaces

```typescript
export const PREVIEW_EDITORIAL_WEIGHTS = {
  story: 0.20,
  insight: 0.20,
  tactical: 0.15,
  context: 0.15,
  readability: 0.10,
  originality: 0.10,
  eeat: 0.05,
  commercial: 0.05,
} as const;

export type PreviewEditorialDimensions = {
  story: number;
  insight: number;
  tactical: number;
  context: number;
  readability: number;
  originality: number;
  eeat: number;
  commercial: number;
};

export type PreviewEditorialScore = {
  overall: number;
  overallForPublish: number; // commercial cannot drag below blocking threshold
  band: "reject" | "standard" | "strong" | "hero_candidate";
  tier: PreviewFixtureTier;
  dimensions: PreviewEditorialDimensions;
  benchmarkDelta: number; // vs 7.4 F365 reference
  regenerationAttempts: number;
  regenerationAllowed: boolean;
  heroCandidate: boolean;
  heroApproved?: boolean;
  topFixes: Array<{ dimension: keyof PreviewEditorialDimensions; message: string }>;
  scoredAt: string;
  scorerVersion: "preview-score-v2";
};

export type SignificanceIntelligence = {
  whyCare: string;
  whyItMatters: string;
  whatHappensNext: string;
  tableImpact?: string;
  confidence: number;
  digest: string;
};
```

---

## 9. Blind test protocol

3 editors · same fixture · F365 vs Plexa · blind A/B.

Score: which would you publish? · more useful? · more Football365?

**Success:** Plexa wins majority on tier-1 fixtures before WC 2026 ramp.

---

## 10. Human-in-the-loop target

**70% tier-1 previews publish with light edits** — not 100% autonomous.

---

## 11. Implementation modules

| Module | Path |
|--------|------|
| Preview editorial score | `preview-editorial-score.ts` |
| Report editorial score | `report-editorial-score.ts` |
| Publish gate | `preview-publish-gate.ts` |
| Banned phrases | `mio/banned-phrases.ts` |
| Significance | `mio/sections/significance.ts` |
| Section linter | `preview-section-lint.ts` |
| Review UI | `PreviewEditorialScorePanel.tsx` |

**Phase 2 MVP (2 weeks):** Preview Picture → Team Intelligence → Scoring Engine.

---

## 12. Cursor implementation prompt

```
Implement docs/football365-editorial-calibration.md + this scoring spec:

1. PREVIEW_EDITORIAL_WEIGHTS (Story 20%, Insight 20%, Commercial 5% bonus-only)
2. Commercial cannot fail publish — applyCommercialRule()
3. Regen cap: 2 auto + 1 editor, then human review
4. Hero: 9.0+ candidate only, editor approval required
5. F365_BANNED_PHRASES readability penalties
6. SignificanceIntelligence MIO section
7. Tactical V1 minimum linter (4 elements)
8. Blind test fixture in tests/

Core rule: Editorial quality > commercial optimisation.
Benchmark: F365 7.4; T1 publish 8.0; 8.2 with weak commercial = publish yes.
```

---

*Last updated: May 2026 — aligned with ChatGPT editorial calibration.*
