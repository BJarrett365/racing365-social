# Racing365 · Social (MVP)

**Build YouTube Shorts, captions, and cards from AI intelligence.** End-to-end pipeline for turning sports and racing data into **captions**, **PNG scenes** (social + Shorts), **SRT subtitles**, and **1080×1920 MP4** Shorts — with a three-panel editor UI.

- **Data**: `DummyRacingDataProvider` reads JSON from `data/dummy/`. Swap to `ApiRacingDataProvider` + Supabase when live feeds exist.
- **Content**: Template-based copy, scene specs, and scripts (`app/features/content/`). OpenAI hook is stubbed in `openai-stub.ts`.
- **Render**: HTML/CSS → PNG via Puppeteer (`app/features/render/`). Racing365 styling (dark, green odds, gold accents).
- **Video**: FFmpeg `filter_complex` (loop each PNG, concat, optional subtitle burn, AAC + H.264, 30 fps) (`app/features/video/`).
- **Audio / voiceover**: **ElevenLabs** (`ELEVENLABS_API_KEY`) → **OpenAI TTS** (`OPENAI_API_KEY`, default voice `nova`) → **macOS `say`** (free on Darwin) → **dummy** (silent or `DUMMY_AUDIO_PATH`). FFmpeg pads/trims narration to the full video length (`app/features/audio/`).

## Requirements

- **Node.js 20+**
- **FFmpeg** on your PATH (or set `FFMPEG_PATH`)
- Chromium is installed with **Puppeteer** on `npm install`

## Setup

```bash
cd racing365-social
cp .env.example .env.local   # optional
npm install
npm run dev
```

Open [http://localhost:8081](http://localhost:8081) after **`npm run dev`**. **`npm start`** is for production builds only — it will exit with a message until you run **`npm run build`** (otherwise `/` and every route look “broken”). If the browser **can’t connect** but **`http://127.0.0.1:8081`** works, run **`npm run dev`** again; if dev **crashes on startup**, set **`DEV_HOST=127.0.0.1`** in `.env.local` (see `.env.example`).

### Documentation

- [Install guide](docs/install.md)
- [Environment variables](docs/environment.md)
- [Language Studio admin guide](docs/language-studio.md)
- [Client Access guide](docs/client-access.md)
- [Client API reference](docs/client-api.md)
- [Deployment guide](docs/deployment.md)
- [Netlify deployment](docs/netlify-deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Dev server stability (avoid HTTP 500)

- **Sanity check (server really up):** With **`npm run dev`** running, open **`http://127.0.0.1:8081/healthz.txt`** (should show `ok`) and **`http://127.0.0.1:8081/api/health`** (JSON `{"ok":true,...}`). In another terminal: **`npm run verify:dev`** prints HTTP status for 127.0.0.1, localhost, and `::1`.
- If **`http://localhost:8081/...` returns “Internal Server Error”** on every route, a **zombie Node** is usually still bound to **8081**. Run **`npm run dev:kill-port`** (sends **SIGKILL** to whatever is listening on the dev port), then **`npm run dev`**.
- **`npm run dev`** **stops anything already listening on 8081** (macOS/Linux), **removes `.next`**, then starts **webpack dev** on **8081** (most stable; avoids Turbopack **HTTP 500** when `.next` is mixed or corrupted). Set **`SKIP_RELEASE_PORT=1`** if another app must own 8081. On Windows, close the old terminal using 8081 yourself, then run **`npm run dev`**.
- **Faster dev (Turbopack):** **`USE_TURBO=1 npm run dev`** or **`npm run dev:turbo`** — still wipes `.next` first.
- **Do not** run **`npm run clean`** or delete **`.next`** while **any** dev server is still running on this project. Stop the terminal (Ctrl+C), then start **`npm run dev`** again.
- **Skip the wipe** (slightly riskier): **`npm run dev:incremental`** — webpack dev without deleting `.next` first.
- **Same as incremental:** **`npm run dev:webpack`**.

**Config file (local only):** [`.env.local`](.env.local) — same folder as `package.json`; not committed to git. Copy from [`.env.example`](.env.example) if you don’t have it yet. In Cursor/VS Code, Cmd+click the link to open the file when it exists.

**Admin UI:** open **`/admin`** on your dev server to enter **ElevenLabs**, **OpenAI**, **FFmpeg path**, and voice options. Values are saved to `data/local/admin-settings.json` (gitignored). Set **`ADMIN_TOKEN`** in `.env.local` to protect saves in production; enter the same token on the Admin page when saving.

## Usage flow

1. **Dashboard** → **Next off** / **Fast results** / **Racecards** — pick a candidate.
2. **Editor** — **Regenerate** (loads structured content), **Render scenes** (Puppeteer PNGs under `output/images/<id>/`), **Build video** (MP4 in `output/video/`, SRT in `output/subtitles/`, manifest in `output/manifest.json`).
3. **Library** — preview built assets via `/api/file?rel=…`.

### Environment variables

Set values in [`.env.local`](.env.local). Reference list: [`.env.example`](.env.example). Do not commit secrets. For **spoken Shorts**, add `OPENAI_API_KEY` and/or `ELEVENLABS_API_KEY`. On Mac, narration works without keys via **`say`** unless you set `USE_MACOS_SAY=0`.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/next-off` | Dummy next-off bundles |
| GET | `/api/results` | Dummy fast results |
| GET | `/api/racecards` | Dummy racecard snapshots |
| POST | `/api/generate-content` | Body: `{ format, id, ...overrides }` |
| POST | `/api/render-scenes` | Body: `{ contentId, scenes }` |
| POST | `/api/build-short` | Body: `{ contentId, format, script, scenes, burnSubtitles? }` |
| GET | `/api/assets` | Manifest + folder scan |
| GET | `/api/file?rel=` | Safe file read under `output/` |
| GET | `/api/admin/settings` | Masked status + non-secret options |
| POST | `/api/admin/settings` | Save keys to `data/local/` (needs `ADMIN_TOKEN` when set) |
| POST | `/api/assets/delete` | Body `{ contentId }` — removes MP4, SRT, scene folder, concat file, manifest rows |

## Formats & scene counts

- **Next off**: intro + 3 tips + outro (5 PNGs).
- **Fast results**: intro + winner + placings + outro (4 PNGs).
- **Racecard**: paginated LED board pages (all runners) + optional market mover + CTA (typically 3+ PNGs depending on field size).

Social static dimensions **1080×1350** are supported by the same HTML templates (`social-*` template IDs); call `POST /api/render-scenes` with `width`/`height` in each scene’s `data` if you add one-off scenes from the editor later.

## Project layout

- `app/` — Next.js App Router pages, API routes, `components/`, `features/`, `lib/`
- `types/` — shared TypeScript models
- `data/dummy/` — seed JSON
- `output/` — generated images, audio, subtitles, video (gitignored contents)
- `assets/dummy/` — optional `voice.mp3`

## Phase 2+ (planned)

- Live OpenAI / ElevenLabs implementations
- Richer editor + publishing (YouTube, X, Meta)
- `ApiRacingDataProvider` backed by Supabase or racing API

## Licence

Private / internal — Racing365 concept build.
