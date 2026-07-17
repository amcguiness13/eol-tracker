# Render deployment & Postgres setup

This file documents the steps to provision a PostgreSQL database on Render and configure the `eol-tracker` services.

## 1) Provision a Postgres DB on Render

- In Render dashboard: **New → PostgreSQL** (Managed Database).
- Choose plan and create the database. Wait until it's ready and then copy the connection string.

The connection string will look like:

```
postgresql://<username>:<password>@<host>:<port>/<database>?schema=public
```

## 2) Configure the backend service env var

- In Render, go to the `eol-tracker-backend` Web Service.
- Settings → Environment → Environment Variables → Add variable:

- Key: `DATABASE_URL`
- Value: the Render Postgres connection string (paste the value you copied)
- Mark it as secret/protected.

## 3) Ensure Prisma schema uses PostgreSQL

We switched `packages/backend/prisma/schema.prisma` provider to `postgresql`. No further changes are required unless you use Postgres-specific features.

## 4) Local verification (recommended before deploy)

Run these locally to confirm Prisma client generation and TypeScript build succeed:

```bash
cd packages/backend
npm ci
npx prisma generate
cd ../..
npm run build
```

If everything succeeds, push your changes (already pushed in this repo) and Render will build.

## 5) Render build & start commands

- If the service root is the repository root (recommended):

  Build command:
  ```bash
  npm ci && npm run build
  ```

  Start command:
  ```bash
  node packages/backend/dist/server.js
  ```

- If the service root is `packages/backend` instead, use:

  Build command:
  ```bash
  npm ci && npm run prisma:generate && npm run build
  ```

  Start command:
  ```bash
  node dist/server.js
  ```

Render will set the `PORT` environment variable for the service — ensure the backend reads `process.env.PORT` (the existing server uses it by default).

## 6) Frontend (Static Site)

- If you want a separate static site on Render, create a **Static Site** with:

  Build command:
  ```bash
  npm ci && npm run build --workspace packages/frontend
  ```

  Publish directory:
  ```text
  packages/frontend/dist
  ```

## 7) Redeploy / Auto-deploy

- With `render.yaml` present and services connected, Render can auto-create/update services.
- Push to the `main` branch to trigger builds. You can also trigger manual deploys from the Render UI.

## 8) Troubleshooting tips

- If TypeScript build fails on Render, check the build logs — common causes:
  - `prisma generate` not run before `tsc` (root `build` now runs it).
  - Missing `DATABASE_URL` when Prisma introspects or runs migrations.
- If you see runtime DB errors, verify credentials and that the DB is accessible from Render.

---

If you'd like, I can also create a small health-check route or add a README section that shows how to run a remote migration step-by-step.
