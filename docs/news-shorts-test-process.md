# News Shorts — Test process & knowledge reference

Use this alongside the technical manual: **`news-shorts-manual.md`**. It captures the **operator order of operations**, **what to verify**, and a **small JSON shape** for logging repeated test runs and template examples.

---

## 1. Purpose

- Run **repeatable end-to-end checks** after code or template changes.
- Separate **“does the pipeline work?”** from **“does the creative output look right?”** (copy, timing, colour).
- Leave room to attach **more examples** (same steps, different articles, toggles, or backing music).

---

## 2. Standard test sequence (recommended order)

| # | Step | What you do | What to verify |
|---|------|-------------|----------------|
| 1 | **Template / session** | Start from a fresh or saved draft; note `contentId` if comparing outputs. | Builder loads; no stale errors. |
| 2 | **Source → Fetch + Parse** | Article URL or RSS; run **Fetch + Parse**. | Slides + style populate; headline/body sensible. |
| 3 | **Voiceover script** | Paste or edit **Create voiceover script** (this is the **dubbing source** when TTS runs). | Text matches what you want spoken. |
| 4 | **Voice + speed** | Choose voice, speed; generate or preview as you prefer. | Audio provider OK; preview plays if used. |
| 5 | **Scene subtitles & timing** | Set **Dur (s)** per slide; optional **Sync captions from script** / **Adjust timings from lines**. | Sum of durations ≈ voice target (or intentional drift). |
| 6 | **Burn + ASS (optional)** | Enable **Burn subtitles**; enable **Replace slide headline/subline with styled subtitles (ASS)** when testing dub-on-video. | Helper text matches: burned text follows **voiceover script** when that field is set. |
| 7 | **Background (before render)** | Pick **background video** (library / upload / Runway pipeline per your workflow). | `custom-bg.mp4` (or chosen rel) shows intent; **Content preview** is the main **pre-build** composite (motion + slides). |
| 8 | **Render scenes** | **Render scenes** (Step 2 in Actions). | PNGs generated; Content preview shows **backdrop + slide stack**; with ASS + voice script, **dub line overlay** appears when clicking slides. |
| 9 | **Build video** | **Build video** (Step 3). | **Video** column shows **MP4 + Download** when done; first failure may auto-retry once on flaky network/server. |
| 10 | **Playback QA** | Watch full MP4. | Motion visible; **TTS/dub** matches script; **ASS** readable (charcoal panel); audio levels OK. |

**Intent:** For **validation**, use **Render → Content preview** before build so PNG + stacking + subtitle preview are correct; build confirms FFmpeg + mux.

---

## 3. Configuration matrix (quick reference)

| Goal | Voiceover script | Burn + ASS replace | Motion backdrop | Audio source |
|------|-------------------|--------------------|-----------------|----------------|
| Dub + styled burn + motion | Required | On | Background video | TTS (default) or recording |
| Dub matches on-screen text | Required | On | Optional | TTS |
| Slide-only copy (no voice field) | Empty | On | Optional | — uses slide copy for ASS/SRT |
| Video’s own audio | Optional | Optional | Yes | **Use video audio** (when offered) |

---

## 4. Next phase — **Backing music**

After the core path is stable, extend tests with:

- **Backing music** enabled in the builder (library / upload / generated per product).
- Same steps as §2, plus: set **volume**, **ducking**, and trims as needed.
- Verify: narration (or clip audio) remains primary; music sits **under** the mix without masking words.

Code touchpoints: `backingMusic` in **`/api/news-shorts/build`**, `buildShortVideo` audio graph, `NewsShortsBuilder` backing music UI.

---

## 5. Test run record (JSON shape for your examples)

Use one object per run; add fields as your examples grow (`notes`, `screenshotPaths`, `gitSha`, etc.).

```json
{
  "$schema": "./news-shorts-test-run.schema.json",
  "testId": "ns-2026-04-17-01",
  "articleUrl": "https://www.planetf1.com/...",
  "contentId": "news-…",
  "stepsCompleted": [
    "fetch_parse",
    "voiceover_script",
    "voice_settings",
    "scene_timings",
    "burn_ass",
    "background_video",
    "render_scenes",
    "build_video"
  ],
  "flags": {
    "burnSubtitles": true,
    "burnSubtitlesReplaceSlideText": true,
    "useVideoAudio": false,
    "backingMusicEnabled": false
  },
  "outcome": "pass",
  "notes": "ASS panel darkness OK; dub matches script."
}
```

---

## 6. Related code & docs

| Item | Location |
|------|----------|
| Main UI | `app/features/news-shorts/NewsShortsBuilder.tsx` |
| Parse | `app/api/news-shorts/parse` |
| Render PNGs | `app/api/news-shorts/build` (render loop), `scene-renderer` |
| Build / FFmpeg | `app/api/news-shorts/build`, `app/features/video/video-builder.ts` |
| ASS burn styling | `app/features/content/news-short-ass.ts` |
| Script → per-scene chunks | `app/lib/script-scene-captions.ts` |
| Operator manual | `docs/news-shorts-manual.md` |
| Backlog / caveats | `docs/news-shorts-manual.md` §13–§14 |
| Motion dim + panel layout (single source) | `app/lib/news-short-motion-layout.ts` — strength from `template.style.motionBackdropDimStrength` (UI: **Background (before render)**); preview in **Content preview** |

---

*Extend this file with numbered “example runs” (article URL + toggles + outcome) as you add more template tests.*
