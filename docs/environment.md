# Environment Variables

Copy `.env.example` to `.env.local` for local development.

```bash
cp .env.example .env.local
```

Do not commit `.env.local` or provider keys.

## Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_TOKEN` | Production recommended | Protects Admin writes. |
| `FFMPEG_PATH` | Optional | Explicit FFmpeg binary path. |
| `PUPPETEER_EXECUTABLE_PATH` | Optional | Explicit Chrome/Chromium path. |
| `DEV_HOST` | Optional | Override dev host binding. |

## Language Studio

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Required for OpenAI translation/localisation | Used by Language Studio and OpenAI TTS. |
| `LANGUAGE_OPENAI_MODEL` | Optional | Overrides the Language Studio OpenAI model. |
| `DEEPL_API_KEY` | Optional | Enables DeepL translation provider. |
| `DEEPL_API_URL` | Optional | Optional DeepL API URL override. |
| `CRON_SECRET` | Production recommended | Protects cron routes when called outside platform cron. |

Language Studio provider settings can also be managed from Admin.

## Client API Keys

Client API keys are created in:

```text
Language Studio -> Client Access
```

Raw client keys are shown once. Plexa stores only a SHA-256 hash in local storage.

## Vercel Cron

The repo includes `vercel.json` with:

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

This checks the PlanetF1 partner feed twice per day.

## Local Storage Files

Local runtime configuration:

```text
data/local/admin-settings.json
data/local/language-studio.json
```

Generated assets:

```text
output/
```
