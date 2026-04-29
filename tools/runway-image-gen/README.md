# Runway image generator (sports media)

Small, production-friendly **text-to-image** utility using the official **RunwayML SDK** (`textToImage.create` → `waitForTaskOutput`). Built for brands like **Racing365**, **TEAMtalk**, and **PlanetF1**: structured prompts, reusable templates, and clean logs.

> This is **not** text-to-video. It targets Runway’s **`/v1/text_to_image`** HTTP API via the SDK.

| Doc | Purpose |
|-----|--------|
| [SPEC.md](./SPEC.md) | Requirement checklist vs code |
| [API.md](./API.md) | Official API path, headers, base URL |

**Prompt templates** live in **`app/lib/runway-sports-image-templates.ts`**. The CLI imports that file via a relative path.

## Install

From this folder:

```bash
cd tools/runway-image-gen
npm install
```

Or from the repo root:

```bash
npm install --prefix tools/runway-image-gen
```

## Environment

1. Copy `env.example` to `.env` in **this** directory (or export variables in your shell).

2. Set your API secret from [Runway dev portal](https://dev.runwayml.com/) (keys often start with `key_`):

```bash
RUNWAYML_API_SECRET=your_key_here
```

Optional: `RUNWAY_API_VERSION` is not required; the tool uses the same default as the SDK (`2024-11-06`).

## Example usage

```bash
cd tools/runway-image-gen
cp env.example .env
# Edit .env and add RUNWAYML_API_SECRET

npm run example
```

The example uses the **Racing365** shorts-backdrop preset, prints the **final prompt**, the **full succeeded task** JSON (including **output** URLs), and **meta** (model, ratio, whether the default reference image was used).

### Programmatic usage

```ts
import { generateImage } from "./src/generate-image";

const { task, finalPrompt, meta } = await generateImage({
  brand: "teamtalk",
  useCase: "matchday_hero",
  style: "high_contrast_stadium_floodlights",
  promptText: "Night pitch, center circle, crowd bokeh, space for headline",
  ratio: "1080:1920",
  seed: 42,
  // referenceImages: [{ uri: "https://…" }], // optional; turbo uses a default if omitted
});

const imageUrl = task.output[0]; // download within 24–48h; store in your own bucket
```

### Raw prompt (no brand template)

```ts
await generateImage({
  brand: "racing365", // still required for typing; ignored when rawPrompt is true
  useCase: "custom",
  style: "custom",
  promptText: "Your full prompt under 1000 characters…",
  rawPrompt: true,
});
```

## Defaults

| Setting | Default |
|--------|---------|
| Model | `gen4_image_turbo` |
| Ratio | `1080:1920` (vertical social) |
| Prompt length | Hard-capped at **1000** (Runway limit) |
| Turbo reference images | If you pass none, a **Runway sample** HTTPS image is used (SDK requires ≥1 ref for turbo) |

## Suggested file structure

```
app/lib/
└── runway-sports-image-templates.ts   ← BRAND_VOICE, buildFinalPrompt (shared with API + CLI)

tools/runway-image-gen/
├── README.md                 ← you are here
├── env.example
├── package.json
├── tsconfig.json
├── examples/
│   └── run.ts                ← `npm run example`
└── src/
    ├── index.ts              ← public exports
    ├── constants.ts          ← API version, limits, default ref URL
    ├── types.ts              ← inputs, ratios (SportsBrand from app/lib)
    ├── presets.ts            ← Racing365 / TEAMtalk / PlanetF1 starter presets
    ├── logger.ts             ← prefixed console logs
    └── generate-image.ts     ← generateImage() — SDK + wait + errors
```

**Editing prompts:** change `BRAND_VOICE`, `USE_CASE_HINTS`, or `buildSportsPrompt` in **`app/lib/runway-sports-image-templates.ts`**. Add presets in `presets.ts`.

## Errors

- Missing `RUNWAYML_API_SECRET` → clear `Error` at start.
- Runway API errors → wrapped with context (`APIError`).
- Failed / cancelled tasks → `TaskFailedError` mapped to `Error` with Runway’s `failure` message when available.
- Wait timeout → `TaskTimedOutError` mapped to `Error` with task id.

## Integrating with video / social pipelines

The returned `task.output` array contains **temporary HTTPS URLs**. Per Runway, treat them as **short-lived**: download (or transfer) into your CDN/storage, then reference your own URLs in After Effects, Shorts renders, or CMS.

## Shared prompt file with the repo

Prompts live in **`app/lib/runway-sports-image-templates.ts`**. The Next.js app does not ship a text-to-image HTTP route; use this CLI or Runway in the browser for stills.

## Cursor / AI

This layout keeps **API calls** in `generate-image.ts` and **copy/branding** in `templates.ts` + `presets.ts`, so you can ask the editor to adjust tone per brand without touching SDK code.
