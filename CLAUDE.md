# Darketing — Claude session handoff

Context for any future Claude session continuing this build. The README is user-facing; this file is **engineer-facing** (what's done, what's not, what's easy to trip on).

---

## Product in one line

Multi-domain content curation: aggregate RSS → score relevance → rewrite top N as original X/LinkedIn posts → human approves → copy-paste to publish. No direct posting.

---

## Build plan (8 milestones)

| # | Milestone | Status |
|---|---|---|
| M1 | Folder structure + package.json + .env.example + README skeleton | ✅ Done |
| M2 | Mongoose models + shared Zod schemas + seed script | ✅ Done |
| M3 | Core services: `llm`, `rss`, `scoring`, `dedup` | ✅ Done |
| M4 | API modules: projects, sources, content, posts (Fastify routes + services) | ✅ Done |
| M5 | BullMQ worker + cron scheduler (ties M3 services together) | ✅ Done |
| M6 | Frontend scaffolding: Next.js App Router, Tailwind (dark mode), TanStack Query, Zustand | ✅ Done |
| M7 | Frontend pages: `/projects`, `/projects/[id]` dashboard, `/posts/[id]` editor | ✅ Done |
| M8 | Integration test checklist + README polish | ✅ Done |

**Execution protocol** — output full file contents per milestone (no `// ...` placeholders), then wait for user confirmation before proceeding.

---

## Tech stack (LOCKED — do not change without user approval)

| Layer | Choice | Pinned |
|---|---|---|
| Runtime | Node 20 LTS | `.nvmrc` = `20` |
| Language | TypeScript 5.6 | `strict: true` |
| API framework | **Fastify 4** | (not 5) |
| ODM | **Mongoose 8** | not Prisma — the user rejected Prisma |
| Database | **MongoDB 7**, standalone `mongod` | no replica set required |
| Queue | BullMQ 5 + ioredis | Redis 7 |
| Cron | `node-cron` | daily default `0 6 * * *` |
| LLM gateway | **OpenRouter** | free model default: `meta-llama/llama-3.3-70b-instruct:free` |
| RSS | `rss-parser` | 10s timeout, 2 retries |
| HTTP | axios | |
| Logger | pino + pino-pretty (dev) | |
| Frontend | **Next.js 14 App Router** | not 15 |
| Styling | TailwindCSS 3 | **dark mode as default** (`darkMode: 'class'`, indigo accent) |
| State | Zustand 5 (UI only) + TanStack Query 5 (server state) | |
| Validation | Zod 3 (shared FE/BE via `@darketing/shared`) | |
| Package manager | **pnpm 9** workspaces | |

**Explicitly out of scope:** Docker, Prisma, auth, PostgreSQL, direct X/LinkedIn posting, GraphQL, microservices.

---

## Monorepo layout

```
darketing/
├── apps/
│   ├── backend/            # Fastify API + worker + cron
│   │   ├── src/
│   │   │   ├── config/env.ts    ✅ Zod-validated env
│   │   │   ├── lib/
│   │   │   │   ├── db.ts        ✅ mongoose connect/disconnect
│   │   │   │   └── logger.ts    ✅ pino
│   │   │   ├── models/          ✅ Mongoose schemas (M2)
│   │   │   │   ├── Project.ts
│   │   │   │   ├── Source.ts
│   │   │   │   ├── ContentItem.ts
│   │   │   │   ├── GeneratedPost.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   └── index.ts
│   │   │   ├── modules/         ⏳ M4: projects|sources|content|posts (routes + controller + service)
│   │   │   ├── services/        ⏳ M3: llm|@|scoring|dedup + prompts/
│   │   │   ├── jobs/            ⏳ M5: queue.ts, cron.ts
│   │   │   ├── workers/         ⏳ M5: pipeline.worker.ts
│   │   │   ├── utils/           ⏳
│   │   │   ├── app.ts           ⏳ M4: Fastify plugins + route registration
│   │   │   └── server.ts        ⏳ M4: entry point
│   │   ├── scripts/seed.ts      ✅
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   └── frontend/           # Next.js 14 — only config scaffolded so far
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs      (transpilePackages: ['@darketing/shared'])
│       ├── tailwind.config.ts   (dark mode class strategy, indigo accent)
│       ├── postcss.config.js
│       ├── next-env.d.ts
│       └── .env.local.example
│       # ⏳ M6: src/app/, src/components/, src/lib/, src/store/
├── packages/
│   └── shared/             ✅ Zod schemas + enums, source of truth for API contracts
│       ├── src/
│       │   ├── enums.ts
│       │   ├── schemas/{common,project,source,content,post}.ts
│       │   └── index.ts     (barrel)
│       ├── package.json
│       └── tsconfig.json
├── .env.example            # master reference — each app copies its subset
├── package.json            # root workspace, concurrently runs dev scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs / .eslintignore
├── .prettierrc / .prettierignore
├── .editorconfig / .nvmrc / .gitignore
├── README.md               # user-facing
└── CLAUDE.md               # this file
```

---

## Key decisions (non-obvious, easy to trip on)

1. **No compile step for backend.** `tsx` runs everything in dev + prod. `pnpm --filter @darketing/backend build` is `tsc --noEmit` (type-check only). Backend tsconfig has `noEmit: true` and `moduleResolution: "Bundler"` so extensionless imports work. **Do not** try to `node dist/…` — there is no dist.

2. **`@darketing/shared` is consumed as raw TypeScript** via workspace protocol + `transpilePackages` on the frontend + `tsx` path aliases on the backend. No build step on the package. This works because all three consumers (tsx, Next, type-checker) understand TS source directly with the configured path mappings.

3. **`projectId` is denormalized on `GeneratedPost`.** The spec only listed `contentItemId`, but the API has `GET /posts?projectId=…&status=&platform=` and we want that to be a single indexed find, not a populate/aggregate. Set it at creation time in the worker.

4. **`lastRunAt` added to `Project`.** Spec's `GET /projects/:id` response includes "last run stats" — this field satisfies it. Worker writes it at end of each successful run.

5. **`BooleanStringSchema`** (not `z.coerce.boolean()`) for query flags. Native coerce treats `"false"` as truthy because `Boolean("false") === true`. Use `BooleanStringSchema` from `@darketing/shared` for any `?flag=true|false` query param.

6. **`OPENROUTER_API_KEY` is optional at boot.** Validated as empty-string-allowed in env schema. The LLM service enforces presence at call time. Reason: `pnpm seed` must run before the user has a key.

7. **Mongoose model registration guard.** All models use `getOrCreateModel()` from `models/helpers.ts`. Required because `tsx watch` re-imports modules on file change, which would otherwise throw `OverwriteModelError`.

8. **`toJSON` transform on every model** (`applyBaseToJSON`) converts `_id` → `id` string and strips `__v`. Also converts explicitly-passed ObjectId ref fields (e.g. `projectId`, `contentItemId`) to strings. This means controllers can return `doc.toJSON()` and it matches the Zod DTOs directly.

9. **Two env files at runtime**:
   - `apps/backend/.env` (copy of `apps/backend/.env.example`)
   - `apps/frontend/.env.local` (copy of `apps/frontend/.env.local.example`)
   - Root `.env.example` is the master reference only — not loaded by any process.

10. **Enums are uppercase string values** (`PROFESSIONAL`, `TWITTER`, `SUGGESTED`, etc.) stored as strings in MongoDB. The `as const` arrays in `packages/shared/src/enums.ts` are the single source of truth — Zod schemas and Mongoose enums both consume them.

11. **Concurrency + rate limits** come from env: `WORKER_CONCURRENCY=2`, `LLM_RATE_LIMIT_PER_SEC=10`. Use `p-limit` (already in backend deps) for the LLM rate limiter in M3.

12. **No Section-13 bonuses** (3 post variants, Jaro-Winkler title dedup, analytics). User opted out. `PostVariant` enum and nullable `variant` field exist in the schema, but the worker should only generate one post per platform and leave `variant: null`.

---

## Data model summary (for quick reference — actual schemas in `apps/backend/src/models/`)

```
Project { id, name, description, tone, targetAudience, domain,
          topNPerRun (default 5), isActive, lastRunAt, createdAt, updatedAt }
  └── hasMany Source
  └── hasMany ContentItem

Source { id, projectId, rssUrl, isActive, lastFetchedAt, createdAt, updatedAt }
  unique: (projectId, rssUrl)

ContentItem { id, projectId, sourceId, sourceUrl, urlHash (unique),
              title, rawContent, summary, score, selected,
              publishedAt, createdAt, updatedAt }
  indexes: (projectId, score DESC), (projectId, selected, createdAt DESC),
           (projectId, createdAt DESC)
  └── hasMany GeneratedPost

GeneratedPost { id, projectId, contentItemId, platform, variant (nullable),
                content, editedContent, status (default SUGGESTED),
                createdAt, updatedAt }
  indexes: (status, platform), (projectId, createdAt DESC),
           (projectId, status, platform)
```

Shared DTOs + input schemas live in `packages/shared/src/schemas/`. **Always use those Zod schemas in Fastify routes via `schema: { body: zodToJsonSchema(...) }` or a plugin like `fastify-type-provider-zod`** (to be added in M4).

---

## Remaining milestones — what "done" looks like

### M3 — Core services

**Files to create in `apps/backend/src/services/`:**

- `llm.service.ts` — OpenRouter wrapper. Signature from spec §6:
  ```ts
  generatePosts(input: GeneratePostsInput): Promise<GeneratePostsOutput>
  summarize(rawContent: string): Promise<string>
  ```
  - Use axios with base URL from env, `Authorization: Bearer ${OPENROUTER_API_KEY}`, `HTTP-Referer` + `X-Title` headers per OpenRouter docs.
  - Force JSON output via system prompt; validate with Zod; retry once on parse failure with stricter instruction; throw on second failure.
  - Log token usage (response.usage from OpenRouter).
  - Rate limit with `p-limit(env.LLM_RATE_LIMIT_PER_SEC)` — actually we need a per-second bucket, not just concurrency. Use `bottleneck` or a simple sliding window. (`bottleneck` isn't in deps yet; add it or implement a tiny rate-limiter in `utils/`).
  - Throw clearly if `OPENROUTER_API_KEY` is empty.
- `services/prompts/` — exported template functions:
  - `generatePostsPrompt(input)` — returns the literal prompt from spec §6
  - `summarizePrompt(rawContent)` — "Summarize in 2–3 sentences, preserve concrete numbers/names, output plain text"
- `rss.service.ts` — `fetchFeed(url: string): Promise<NormalizedItem[]>` using `rss-parser`. 10s timeout, 2 retries (exponential backoff). Strip HTML from content, skip items with <200 chars.
- `scoring.service.ts` — pure function `score(item, project): number` in [0, 1]:
  ```
  recency  = exp(-ln(2) * ageInDays / 7)      // 7-day half-life
  keyword  = keywordMatchRate(item.title + item.summary,
                              [project.domain, project.targetAudience])
  length   = min(1, contentLength / 1500)      // length normalization
  score    = 0.4 * recency + 0.4 * keyword + 0.2 * length
  ```
  Keep the formula in one place with named constants.
- `dedup.service.ts` — two functions:
  - `urlHash(url: string): string` — normalize URL (lowercase host, strip tracking params, trailing slash) then `sha256 → hex`.
  - `isDuplicateTitle(title, recentTitles): boolean` — **skip for MVP** (Jaro-Winkler is Section-13 bonus, user opted out). Stub it returning `false` and note that it can be enabled later.

**Tests:** not required in MVP per spec, but a minimal sanity script in `apps/backend/scripts/smoke-llm.ts` that calls `summarize("lorem ipsum...")` against OpenRouter is useful for manual validation.

**Env to add:** none beyond what's already in `apps/backend/.env.example`.

---

### M4 — API modules

**Fastify app wiring (`app.ts` + `server.ts`):**
- Register `@fastify/cors` with `env.CORS_ORIGIN`.
- Register `@fastify/sensible` for error helpers.
- Install `fastify-type-provider-zod` (add to deps) and set `withTypeProvider<ZodTypeProvider>()` — gives first-class Zod route schemas.
- Global error hook formats all errors as `{ error: { code, message, details? } }` (matches `ErrorEnvelopeSchema`).
- `// TODO: auth` marker where an auth preHandler would attach, per spec §12.
- `server.ts` calls `connectDatabase()` then `app.listen({ port, host })`.

**Module structure per domain (`src/modules/<domain>/`):**
```
index.ts       // exports registerXRoutes(fastify)
routes.ts      // Fastify route definitions with Zod schemas from @darketing/shared
controller.ts  // thin: parse req, call service, return
service.ts     // business logic, takes prisma/mongoose models via arg (injectable)
```

**Endpoints (from spec §7 — re-copy here to avoid scrolling):**

| Method | Path | Body/Query | Returns |
|---|---|---|---|
| POST | `/projects` | `CreateProjectSchema` | `ProjectDto` |
| GET | `/projects` | — | `ProjectDto[]` (with `sourcesCount`) |
| GET | `/projects/:id` | — | `ProjectDto` with `sourcesCount`, `contentCount`, `lastRunAt` |
| PATCH | `/projects/:id` | `UpdateProjectSchema` | `ProjectDto` |
| DELETE | `/projects/:id` | — | `204` (cascade: also delete sources, content, posts) |
| POST | `/projects/:id/sources` | `CreateSourceSchema` | `SourceDto` — **validate feed is reachable** via `rss.service.fetchFeed` before insert |
| GET | `/projects/:id/sources` | — | `SourceDto[]` |
| DELETE | `/sources/:id` | — | `204` |
| GET | `/projects/:id/content` | `ContentQuerySchema` | `ContentItemDto[]` |
| GET | `/posts` | `PostsQuerySchema` | `PaginatedPosts` (cursor = last `_id`) |
| PATCH | `/posts/:id` | `UpdatePostSchema` | `PostDto` |
| POST | `/projects/:id/run` | — | `{ jobId }` — enqueues into BullMQ (requires M5) |

The `POST /projects/:id/run` endpoint will be a stub returning 503 until M5 lands.

---

### M5 — Worker + cron

**Files:**
- `src/jobs/queue.ts` — BullMQ `Queue` instance (`project-pipeline`), ioredis connection from `env.REDIS_URL`.
- `src/jobs/cron.ts` — `node-cron` schedule `env.CRON_SCHEDULE`. On tick, find all `isActive: true` projects and enqueue one `project-pipeline` job per project with `{ projectId }` payload.
- `src/workers/pipeline.worker.ts` — BullMQ `Worker` with `concurrency: env.WORKER_CONCURRENCY`. The job processor implements spec §5 pipeline:
  1. Fetch sources via `rss.service.fetchFeed`
  2. Normalize + skip <200 chars
  3. `dedup.service.urlHash` → skip if exists
  4. Insert `ContentItem` with `summary=null, score=null`
  5. Call `llm.service.summarize` for each → update `summary`
  6. Call `scoring.service.score` for each → update `score`
  7. Top N by score → set `selected=true`
  8. For each selected item, call `llm.service.generatePosts` → insert 2 `GeneratedPost` rows (one per platform), `variant=null`, `status=SUGGESTED`
  9. Update `project.lastRunAt = new Date()`
- Per-item try/catch so one bad item doesn't abort the batch. Log every failure with context.
- Worker entrypoint must `connectDatabase()` then start the Worker and the cron.

**Env:** `CRON_SCHEDULE`, `WORKER_CONCURRENCY`, `LLM_RATE_LIMIT_PER_SEC` — already in `.env.example`.

---

### M6 — Frontend scaffolding

**Files to create in `apps/frontend/src/`:**
- `app/layout.tsx` — applies `dark` class on `<html>` unconditionally (dark mode is the **default**, not a toggle). Inter font via `next/font`.
- `app/globals.css` — Tailwind directives + `:root` CSS vars for background/foreground.
- `app/page.tsx` — redirect to `/projects`.
- `app/providers.tsx` — `<QueryClientProvider>` wrapper (client component).
- `lib/api.ts` — typed fetch helpers, `baseUrl = process.env.NEXT_PUBLIC_API_URL`. Each method returns Zod-validated responses using schemas from `@darketing/shared`.
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `store/ui.ts` — Zustand for filters (active project, status pill, platform toggle).
- `components/ui/` — `Button`, `Card`, `Input`, `Textarea`, `Tabs`, `Skeleton`, `Toast`. Keep it small, no shadcn copy-paste sprawl.

**Dark palette:** zinc background, slate-100 text, indigo-400 accent. Consistent use of `bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`, `text-zinc-100`, `text-zinc-400` for hierarchy.

---

### M7 — Frontend pages

- `/projects` — list (from `GET /projects`) + "New Project" modal (form with all `CreateProjectSchema` fields, Zod-validated on client).
- `/projects/[id]` — dashboard with four tabs (`Posts | Sources | Content | Settings`):
  - **Posts**: status pill tabs (`SUGGESTED | APPROVED | REJECTED`) + platform toggle (`ALL | TWITTER | LINKEDIN`). Card grid. "Run pipeline now" button calls `POST /projects/:id/run`.
  - **Sources**: list + add form + delete.
  - **Content**: recent `ContentItem`s with score badges.
  - **Settings**: `PATCH /projects/:id` form.
- `/posts/[id]` — split view:
  - Left: textarea. For `TWITTER`, show character counter (280 limit, yellow at 260, red at 280).
  - Right: platform-accurate preview card (X-style condensed card / LinkedIn-style multi-paragraph card).
  - Actions: **Save edit** (PATCH `editedContent`), **Approve**/**Reject** (PATCH `status`), **Copy** (clipboard + toast).
  - Keyboard shortcuts: ⌘S save, ⌘↵ approve, ⌘C copy when textarea blurred.
- **Loading states = skeletons** (not spinners), **optimistic updates** on approve/reject/edit. Empty states show CTAs.

---

### M8 — Integration test + README polish

Not "automated tests" — spec §14 says the MVP is "done" when a user can walk the manual test flow. Deliverable: a numbered checklist in the README that the user runs top-to-bottom, plus polish passes.

---

## How to resume in a new Claude session

1. Tell Claude the project uses this spec and point to this file.
2. Check the current state against the checklist above.
3. Run `pnpm install` in the repo root if `node_modules` is missing.
4. Confirm local MongoDB (`brew services list`) and Redis are running.
5. Ask user to confirm **which milestone to work on next** — don't skip ahead without explicit confirmation (per the execution protocol).
6. Generate full file contents. No `// …` placeholders.
7. Update the status table in this file at the end of each milestone.

---

## Open questions / things to re-check with the user when relevant

- **Free model reliability**: `meta-llama/llama-3.3-70b-instruct:free` on OpenRouter has occasional 429s and schema drift. If M3 testing surfaces too many JSON parse failures, consider swapping the default to `google/gemini-flash-1.5-8b:free` or `deepseek/deepseek-chat:free`. User picked free; don't silently upgrade to paid.
- **Pipeline trigger in seed**: spec originally wanted seed to "trigger one pipeline run." That was deferred because M5 was pending. If M5 lands, consider adding `--with-run` flag to `scripts/seed.ts` to enqueue a job at the end.
- **Compiled production builds**: backend currently runs via `tsx` in all environments. If the user ever wants a smaller production image / faster cold start, swap to `tsup` or `esbuild` bundling.
- **Cascade deletes on projects**: M4 needs to decide — do we delete child sources/content/posts in an app-level transaction (not available on standalone Mongo) or sequentially with best-effort cleanup? Go with sequential deletes and log orphans if any step fails. Add a `scripts/reap-orphans.ts` later if it becomes an issue.
