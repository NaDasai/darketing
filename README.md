# Darketing

Multi-domain content curation with AI-powered rewriting. Aggregates RSS feeds, scores articles for relevance against your project's audience and domain, rewrites the top N as original X and LinkedIn posts, and gives you a human approval step before you copy-paste to publish.

> **MVP scope:** No direct posting to social networks. No auth. Copy-paste workflow only.

---

## Architecture

```
darketing/
├── apps/
│   ├── backend/        # Fastify API + BullMQ worker + cron scheduler
│   └── frontend/       # Next.js 14 (App Router) + Tailwind + Zustand + TanStack Query
└── packages/
    └── shared/         # Zod schemas + enums shared between FE and BE
```

**Stack:** Node 20 · TypeScript 5 · Fastify 4 · Mongoose 8 · MongoDB 7 · BullMQ 5 · Redis 7 · Next.js 14 · TailwindCSS 3 · Zustand · TanStack Query · OpenRouter (LLM)

**Pipeline (daily cron, also triggerable manually per project):**

1. Fetch RSS sources for each active project
2. Normalize articles, strip HTML, skip short content
3. Deduplicate by URL hash
4. Summarize new items via OpenRouter
5. Score by recency × keyword match × length
6. Select top N by score
7. Generate X + LinkedIn post drafts per selected item
8. Human reviews, edits, approves, copies

---

## Prerequisites

- **Node.js 20** — `nvm use` will pick up `.nvmrc`
- **pnpm 9+** — `npm install -g pnpm`
- **MongoDB 7** on `localhost:27017`
  - macOS: `brew install mongodb-community@7.0 && brew services start mongodb-community@7.0`
  - Standalone `mongod` is fine — no replica set needed.
- **Redis 7** on `localhost:6379`
  - macOS: `brew install redis && brew services start redis`
- **OpenRouter API key** — free tier works. Grab one at https://openrouter.ai/keys

Quick check:

```bash
brew services list | grep -E 'mongodb|redis'   # both should read "started"
redis-cli ping                                  # → PONG
mongosh --eval 'db.runCommand({ping:1})'        # → { ok: 1 }
```

---

## Quickstart

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
# Open apps/backend/.env and paste your OPENROUTER_API_KEY.

# 3. Seed the database (1 demo project + 2 RSS sources)
pnpm seed

# 4. Start backend, worker, and frontend together
pnpm dev
```

Backend: http://localhost:4000 · Frontend: http://localhost:3000

---

## Integration test checklist

Walk this list top-to-bottom after a fresh `pnpm install && pnpm seed`. The MVP is "done" when every step passes on your machine. Each step lists the **expected** result; anything else is a regression.

### 1. Services up

- [ ] `brew services list` shows `mongodb-community` and `redis` both **started** (or your equivalent).
- [ ] `curl http://localhost:4000/health` returns `{"ok":true,"service":"darketing-backend"}` after `pnpm dev`.
- [ ] The `pnpm dev` terminal shows three healthy streams (`backend`, `worker`, `frontend`) with no crash loops.

### 2. Frontend smoke

- [ ] Open http://localhost:3000 — redirects to `/projects`.
- [ ] The page renders in dark mode by default (zinc background, indigo accent).
- [ ] The seeded **Tech Insights Demo** card shows `PROFESSIONAL` tone, the demo domain, and `2 sources`.

### 3. Create a project

- [ ] Click **+ New project**. The modal opens with empty fields.
- [ ] Submit the empty form — inline field errors appear on required fields (name, tone, domain, audience).
- [ ] Fill all fields and submit. The modal closes, a **Project created** toast fires, and the new card appears at the top of the grid.

### 4. Add and validate a source

- [ ] Open the new project, go to the **Sources** tab.
- [ ] Paste a bogus URL (`https://not-a-real-feed.example/feed.xml`) — the backend rejects it with a `422` visible via an **Failed to add source** toast.
- [ ] Paste a real feed (try `https://hnrss.org/frontpage`) — it appears in the list.
- [ ] Click **Remove** next to it — the row disappears after a **Source removed** toast.

### 5. Run the pipeline manually

- [ ] Return to the seeded **Tech Insights Demo** project.
- [ ] Click **Run pipeline now**. A **Pipeline enqueued (job XXXXXXXX…)** toast appears.
- [ ] Watch the `worker` stream — within ~60–120 s you should see log lines for fetch → summarize → score → generate, then a final `project.lastRunAt updated`.
- [ ] The dashboard header's **Last run** badge flips to "a few seconds ago".

### 6. Inspect content

- [ ] Open the **Content** tab. Recent articles appear with a score badge (green ≥0.7, amber ≥0.4, neutral below).
- [ ] Top N (5 by default) items are marked with a **Selected** badge.
- [ ] Clicking an article title opens the original source in a new tab.

### 7. Review a generated post

- [ ] Open the **Posts** tab. The default filter is `Suggested` / `All`. You should see two draft cards per selected content item (one X, one LinkedIn).
- [ ] Toggle **X** / **LinkedIn** — the grid filters immediately.
- [ ] Click a card to open `/posts/[id]`.

### 8. Edit + save

- [ ] The left pane shows the draft in a textarea; the right pane shows a platform-accurate preview.
- [ ] For an X post, type until you're past 260 chars — the counter flips **amber**. Past 280, it flips **red**. (Saving is still allowed; the limit is advisory.)
- [ ] Edit the text. Hit **⌘S** — a **Saved** toast fires, and the preview reflects the edit.
- [ ] Refresh the page — your edit persists (loaded as `editedContent`).

### 9. Approve + copy

