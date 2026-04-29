# Client API Reference

The Client API returns approved Language Studio translations for a client API key.

## Authentication

Preferred:

```http
Authorization: Bearer CLIENT_KEY
```

Fallback:

```text
?key=CLIENT_KEY
```

Keys are created in:

```text
Language Studio -> Client Access
```

## JSON Endpoint

```http
GET /api/client-api/translations
Authorization: Bearer CLIENT_KEY
```

Response:

```json
{
  "items": [
    {
      "id": "translation-id",
      "sourceArticleId": "source-guid-or-id",
      "sourceBrand": "PlanetF1",
      "sourceUrl": "https://www.planetf1.com/partner-media-content-feed",
      "canonicalUrl": "https://www.planetf1.com/news/example",
      "author": "Jamie Woodhouse",
      "publishDate": "2026-04-29T10:30:39Z",
      "modifiedDate": "2026-04-29T10:45:00Z",
      "originalImageUrl": "https://...",
      "imageLibraryRel": "images/library/...",
      "targetLanguage": "es",
      "targetLanguageLabel": "Spanish",
      "title": "Translated title",
      "standfirst": "Translated standfirst",
      "body": "Translated body",
      "seoTitle": "Translated SEO title",
      "metaDescription": "Translated meta description",
      "tags": ["Mercedes", "George Russell"],
      "slug": "translated-slug",
      "approvedAt": "2026-04-29T12:00:00.000Z",
      "updatedAt": "2026-04-29T12:00:00.000Z"
    }
  ]
}
```

## XML Endpoint

```http
GET /api/client-feeds/translations.xml
Authorization: Bearer CLIENT_KEY
```

Response:

```xml
<feed>
  <title>Plexa Language Studio client feed</title>
  <generatedAt>2026-04-29T12:00:00.000Z</generatedAt>
  <item>
    <id>translation-id</id>
    <sourceArticleId>source-guid-or-id</sourceArticleId>
    <sourceBrand>PlanetF1</sourceBrand>
    <canonicalUrl>https://www.planetf1.com/news/example</canonicalUrl>
    <author>Jamie Woodhouse</author>
    <publishDate>2026-04-29T10:30:39Z</publishDate>
    <modifiedDate>2026-04-29T10:45:00Z</modifiedDate>
    <imageUrl>https://...</imageUrl>
    <imageLibraryRel>images/library/...</imageLibraryRel>
    <targetLanguage>es</targetLanguage>
    <title><![CDATA[Translated title]]></title>
    <standfirst><![CDATA[Translated standfirst]]></standfirst>
    <body><![CDATA[Translated body]]></body>
    <seoTitle><![CDATA[Translated SEO title]]></seoTitle>
    <metaDescription><![CDATA[Translated meta description]]></metaDescription>
    <slug>translated-slug</slug>
    <tags>
      <tag>Mercedes</tag>
      <tag>George Russell</tag>
    </tags>
    <approvedAt>2026-04-29T12:00:00.000Z</approvedAt>
    <updatedAt>2026-04-29T12:00:00.000Z</updatedAt>
  </item>
</feed>
```

## Filtering

Filtering is controlled by the client and key permissions:

- Allowed brands
- Allowed languages
- Allowed formats

The endpoint does not currently accept public filter parameters.

## Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `401` | Missing, invalid, inactive, or revoked key |

## Important Rules

- Only approved translations are returned.
- Drafts and rejected translations are never returned.
- The client can only access formats, brands, and languages allowed by both the client and API key.
