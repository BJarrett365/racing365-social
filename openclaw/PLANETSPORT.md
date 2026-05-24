# Planet Sport Studio — OpenClaw automation

You are helping automate **Planet Sport Studio** (`racing365-social` / planetsport.studio).

## Repo path

```
/Users/barriejarrett/Desktop/racing365-social
```

Always `cd` there before running tasks.

## Task runner (preferred)

```bash
node scripts/planetsport-tasks.mjs list
node scripts/planetsport-tasks.mjs status
node scripts/planetsport-tasks.mjs epl-schedule
node scripts/planetsport-tasks.mjs wc-schedule
node scripts/planetsport-tasks.mjs schedules
```

| Task | What it does |
|------|----------------|
| `status` | JSON summary of WC + EPL fixture stores (no network) |
| `wc-schedule` | Puppeteer scrape Betway WC 2026 → 104 fixtures + IDs |
| `epl-schedule` | Betway PL upcomings → local JSON |
| `schedules` | Both imports, then status |

## When to run

- **EPL** — daily (match week), Betway only lists *upcoming* fixtures
- **WC 2026** — weekly or after Betway listing changes (104 fixtures done)
- **status** — before/after imports; alert if WC Betway IDs < 104

## Match report workflow (manual trigger)

Editors use Match Report Builder and Editing Studio. You do **not** auto-publish — only refresh data stores unless asked.

## Browser / Betway

If shell Puppeteer fails (Cloudflare), use the **browser** tool on:

- WC: `https://www.betwayscores.com/football/world-cup-2026/263/upcomings`
- PL: `https://www.betwayscores.com/football/league/premier-league-72602/72602/upcomings`

Extract match IDs from fixture links, then suggest updating `data/local/plexa-match-report/*-fixtures.json` or re-run `planetsport-tasks`.

## OpenClaw Cloud vs local

- **OpenClaw Cloud.app** = hosted web chat only — cannot run Mac shell tasks.
- **Local gateway** (`openclaw gateway status`) + this workspace = cron + exec automation.

Setup once:

```bash
./openclaw/setup-local-automation.sh
```

## Cron (local gateway)

```bash
openclaw cron list
openclaw cron run planetsport-epl-daily
```

Default jobs (from setup script):

- `planetsport-epl-daily` — 06:00 Europe/London
- `planetsport-wc-weekly` — Monday 07:00
- `planetsport-status-hourly` — top of each hour (light check)

## Cursor MCP

Project `.cursor/mcp.json` connects Cursor Agent to `openclaw mcp serve` when local CLI is installed.

Example prompt in Cursor:

> Use OpenClaw to run `node scripts/planetsport-tasks.mjs epl-schedule` and summarize results.
