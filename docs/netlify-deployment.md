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

## Subpath hosting (`/l` and client feeds)

If the Studio is opened at **`https://planetsport.studio/l/...`**, feeds must use the **same path prefix** as the Next.js app, or you will get **404** on `/l/api/...` when the build has no `basePath`.

**Option A — App at site root (no `basePath`):** use feeds at the **origin root** (no `/l`):

```text
https://planetsport.studio/api/client-feeds/translations.xml?key=YOUR_KEY
```

**Option B — App built with a base path:** set at **Netlify → Environment variables** (and ensure the same value is present **at build time**):

```bash
NEXT_PUBLIC_BASE_PATH=/l
```

Then redeploy. Next.js will serve API routes as **`/l/api/client-feeds/...`**, and Language Studio “Copy URL” actions will include `/l` automatically.

`PLEXA_PUBLIC_URL` should match how users open the app (e.g. `https://planetsport.studio/l` if that is the canonical entry URL).

## First Admin

After deploy:

1. Open `https://your-netlify-site.netlify.app/setup`.
2. Enter the `PLEXA_SETUP_TOKEN`.
3. Create the first admin user.
4. Use `/admin` to invite more users.

## Cron Imports

Saved Language Studio crons are evaluated by:

```text
/api/cron/language-imports
```

Call this every 5 minutes. It checks saved cron jobs and only runs jobs whose schedule is due.

- Vercel uses `vercel.json` to call this path every 5 minutes.
- Local `npm run start` also polls this path every minute.
- Netlify does not use `vercel.json` crons. Schedule this path with an external cron service or Netlify Scheduled Functions.

When `CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`.

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
