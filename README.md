# Blueprint

**Paste a GitHub repo. See the system.**

Blueprint turns any GitHub repository into a one-glance visual architecture map — showing what the codebase is, how it flows, and where to start reading.

```
Open Blueprint → Paste GitHub URL → Generate → See the map → Click to explore
```

## What you get

- **Six-zone architectural canvas** — Experience, Entrypoints, Core Logic, Data, External Systems, Platform
- **Top execution flows** — inferred from import graphs and route handlers (TS/JS repos)
- **Read-first path** — curated file reading order for new contributors
- **Export** — `BLUEPRINT.md`, `blueprint.json`, `.mmd` (Mermaid) for every repo

Works for any public GitHub repo. Flow detection is TypeScript/JavaScript only in v1; all other languages get the full zone map.

## Quick start

```bash
git clone https://github.com/YashVishwas/blueprint
cd blueprint
cp .env.example .env.local
# Fill in GITHUB_TOKEN (required) and ANTHROPIC_API_KEY (optional, for AI mode)
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any GitHub repo URL.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | Personal access token — raises rate limit from 60 to 5000 req/hr |
| `ANTHROPIC_API_KEY` | No | Needed for AI narration mode. Offline mode works without it. |
| `CACHE_DRIVER` | No | `sqlite` (default) or `upstash` |
| `UPSTASH_REDIS_REST_URL` | If upstash | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | If upstash | Upstash Redis REST token |

## How it works

Blueprint runs a pipeline on every repo:

```
GitHub Trees API → Inventory → Zone Classifier → Babel AST Parser → Graph → Flow Detector → Compressor → Claude (optional) → Visual
```

- **Ingestion**: GitHub Trees API — no git clone, works serverlessly
- **Classification**: path-glob rules assign every file to one of six zones
- **Parsing**: `@babel/parser` extracts imports, routes, and components (TS/JS only)
- **Flows**: BFS from entrypoint nodes through the import graph
- **AI narration**: one `claude-sonnet-4-6` call with the compressed graph — source-grounded, never invents files
- **Cache**: SQLite locally, Upstash Redis in prod — keyed by `owner/repo@sha`

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Set `GITHUB_TOKEN`, optionally `ANTHROPIC_API_KEY`, set `CACHE_DRIVER=upstash` with Upstash credentials.

## License

MIT
