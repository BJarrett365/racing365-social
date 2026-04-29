# Deployment Guide

Plexa is a Next.js app and can run on Vercel or another Node host.

## Build Commands

Install:

```bash
npm install
```

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

## Vercel

The repo includes `vercel.json` for Language Studio cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/language-feed",
      "schedule": "0 6,18 * * *"
    }
  ]
}
```

This checks the PlanetF1 partner feed twice daily.

## Required Production Settings

Set these in your hosting provider:

```text
ADMIN_TOKEN
OPENAI_API_KEY
CRON_SECRET
```

Optional:

```text
DEEPL_API_KEY
DEEPL_API_URL
LANGUAGE_OPENAI_MODEL
FFMPEG_PATH
PUPPETEER_EXECUTABLE_PATH
ELEVENLABS_API_KEY
RUNWAYML_API_SECRET
```

## Storage

The current MVP uses local JSON and local output folders:

```text
data/local/
output/
```

For long-lived production, move Language Studio data to Supabase and assets to durable object storage. The future schema is in:

```text
data/language-studio-schema.sql
```

## Cron Security

Set:

```text
CRON_SECRET=strong-random-value
```

When set, manual cron calls should include:

```http
Authorization: Bearer CRON_SECRET
```

## Client API Security

Client keys are created in:

```text
Language Studio -> Client Access
```

Use:

```http
Authorization: Bearer CLIENT_KEY
```

Do not send provider keys to clients.
