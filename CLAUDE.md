# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Blueprint turns any GitHub repository URL into a single-screen visual architecture map in under 60 seconds. The output is a six-zone architectural canvas (not a file graph) that shows: what the system is, how execution flows, where logic lives, where data lives, what external systems it touches, and which files to read first.

## Commands

```bash
pnpm dev          # start Next.js dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest
pnpm test path/to/file.test.ts   # single test file
```

## Architecture

Single Next.js 15 (App Router) app. No monorepo, no packages/* workspace.

### The pipeline (`lib/blueprint/`)

All backend logic lives here as **pure functions with no React/Next imports**. The pipeline is invoked by one SSE route (`app/api/blueprint/route.ts`) and streams events to the UI:

```
ingest → inventory → classify → parse → graph → flows → compress → explain → render
```

Each stage has its own file and one job:

| File | Input → Output |
|---|---|
| `ingest.ts` | GitHub URL → `RepoSnapshot` (tree + file contents via GitHub Trees API, never git clone) |
| `inventory.ts` | `RepoSnapshot` → detected languages, frameworks, package manager |
| `classify.ts` | file list → `ClassifiedFile[]` with zone + confidence (path globs only, all languages) |
| `parse.ts` | file contents → imports/exports/routes/components (**TS/JS only** via `@babel/parser`) |
| `graph.ts` | parsed + classified → `Graph` of nodes and edges |
| `flows.ts` | `Graph` → top 3–5 execution flows via BFS from entrypoints (**TS/JS only**) |
| `compress.ts` | `Graph` + flows → the six zones + `readFirst[]` |
| `explain.ts` | compressed map → narration. **AI mode**: one `claude-sonnet-4-6` call, source-grounded. **Offline mode**: rule-based templates, no API key needed. |
| `render.ts` | `blueprint.json` → `BLUEPRINT.md` + `blueprint.mmd` (Mermaid) |
| `cache.ts` | SQLite locally (`better-sqlite3`), Upstash Redis in prod, keyed by `owner/repo@sha` |
| `pipeline.ts` | orchestrates all stages, emits SSE events |

Rules live in `lib/blueprint/rules/`:
- `zones.ts` — path-glob → zone mapping (this is the primary accuracy lever; update carefully)
- `frameworks.ts` — detection signatures for Next, Vite, Prisma, Django, FastAPI, Rails, etc.
- `externals.ts` — npm/pip package name → external service label
- `templates.ts` — offline-mode narration templates per zone

### The product contract: `blueprint.json`

Defined and validated by `lib/blueprint/types.ts` (zod). **The UI reads only this schema.** Never let UI components reach into pipeline internals.

```ts
{
  repo: { name, url, owner, commit, defaultBranch, summary },
  inventory: { languages, frameworks, packageManager, hasDocker, hasGithubActions },
  zones: [ { id, label, description, folders, fileCount, importantFiles, confidence } ],
  // exactly 6 zones, ordered: experience, entrypoints, core_logic, data, external, platform
  flows: [ { id, name, confidence, steps: [{ label, zone, file }] } ],
  readFirst: string[],       // 5–7 files
  externalSystems: string[], // e.g. stripe, openai, aws
  meta: { generatedAt, mode: 'ai' | 'offline', durationMs }
}
```

### SSE event order

The API streams these events; the UI binds each to a progressive render:

```
ingest.done → inventory.done → classify.done → parse.done → flows.done → explain.done → complete
```

The canvas renders at `classify.done` (~5s) with real file counts. LLM narration arrives later without blocking the visual.

### The canvas (`components/blueprint/`)

The six-zone map is a **custom CSS Grid + SVG arrows**, not React Flow. Zone positions are fixed (subway-map style). React Flow is used only in `SidePanel.tsx` for the optional Layer-2 zone-expand detail view.

Zone color tokens: Experience=blue, Entrypoints=purple, Core Logic=green, Data=yellow, External Systems=orange, Platform=gray.

### Key constraints (enforce these)

- **60-second budget:** cap parsed files at 50 (ranked by classifier confidence × structural importance). Refuse repos >200MB with a clear message.
- **Source-grounded LLM:** `explain.ts` must never invent filenames. Prompt input is only `{repo, inventory, zones, flows, externals}` derived from the graph, not raw file content.
- **Polyglot zones, TS/JS-only flows:** `classify.ts` works for all languages. `parse.ts` and `flows.ts` bail out gracefully for non-TS/JS repos and leave `flows: []` in the output.
- **AI/offline toggle:** both modes must always work. Offline mode requires zero API calls and is the only mode available when `ANTHROPIC_API_KEY` is not set.
- **Cache is permanent by SHA:** `blueprint.json` cached at `owner/repo@sha` is never invalidated.

## Environment variables

```
GITHUB_TOKEN=           # required; increases GitHub API rate limits
ANTHROPIC_API_KEY=      # optional; AI mode requires it, offline mode works without
CACHE_DRIVER=sqlite     # 'sqlite' (default, local) or 'upstash'
UPSTASH_REDIS_REST_URL= # required if CACHE_DRIVER=upstash
UPSTASH_REDIS_REST_TOKEN=
```
