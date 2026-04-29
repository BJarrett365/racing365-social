# Plexa Install Guide

This guide covers a local Plexa install for development, demos, and internal testing.

## Requirements

- Node.js 20+
- npm
- FFmpeg on your PATH, or `FFMPEG_PATH` set in `.env.local`
- Chromium/Chrome for Puppeteer renders

Puppeteer installs Chromium during `npm install`. If render jobs fail because Chrome cannot be found, run:

```bash
npm run puppeteer:install
```

## First Install

```bash
cd racing365-social
cp .env.example .env.local
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:8081
```

The dev server runs on port `8081`.

## Production Build

```bash
npm run build
npm start
```

Do not use `npm start` until `npm run build` has completed.

## Admin Setup

Open:

```text
/admin
```

Use Admin to store provider keys and settings for:

- OpenAI
- DeepL
- ElevenLabs
- FFmpeg path
- live/video provider settings

Admin values are stored locally in:

```text
data/local/admin-settings.json
```

Set `ADMIN_TOKEN` in production to protect admin saves.

## Language Studio Setup

Open:

```text
/language-studio
```

Use the default PlanetF1 feed:

```text
https://www.planetf1.com/partner-media-content-feed
```

Recommended import options:

- Process article images and store them in the Library
- Follow article URLs and import the full article body

## Generated Files

Plexa writes generated and local runtime files under:

```text
output/
data/local/
```

Do not commit secrets or generated output.
