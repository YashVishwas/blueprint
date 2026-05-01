import path from 'path'
import type {
  ClassifiedFile,
  CodeGraph,
  CompressedMap,
  Flow,
  Inventory,
  RepoSnapshot,
  Zone,
  ZoneId,
} from './types'
import { ZONE_IDS, ZONE_META } from './types'
import { classify, extractTopFolders, groupByZone } from './classify'
import { resolveExternal } from './rules/externals'

const IMPORTANT_FILE_PATTERNS = [
  /package\.json$/,
  /schema\.prisma$/,
  /drizzle\.config/,
  /tsconfig\.json$/,
  /next\.config/,
  /vite\.config/,
  /main\.(ts|js|py|go|rs)$/,
  /server\.(ts|js)$/,
  /index\.(ts|js)$/,
  /app\.(ts|js|py)$/,
  /routes?\.(ts|js)$/,
  /router\.(ts|js)$/,
  /schema\.(ts|js)$/,
  /types\.(ts|js)$/,
]

function scoreImportance(filePath: string, graph: CodeGraph): number {
  const id = `file:${filePath}`
  const node = graph.nodes.get(id)

  let score = 0

  // Fan-in: highly imported files are important
  if (node) score += node.fanIn * 3

  // Fan-out: files that touch many others span the system
  if (node) score += node.fanOut * 1.5

  // Filename importance
  for (const pat of IMPORTANT_FILE_PATTERNS) {
    if (pat.test(filePath)) score += 10
  }

  // Penalize deep nesting
  const depth = filePath.split('/').length
  score -= depth * 0.3

  return score
}

function selectImportantFiles(files: ClassifiedFile[], graph: CodeGraph, limit = 5): string[] {
  return files
    .map(f => ({ path: f.path, score: scoreImportance(f.path, graph) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(f => f.path)
}

function buildReadFirst(
  classified: ClassifiedFile[],
  graph: CodeGraph,
  snapshot: RepoSnapshot,
): string[] {
  const candidates: Array<{ path: string; score: number }> = []

  const ROOT_PRIORITY: Record<string, number> = {
    'package.json': 100,
    'go.mod': 100,
    'Cargo.toml': 100,
    'pyproject.toml': 100,
    'requirements.txt': 90,
    'Gemfile': 90,
  }

  // Root config files always first
  for (const f of snapshot.tree) {
    const score = ROOT_PRIORITY[f.path]
    if (score) candidates.push({ path: f.path, score })
  }

  // Entrypoint files second
  const entrypoints = classified.filter(f => f.zone === 'entrypoints')
  for (const f of entrypoints.slice(0, 3)) {
    const id = `file:${f.path}`
    const node = graph.nodes.get(id)
    candidates.push({ path: f.path, score: 70 + (node?.fanOut ?? 0) })
  }

  // High fan-in core logic files
  const coreFiles = classified.filter(f => f.zone === 'core_logic')
  for (const f of coreFiles) {
    const id = `file:${f.path}`
    const node = graph.nodes.get(id)
    const fanIn = node?.fanIn ?? 0
    if (fanIn > 0) candidates.push({ path: f.path, score: 50 + fanIn * 2 })
  }

  // Data schema files
  const dataFiles = classified.filter(f => f.zone === 'data')
  for (const f of dataFiles) {
    if (/schema|model|migration/.test(f.path)) {
      candidates.push({ path: f.path, score: 60 })
    }
  }

  // Deduplicate and limit
  const seen = new Set<string>()
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(c => {
      if (seen.has(c.path)) return false
      seen.add(c.path)
      return true
    })
    .slice(0, 7)
    .map(c => c.path)
}

function detectExternalSystems(graph: CodeGraph): string[] {
  const externals = new Set<string>()
  for (const node of graph.nodes.values()) {
    if (node.type === 'external') externals.add(node.label)
  }
  return [...externals].sort()
}

export function compress(
  snapshot: RepoSnapshot,
  inventory: Inventory,
  classified: ClassifiedFile[],
  graph: CodeGraph,
  flows: Flow[],
): CompressedMap {
  const byZone = groupByZone(classified)
  const externalSystems = detectExternalSystems(graph)

  const zones: Zone[] = ZONE_IDS.map(zoneId => {
    const meta = ZONE_META[zoneId]
    const files = byZone.get(zoneId) ?? []
    const importantFiles = selectImportantFiles(files, graph, 5)
    const folders = extractTopFolders(files, 4)

    return {
      id: zoneId,
      label: meta.label,
      description: '', // filled in by explain.ts
      folders,
      fileCount: files.length,
      importantFiles,
      confidence: files.length > 0 ? Math.min(0.99, 0.6 + files.length * 0.01) : 0,
    }
  })

  const readFirst = buildReadFirst(classified, graph, snapshot)

  return { zones, flows, readFirst, externalSystems }
}
