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

## No Export XML/JSON Button

Exports require approved translations.

In Review Queue:

1. Select translation.
2. Click `Approve`.
3. Export XML or JSON.
