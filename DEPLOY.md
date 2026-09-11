# Deploying to Coolify

This app is a Next.js server (App Router, Server Actions) backed by a **SQLite** database via Prisma. It ships with a multi-stage `Dockerfile` that builds a minimal `output: "standalone"` production image and runs `prisma migrate deploy` automatically on container start.

## 1. Create the resource in Coolify

1. New Resource → **Application** → pick your Git source (GitHub/GitLab/etc. or public repo URL) and branch `main`.
2. Build Pack: **Dockerfile** (Coolify will detect the `Dockerfile` at the repo root automatically).
3. Port: **3000** (matches `EXPOSE 3000` / `PORT=3000` in the image).

## 2. Persistent storage for the SQLite database

SQLite stores data in a single file on disk. The container filesystem is ephemeral, so you **must** mount a volume or the database resets on every deploy.

In Coolify, add a **Persistent Storage / Volume**:

- Mount path: `/app/data`
- (Coolify creates and manages the volume on the host)

Then set `DATABASE_URL` (below) to point inside that mounted directory, e.g. `file:/app/data/prod.db`.

> If you outgrow SQLite (multiple replicas, need for concurrent writes, backups), switch the `datasource` provider in `prisma/schema.prisma` to `postgresql` and point `DATABASE_URL` at a Postgres service (Coolify can provision one for you), then redeploy.

## 3. Environment variables

Set these in the Coolify application's **Environment Variables** tab (mark secrets as such):

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:/app/data/prod.db` | Must live under the mounted volume path |
| `SESSION_SECRET` | (long random string) | Generate with `openssl rand -hex 32`. Used to sign the admin session cookie |
| `ADMIN_EMAIL` | `owner@yourdomain.com` | Used by `prisma/seed.ts` if you run the seed manually |
| `ADMIN_PASSWORD` | (strong password) | Same as above |
| `NODE_ENV` | `production` | Already set in the image, but fine to set explicitly |

Do **not** commit real secrets — `.env` is gitignored; use `.env.example` as the template.

## 4. First deploy / migrations

The container's entrypoint (`docker-entrypoint.sh`) runs `npx prisma migrate deploy` before starting the server, so schema migrations in `prisma/migrations/` apply automatically on every deploy/restart. No manual step needed for schema setup.

To seed the initial admin user / menu data after the first deploy, either:

- Run it locally against the same `DATABASE_URL` (if reachable), or
- Use Coolify's "Execute Command" / terminal on the running container:
  ```bash
  node prisma/seed.ts
  ```
  (or add a one-off deployment step that runs `npm run db:seed`).

## 5. Health check

Coolify's default TCP/HTTP check against port 3000 and `/` works out of the box — the app serves a normal page there.

## 6. Redeploys

Push to `main` (or trigger a manual deploy in Coolify). Coolify rebuilds the Docker image, restarts the container, and the entrypoint reapplies any new Prisma migrations automatically. The SQLite file on the mounted volume persists across deploys.
