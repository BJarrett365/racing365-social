# Netlify Deployment

This guide deploys Plexa to Netlify as a private, login-protected Next.js app.

## Build Settings

Netlify reads `netlify.toml`.

- Build command: `next build`
- Publish directory: `.next`
- Node version: `20`
- Next.js runtime: `@netlify/plugin-nextjs`

## Required Environment Variables

Set these in Netlify under Site configuration -> Environment variables.

```bash
PLEXA_SESSION_SECRET=
PLEXA_SETUP_TOKEN=
PLEXA_PUBLIC_URL=https://your-netlify-site.netlify.app
ADMIN_TOKEN=
OPENAI_API_KEY=
DEEPL_API_KEY=
CRON_SECRET=
LANGUAGE_OPENAI_MODEL=gpt-4o-mini
```

Generate secrets locally:

```bash
openssl rand -base64 32
```

Use separate values for `PLEXA_SESSION_SECRET`, `PLEXA_SETUP_TOKEN`, `ADMIN_TOKEN`, and `CRON_SECRET`.

## First Admin

After deploy:

1. Open `https://your-netlify-site.netlify.app/setup`.
2. Enter the `PLEXA_SETUP_TOKEN`.
3. Create the first admin user.
4. Use `/admin` to invite more users.

## Cron Import

The existing cron endpoint is:

```text
/api/cron/language-feed
```

Netlify does not use `vercel.json` crons. For now, schedule this with an external cron service or Netlify Scheduled Functions later. The request must include the cron secret expected by the endpoint.

## Storage Notes

Netlify serverless functions do not provide durable writable filesystem storage.

Plexa uses Netlify Blobs for hosted auth users, admin settings, and Language Studio records, so these persist on Netlify without writing to `data/local`.

Before production use, move the remaining generated media data to durable storage:

- generated Library images under `output/`

Recommended production setup:

- Users/auth data: Netlify Blobs for Netlify hosting, or Supabase/PostgreSQL for a database-backed install
- Language Studio data: Netlify Blobs for Netlify hosting, or Supabase/PostgreSQL for a database-backed install
- Images/output assets: S3, Cloudflare R2, or Netlify Blobs

The current local JSON setup is useful for local testing, but it should not be used as writable storage in Netlify functions.
