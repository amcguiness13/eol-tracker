# EOL Tracker

Tracks end-of-life, deprecation, and support-window deadlines for your technology stack, using
[endoflife.date](https://endoflife.date) as the data source. Single-user, runs locally.

## Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node + Express + TypeScript
- **Database**: SQLite via Prisma
- **Data source**: [endoflife.date v1 API](https://endoflife.date/docs/api/v1/) (read-only, public,
  cached locally with a TTL rather than called on every request)

## Project layout

```
packages/
  shared/    # TypeScript types shared by frontend and backend
  backend/   # Express API, Prisma schema, endoflife.date client + cache, business logic
  frontend/  # Vite + React app
```

## Setup

Requires Node 20+.

```bash
npm install
cp packages/backend/.env.example packages/backend/.env   # adjust if needed
npm run prisma:migrate                                    # creates packages/backend/prisma/dev.db
```

## Running locally

In two terminals:

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (proxies /api to the backend)
```

## Tests

```bash
npm test
```

Covers the endoflife.date cache layer, the EOL status-calculation logic, and CSV import validation —
the parts of this app worth testing in isolation from the UI.

## Data model

Two clearly separated concerns:

- **App data** (persisted indefinitely): `StackItem`, `Threshold`, `Notification` — your saved stack,
  alert thresholds, and generated notifications.
- **endoflife.date cache** (`EolCache`, TTL-bound): responses from the endoflife.date API. Nothing from
  endoflife.date is persisted permanently — the dashboard always joins your saved `product` + `cycle`
  against the current cached API data, so refreshing the cache is the only way stale data gets updated.

Every `StackItem` has a `source` field (`manual` | `github` | `azure` | `gcp`). Only `manual` (via the
selector UI or CSV import) is implemented today; the field exists so future auto-detection integrations
(GitHub/Azure/GCP) can populate the same schema without a migration.

## CSV import/export format

Columns, in order:

| Column        | Required | Notes                                                                 |
|---------------|----------|------------------------------------------------------------------------|
| `product`     | yes      | endoflife.date product slug (e.g. `ubuntu`, `nodejs`, `postgresql`). Case-insensitive on import, stored lowercase. |
| `cycle`       | yes      | Must be a real release cycle for that product (e.g. `22.04`, `18`, `3.11`) — validated against the live API, no free-text like "latest". |
| `environment` | no       | Free text (e.g. `prod`, `staging`). Defaults to `unspecified`.        |
| `owner`       | no       | Free text (team or person).                                           |
| `notes`       | no       | Free text.                                                             |
| `source`      | no       | One of `manual`, `github`, `azure`, `gcp`. Defaults to `manual`.       |

Example:

```csv
product,cycle,environment,owner,notes,source
ubuntu,22.04,prod,platform-team,,manual
nodejs,18,prod,web-team,,manual
postgresql,14,prod,data-team,primary db,manual
python,3.11,dev,,,manual
```

Import is all-or-nothing: every row is validated (product exists, cycle exists for that product)
before anything is written. The import screen shows a full validation report — fix the CSV and
re-upload, or fix inline, before confirming. Use "Download template CSV" for a blank starting point
and "Download my current stack as CSV" to export in the same format for editing and re-import.

## Status calculation

For each stack item, status is computed from the product's cycle data in the cache:

- **Supported** (green) — not within any configured threshold of EOL
- **Approaching EOL** (amber) — within a configured threshold (default 90/30/7 days, configurable
  globally or per item)
- **End of Life** (red) — past the EOL date

`End of Active Support` (where the API distinguishes it from full EOL) is shown separately as the
"support end date" when applicable.

## Notifications & thresholds

Global thresholds default to 90/30/7 days before EOL (seeded automatically on first run) and can be
edited from the Notifications page; a stack item can also be given its own threshold set that
overrides the global one. Whenever the cache is refreshed (daily, on schedule, or via "Refresh from
endoflife.date" / "Check thresholds now" in the UI) or a stack item is added/imported, thresholds are
re-checked and an in-app notification is created for each newly-crossed threshold — re-running the
check never creates duplicates for the same item/threshold/EOL-date combination. Notifications are
in-app only today; `Notification.channel` already models `email`/`webhook` for future channels.

## API overview

All routes are mounted under `/api`:

| Route | Purpose |
|---|---|
| `GET /products`, `/products/:slug`, `/categories`, `/tags` | Cached endoflife.date catalog, filterable by `q`/`category`/`tag` |
| `GET/POST /stack`, `PUT/DELETE /stack/:id` | Your saved stack items |
| `POST /stack/import/validate`, `POST /stack/import/commit` | CSV validation report / atomic commit |
| `GET /stack/template.csv`, `GET /stack/export.csv` | Download blank template / current stack as CSV |
| `GET /dashboard` | Stack items joined with live computed status |
| `POST /refresh` | Manually refresh the cache for every product in your stack |
| `GET/PUT /thresholds`, `GET /notifications`, `POST /notifications/:id/read`\|`dismiss`, `POST /notifications/generate` | Thresholds and notifications |

## Roadmap (out of scope for now, designed for)

- Auto-detecting stack items from GitHub repos, Azure resources, or GCP projects, populating the same
  `StackItem` schema with `source` set to `github`/`azure`/`gcp` instead of `manual`.
- Email/webhook notification channels (the `Notification.channel` field already supports this).
