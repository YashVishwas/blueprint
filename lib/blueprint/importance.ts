import type { ClassifiedFile, CodeGraph, FileEntry, GraphNode, ZoneId } from './types'

// Zone baseline importance — which zones yield the most architectural orientation per file read.
// Derived from first principle: the bottleneck is knowing where NOT to look.
const ZONE_BASE: Record<ZoneId, number> = {
  entrypoints: 9.0,
  core_logic: 8.5,
  data: 7.5,
  external: 6.0,
  experience: 5.0,
  platform: 3.0,
}

// Filename bonuses — patterns that signal a file coordinates others.
// Ordered from most to least specific; first match wins.
const FILENAME_BONUSES: Array<{ pattern: RegExp; bonus: number }> = [
  // Root manifests: define the system's identity and dependencies
  {
    pattern:
      /^(package\.json|go\.mod|Cargo\.toml|pyproject\.toml|requirements\.txt|Gemfile|pom\.xml|build\.gradle(\.kts)?)$/,
    bonus: 20,
  },
  // Entry points at project root
  {
    pattern: /^(main|server|app|index)\.(ts|tsx|js|jsx|py|go|rs|rb|php|java|kt|swift)$/,
    bonus: 18,
  },
  // Django / Python manage script
  { pattern: /^manage\.py$/, bonus: 17 },
  // Entry points one level in (src/ or cmd/)
  {
    pattern: /^src\/(main|server|app|index)\.(ts|tsx|js|jsx|py|go|rs|rb)$/,
    bonus: 16,
  },
  { pattern: /^cmd\/[^/]+\/main\.go$/, bonus: 16 },
  // Schema definitions — shape of the data is load-bearing knowledge
  { pattern: /\.prisma$/, bonus: 15 },
  { pattern: /(^|\/)schema\.(ts|js|py|rb|go)$/, bonus: 14 },
  { pattern: /(^|\/)models\.(ts|js|py|rb|go)$/, bonus: 13 },
  // Route / URL definitions — show the system's surface area
  { pattern: /(^|\/)(routes?|router|urls)\.(ts|js|py|rb|go)$/, bonus: 13 },
  // Orchestrators — coordinate multiple subsystems
  { pattern: /(^|\/)(pipeline|orchestrat|workflow)\.(ts|js|py|go)$/, bonus: 12 },
  // Type definitions — structural contracts
  { pattern: /(^|\/)types?\.(ts|js)$/, bonus: 12 },
  // Config
  { pattern: /\.(config|settings)\.(ts|js|py)$/, bonus: 8 },
]

// Root-level manifests that may not be classified into any zone but belong in readFirst.
const ROOT_MANIFESTS = new Set([
  'package.json',
  'go.mod',
  'Cargo.toml',
  'pyproject.toml',
  'requirements.txt',
  'Gemfile',
  'pom.xml',
  'build.gradle',
])

export interface ScoredFile {
  path: string
  score: number
  zone: ZoneId
}

function depthPenalty(filePath: string): number {
  // Shallower files more likely to be coordination points (Principle 1 + 4)
  return (filePath.split('/').length - 1) * 0.4
}

function filenameBonus(filePath: string): number {
  for (const { pattern, bonus } of FILENAME_BONUSES) {
    if (pattern.test(filePath)) return bonus
  }
  return 0
}

// Structural score using only path signals — works for all languages.
export function scoreStructural(filePath: string, zone: ZoneId, confidence: number): number {
  const base = ZONE_BASE[zone] * confidence
  const bonus = filenameBonus(filePath)
  const penalty = depthPenalty(filePath)
  return Math.max(0, base + bonus - penalty)
}

// Full score layering graph signals on top of structural score.
// Fan-in is the most reliable signal (Principle 2): files imported by many others
// are load-bearing regardless of their name or path.
export function scoreWithGraph(
  filePath: string,
  zone: ZoneId,
  confidence: number,
  node: GraphNode | undefined,
): number {
  const base = scoreStructural(filePath, zone, confidence)
  if (!node) return base
  // Fan-in weighted heavily; fan-out is useful but noisier
  return base + node.fanIn * 2.5 + node.fanOut * 0.8
}

// Select top N important files within a single zone.
export function selectImportantFiles(
  files: ClassifiedFile[],
  graph: CodeGraph,
  limit = 5,
): string[] {
  return files
    .map(f => ({
      path: f.path,
      score: scoreWithGraph(f.path, f.zone, f.confidence, graph.nodes.get(`file:${f.path}`)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(f => f.path)
}

// Full readFirst selection using graph data (called from compress stage).
export function selectReadFirst(
  classified: ClassifiedFile[],
  graph: CodeGraph,
  tree: FileEntry[],
  limit = 7,
): string[] {
  const scored: ScoredFile[] = classified.map(f => ({
    path: f.path,
    score: scoreWithGraph(f.path, f.zone, f.confidence, graph.nodes.get(`file:${f.path}`)),
    zone: f.zone,
  }))
  return pickDiverse(scored, tree, limit)
}

// Fast-path readFirst using only structural signals — no graph needed.
// Called at classify.done (~5s) so the UI can show something useful
// before parse/graph stages complete.
export function selectReadFirstStructural(
  classified: ClassifiedFile[],
  tree: FileEntry[],
  limit = 7,
): string[] {
  const scored: ScoredFile[] = classified.map(f => ({
    path: f.path,
    score: scoreStructural(f.path, f.zone, f.confidence),
    zone: f.zone,
  }))
  return pickDiverse(scored, tree, limit)
}

// Pick top N files with zone diversity (max 3 per zone).
// Diversity matters because the goal is orientation, not depth — one
// file per architectural concern beats five files from the same folder.
function pickDiverse(scored: ScoredFile[], tree: FileEntry[], limit: number): string[] {
  // Inject root manifests that fell outside the classifier
  const classifiedPaths = new Set(scored.map(s => s.path))
  for (const file of tree) {
    if (file.type === 'blob' && ROOT_MANIFESTS.has(file.path) && !classifiedPaths.has(file.path)) {
      scored.push({ path: file.path, score: 20, zone: 'platform' })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  const zoneCounts: Partial<Record<ZoneId, number>> = {}
  const result: string[] = []

  for (const { path, zone } of scored) {
    if (result.length >= limit) break
    const count = zoneCounts[zone] ?? 0
    if (count >= 3) continue
    zoneCounts[zone] = count + 1
    result.push(path)
  }

  return result
}
