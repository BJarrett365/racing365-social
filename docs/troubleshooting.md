# Troubleshooting

## Dev Server Will Not Load

Check:

```text
http://127.0.0.1:8081/healthz.txt
http://127.0.0.1:8081/api/health
```

If the port is stuck:

```bash
npm run dev:kill-port
npm run dev
```

## Feed Imports No Body

Use the PlanetF1 partner feed:

```text
https://www.planetf1.com/partner-media-content-feed
```

Ensure this option is enabled:

```text
Follow article URLs and import the full article body
```

The partner feed itself does not contain the full body. Plexa follows each article URL to scrape the full body.

## Images Do Not Appear In Library

Ensure this option is enabled:

```text
Process article images and store them in the Library
```

Images are saved under:

```text
output/images/library/
```

Check the article row for `Image saved to Library`.

## Translation Fails

Check Admin or `.env.local` for:

```text
OPENAI_API_KEY
DEEPL_API_KEY
```

`Translate and rewrite` requires OpenAI because it needs editorial rewriting.

## Client API Returns 401

Check:

- The key was copied correctly.
- The key has not been revoked.
- The client is active.
- The key is active.
- The requested format is allowed for both the client and key.

Use either:

```http
Authorization: Bearer CLIENT_KEY
```

or:

```text
?key=CLIENT_KEY
```

## Client API Returns Empty Items

Only approved translations are returned.

Check:

- Translation status is `approved`.
- Client allowed language includes the translation language.
- Client allowed brand includes the source brand.
- API key allowed language and brand also match.

## Cron Not Running

Check hosting support for scheduled functions.

For Vercel, confirm `vercel.json` contains:

```json
{
  "path": "/api/cron/language-feed",
  "schedule": "0 6,18 * * *"
}
```

If calling manually and `CRON_SECRET` is set, include:

```http
Authorization: Bearer CRON_SECRET
```

## Language Studio rewrite: “Background rewrite worker never started”

This means a rewrite job stayed `pending` and never reached `running` (usually on Netlify live).

**Cause:** The API route must invoke `/.netlify/functions/language-rewrite-background` before returning — not only inside Next.js `after()`, which can be dropped when the Lambda finishes.

**Fix (deploy):** Ensure the latest deploy includes the rewrite route fix that invokes the background function synchronously and marks the job `running` when Netlify accepts the request.

**If it still fails after deploy:**

1. Netlify → **Functions** → confirm `language-rewrite-background` is listed (from `netlify/functions/language-rewrite-background.mts`).
2. Check function logs for `[language-rewrite-background] starting` or auth errors.
3. If `CRON_SECRET` is set in production, it must match on both the Next API route and the background function (same site env).
4. Fallback: the route runs the rewrite inline (up to 15 minutes) when the background function returns 404/502/503.

## No Export XML/JSON Button

Exports require approved translations.

In Review Queue:

1. Select translation.
2. Click `Approve`.
3. Export XML or JSON.
