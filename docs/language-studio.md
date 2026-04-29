# Language Studio Admin Guide

Language Studio imports articles, translates/localises them, supports review, and exports approved content as XML or JSON.

Open:

```text
/language-studio
```

## Imports

Default feed:

```text
https://www.planetf1.com/partner-media-content-feed
```

Recommended options:

- Process article images and store them in the Library
- Follow article URLs and import the full article body

The partner feed contains title, link, publish date, guid, and `media:content` image URLs. Plexa follows each article URL to import the full body, author, publish date, edit date, standfirst/meta description, and image.

Images are saved under:

```text
output/images/library/language-{brand}-{importId}/
```

## Translation Queue

Use the queue to choose:

- Selected articles
- All imported articles
- Provider mode
- Translation mode
- Target languages

Provider modes:

- OpenAI only
- DeepL only
- DeepL + OpenAI localisation

Translation modes:

- Translate only
- Translate + localise
- Translate and rewrite
- Regenerate headline only
- Regenerate SEO only
- Regenerate summary only

## Review Queue

The review editor shows:

- Original article
- Author
- Publish date
- Edit date
- Image path
- Body length
- Translated version

Actions:

- Save
- Approve
- Reject
- Regenerate
- Export XML
- Export JSON

Only approved translations are exposed to client XML/JSON feeds.

## Export Feeds

Exports are generated from approved translations.

Export includes:

- Source article metadata
- Original image URL
- Library image path
- Target language
- Translated title
- Standfirst
- Body
- SEO title
- Meta description
- Tags
- Slug

On export, Plexa also creates a translated-name copy of the Library image where possible.

## Cron Import

Endpoint:

```text
GET /api/cron/language-feed
```

Vercel schedule:

```text
0 6,18 * * *
```

This checks the PlanetF1 partner feed twice per day, dedupes by source article ID or canonical URL, imports full bodies, and saves images.
