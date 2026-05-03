import type { Blueprint, SSEEmitter } from './types'
import { ingest, parseGitHubUrl, getDefaultBranch } from './ingest'
import { detectInventory } from './inventory'
import { classify } from './classify'
import { parseFiles } from './parse'
import { buildGraph } from './graph'
import { detectFlows } from './flows'
import { compress } from './compress'
import { explain, applyNarration, type ExplainResult } from './explain'
import { cacheGet, cacheSet, makeCacheKey } from './cache'
import { selectReadFirstStructural } from './importance'

export interface PipelineOptions {
  url: string
  mode: 'ai' | 'offline'
  emit: SSEEmitter
}

function emit(emitter: SSEEmitter, event: string, data: unknown) {
  try {
    emitter(event, data)
  } catch {
    // ignore SSE write errors
  }
}

export async function runPipeline(options: PipelineOptions): Promise<Blueprint> {
  const { url, mode, emit: emitter } = options
  const startTime = Date.now()

  // ── 1. Parse URL ────────────────────────────────────────────────────────────
  const parsed = parseGitHubUrl(url)
  if (!parsed) {
    emit(emitter, 'error', { message: 'Invalid GitHub URL. Use https://github.com/owner/repo' })
    throw new Error('Invalid GitHub URL')
  }
  const { owner, repo } = parsed

  // ── 2. Resolve SHA + check cache ────────────────────────────────────────────
  emit(emitter, 'status', { message: 'Resolving repository...' })

  let sha: string
  let defaultBranch: string

  try {
    const info = await getDefaultBranch(owner, repo)
    sha = info.sha
    defaultBranch = info.branch

    // Check for oversized repos
    if (info.sizeKB * 1024 > 200 * 1024 * 1024) {
      emit(emitter, 'error', { message: 'Repository is too large (>200 MB). Blueprint supports repos up to 200 MB.' })
      throw new Error('Repo too large')
    }
  } catch (err: any) {
    if (err.message.includes('too large')) throw err
    const hint = err.status === 404
      ? `Repository not found. Is "${owner}/${repo}" a public repo?`
      : err.status === 403 || err.message?.includes('rate limit')
        ? `GitHub API rate limit hit. Add a GITHUB_TOKEN to .env.local to increase the limit (60 → 5000 req/hr).`
        : `Could not access repository: ${err.message}`
    emit(emitter, 'error', { message: hint })
    throw err
  }

  const cacheKey = makeCacheKey(owner, repo, sha)
  const cached = await cacheGet(cacheKey)
  if (cached) {
    const blueprint = JSON.parse(cached) as Blueprint
    emit(emitter, 'cached', { blueprint })
    emit(emitter, 'complete', { blueprint })
    return blueprint
  }

  // ── 3. Ingest ───────────────────────────────────────────────────────────────
  emit(emitter, 'status', { message: 'Fetching repository tree...' })
  const snapshot = await ingest(owner, repo)
  emit(emitter, 'ingest.done', { fileCount: snapshot.tree.length, commit: sha })

  // ── 4. Inventory ────────────────────────────────────────────────────────────
  const inventory = detectInventory(snapshot)
  emit(emitter, 'inventory.done', {
    languages: inventory.languages,
    frameworks: inventory.frameworks,
    packageManager: inventory.packageManager,
    hasDocker: inventory.hasDocker,
    hasGithubActions: inventory.hasGithubActions,
  })

  // ── 5. Classify (FAST PATH — emit canvas now) ───────────────────────────────
  const classified = classify(snapshot.tree)

  // Build a quick zone summary for the initial canvas render
  const quickZones = buildQuickZones(classified)
  // Structural readFirst is available immediately — no graph needed
  const quickReadFirst = selectReadFirstStructural(classified, snapshot.tree)
  emit(emitter, 'classify.done', { zones: quickZones, readFirst: quickReadFirst })

  // ── 6. Parse (TS/JS only) ────────────────────────────────────────────────────
  const parsed2 = await parseFiles(snapshot, classified)
  emit(emitter, 'parse.done', { parsedFiles: parsed2.length })

  // ── 7. Graph + Flows ────────────────────────────────────────────────────────
  const graph = buildGraph(classified, parsed2)
  const flows = detectFlows(graph)
  emit(emitter, 'flows.done', { flowCount: flows.length, flows })

  // ── 8. Compress ─────────────────────────────────────────────────────────────
  const compressedMap = compress(snapshot, inventory, classified, graph, flows)

  // ── 9. Explain ──────────────────────────────────────────────────────────────
  emit(emitter, 'status', { message: mode === 'ai' ? 'Generating AI narration...' : 'Building descriptions...' })
  const narration = await explain(`${owner}/${repo}`, compressedMap, inventory, mode) as ExplainResult
  const narratedMap = applyNarration(compressedMap, narration)
  emit(emitter, 'explain.done', { summary: narration.summary })

  // ── 10. Assemble blueprint.json ─────────────────────────────────────────────
  const blueprint: Blueprint = {
    repo: {
      name: repo,
      url: `https://github.com/${owner}/${repo}`,
      owner,
      commit: sha,
      defaultBranch,
      summary: narration.summary,
    },
    inventory,
    zones: narratedMap.zones,
    flows: narratedMap.flows,
    readFirst: narratedMap.readFirst,
    externalSystems: narratedMap.externalSystems,
    meta: {
      generatedAt: new Date().toISOString(),
      mode,
      durationMs: Date.now() - startTime,
    },
  }

  // ── 11. Cache + emit ────────────────────────────────────────────────────────
  await cacheSet(cacheKey, JSON.stringify(blueprint))
  emit(emitter, 'complete', { blueprint })

  return blueprint
}

// Build a lightweight zone summary for the fast-path canvas render
function buildQuickZones(classified: ReturnType<typeof classify>) {
  const counts: Record<string, number> = {}
  const folders: Record<string, Set<string>> = {}

  for (const f of classified) {
    counts[f.zone] = (counts[f.zone] ?? 0) + 1
    if (!folders[f.zone]) folders[f.zone] = new Set()
    const topFolder = f.path.split('/')[0]
    folders[f.zone].add(topFolder)
  }

  return Object.entries(counts).map(([zone, fileCount]) => ({
    id: zone,
    fileCount,
    folders: [...(folders[zone] ?? [])].slice(0, 3),
  }))
}