- [ ] Click **Approve (⌘↵)** or use the keyboard shortcut. The status badge flips to `APPROVED` and a toast fires.
- [ ] Blur the textarea (click outside), then press **⌘C** — a **Copied to clipboard** toast fires.
- [ ] Paste into a plaintext editor to confirm the content matches the draft.
- [ ] Navigate back to the project and switch the Posts tab filter to **Approved** — the post you just approved is listed.

### 10. Reject

- [ ] Open a different `SUGGESTED` post and click **Reject**. It disappears from the `Suggested` list and shows up under `Rejected`.

### 11. Settings

- [ ] On the project dashboard, open the **Settings** tab.
- [ ] Change the tone to `BOLD` and save. A **Project updated** toast fires; the tone badge on the header updates.
- [ ] Uncheck **Run on schedule** and save. The **Run pipeline now** button becomes disabled (inactive projects can't be run).
- [ ] Re-check **Run on schedule** and save — the button becomes enabled again.

### 12. Delete

- [ ] Still on the project dashboard, click **Delete**. Confirm the browser prompt.
- [ ] The app navigates back to `/projects` with a **Project deleted** toast, and the card is gone.
- [ ] Spot-check: `mongosh darketing --eval 'db.contentitems.countDocuments({projectId: ObjectId("<old id>")})'` returns `0` — the cascade took its children too.

### 13. Cron (optional)

- [ ] Temporarily set `CRON_SCHEDULE=*/2 * * * *` in `apps/backend/.env`, restart the worker.
- [ ] Observe the worker log fire a run within two minutes without any UI action.
- [ ] Revert `CRON_SCHEDULE` to the default (`0 6 * * *`).

If every box is ticked, the MVP works end-to-end.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Projects page shows "Couldn't load projects" | Backend not running or unreachable | Check `pnpm dev` output; confirm `curl http://localhost:4000/health` |
| `ECONNREFUSED 127.0.0.1:27017` at boot | Mongo isn't running | `brew services start mongodb-community@7.0` |
| `ECONNREFUSED 127.0.0.1:6379` from worker | Redis isn't running | `brew services start redis` |
| Pipeline runs but **Posts** tab stays empty | OpenRouter 429 / parse failures | Check worker logs for `llm.generatePosts` errors. The free model occasionally rate-limits — retry or swap `OPENROUTER_MODEL` per CLAUDE.md. |
| `OPENROUTER_API_KEY is required` at run time | Key empty in `.env` | Paste key; the env schema allows empty for boot so `pnpm seed` can still run |
| Source addition fails with 422 | Feed URL not reachable or not valid RSS | Try it in a feed reader first; many sites require the `/rss/` or `/feed.xml` path |
| Worker hot-reloads throw `OverwriteModelError` | Mongoose model double-registration | Shouldn't happen — models go through `getOrCreateModel()`. If it does, stop the watcher and relaunch. |
| `EADDRINUSE :4000` or `:3000` | Another process bound to the port | `lsof -i :4000` / `:3000` then `kill <pid>` |

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Runs backend, worker, frontend concurrently |
| `pnpm dev:backend` | Fastify API only |
| `pnpm dev:worker` | BullMQ worker + cron only |
| `pnpm dev:frontend` | Next.js only |
| `pnpm seed` | Wipes collections, creates demo project + sources |
| `pnpm build` | Typecheck every workspace (`tsc --noEmit`) |
| `pnpm typecheck` | Same as `build` |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm format` | Prettier write |

> **Note:** there is no compile step. `tsx` runs TypeScript directly in dev and prod. `pnpm build` is type-check only.

---

## Environment variables

Full reference in [apps/backend/.env.example](apps/backend/.env.example) and [apps/frontend/.env.local.example](apps/frontend/.env.local.example). Key ones:

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | backend | Mongo connection string |
| `REDIS_URL` | backend | Redis connection string |
| `OPENROUTER_API_KEY` | backend | Required to generate posts (validated at call time, not boot) |
| `OPENROUTER_MODEL` | backend | Defaults to `meta-llama/llama-3.3-70b-instruct:free` |
| `CRON_SCHEDULE` | backend | Daily pipeline cron, default `0 6 * * *` |
| `DEFAULT_TOP_N` | backend | Articles selected per project per run (overridable per project) |
| `WORKER_CONCURRENCY` | backend | Parallel pipeline jobs (default 2) |
| `LLM_RATE_LIMIT_PER_SEC` | backend | Outbound LLM call rate cap (default 10/s) |
| `CORS_ORIGIN` | backend | Allowed browser origin, default `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL used by the SPA |

---

## API reference

All endpoints return JSON. Errors use `{ "error": { "code", "message", "details"? } }`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/projects` | Create project |
| GET | `/projects` | List projects (with `sourcesCount`) |
| GET | `/projects/:id` | One project with `sourcesCount`, `contentCount`, `lastRunAt` |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Cascade-delete project + sources + content + posts |
| POST | `/projects/:id/run` | Enqueue a pipeline run (409 if inactive) |
| POST | `/projects/:id/sources` | Add a source — validates the feed is reachable |
| GET | `/projects/:id/sources` | List sources |
| DELETE | `/sources/:id` | Delete source |
| GET | `/projects/:id/content` | Recent content items (`?selected=true&limit=…`) |
| GET | `/posts` | Paginated posts (`?projectId&status&platform&limit&cursor`) |
| GET | `/posts/:id` | One post |
| PATCH | `/posts/:id` | Update `editedContent` or `status` |

Request/response contracts are the Zod schemas in [packages/shared/src](packages/shared/src).

---

## Constraints

- No posting to X or LinkedIn APIs — copy-paste only.
- No auth in MVP. A `// TODO: auth` marker in [apps/backend/src/app.ts](apps/backend/src/app.ts) shows where a `preHandler` would attach.
- OpenRouter is the only LLM gateway. The scoring and dedup logic is fully local.
