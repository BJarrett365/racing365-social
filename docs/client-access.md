# Client Access Guide

Client Access lets you provide a client with XML feed access, JSON API access, or both.

Open:

```text
Language Studio -> Client Access
```

## Create A Client

Each client has:

- Name
- Contact email
- Active/inactive status
- Allowed brands
- Allowed languages
- Allowed formats: XML, JSON, or both
- Notes

If an allow-list is empty in storage, it is treated as unrestricted for that field. In the UI, set values explicitly for normal client use.

Example:

```text
Name: Example Media
Allowed brands: PlanetF1
Allowed languages: es, it
Allowed formats: XML, JSON
```

## Issue An API Key

Create an API key for the client.

The raw key is shown once. Copy it immediately.

Plexa stores:

- Key hash
- Key prefix
- Label
- Client ID
- Allowed brands
- Allowed languages
- Allowed formats
- Created date
- Last used date
- Revoked date

Plexa does not store the raw key.

## Provide Access To The Client

JSON:

```text
GET /api/client-api/translations
Authorization: Bearer CLIENT_KEY
```

XML:

```text
GET /api/client-feeds/translations.xml
Authorization: Bearer CLIENT_KEY
```

Query-string fallback:

```text
/api/client-api/translations?key=CLIENT_KEY
/api/client-feeds/translations.xml?key=CLIENT_KEY
```

Prefer the `Authorization` header for production integrations.

## Revoke Access

In Client Access, use `Revoke` on the key.

Revoked keys can no longer access XML or JSON feeds.

## Access Logs

Client Access shows recent requests with:

- Date/time
- Format
- HTTP status
- Number of returned items

Logs are stored in Language Studio local data.

## Security Notes

- Only approved translations are returned.
- Draft and rejected translations are never exposed.
- API keys are hashed before storage.
- OpenAI, DeepL, and admin secrets are never exposed to clients.
- Use `ADMIN_TOKEN` in production for admin write protection.
