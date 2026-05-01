import picomatch from 'picomatch'
import type { ClassifiedFile, FileEntry, ZoneId } from './types'
import { IGNORE_PATTERNS, ZONE_RULES } from './rules/zones'

// Pre-compile matchers once
const ignoreMatcher = picomatch(IGNORE_PATTERNS, { dot: true })

const zoneMatcher = ZONE_RULES.map(rule => ({
  zone: rule.zone,
  weight: rule.weight,
  isMatch: picomatch(rule.patterns, { dot: true }),
}))

function classifyPath(filePath: string): { zone: ZoneId; confidence: number; reason: string } | null {
  // Ignore build artifacts, assets, etc.
  if (ignoreMatcher(filePath)) return null

  const matches: Array<{ zone: ZoneId; weight: number; pattern: string }> = []

  for (const { zone, weight, isMatch } of zoneMatcher) {
    if (isMatch(filePath)) {
      const matchedPatterns = ZONE_RULES.find(r => r.zone === zone)?.patterns ?? []
      const matchedPat = matchedPatterns.find(p => picomatch(p, { dot: true })(filePath)) ?? zone
      matches.push({ zone, weight, pattern: matchedPat })
    }
  }

  if (matches.length === 0) return null

  // Take the highest-weight match
  matches.sort((a, b) => b.weight - a.weight)
  const best = matches[0]

  // Confidence based on path specificity
  const depth = filePath.split('/').length
  const specificity = Math.min(1, depth / 6)
  const confidence = Math.min(0.98, best.weight * 0.7 + specificity * 0.3)

  return {
    zone: best.zone,
    confidence,
    reason: `Path matches "${best.pattern}"`,
  }
}

export function classify(files: FileEntry[]): ClassifiedFile[] {
  const results: ClassifiedFile[] = []

  for (const file of files) {
    if (file.type !== 'blob') continue
    const result = classifyPath(file.path)
    if (result) {
      results.push({ path: file.path, ...result })
    }
  }

  return results
}

// Group classified files by zone and extract folder-level summaries
export function groupByZone(classified: ClassifiedFile[]): Map<ZoneId, ClassifiedFile[]> {
  const map = new Map<ZoneId, ClassifiedFile[]>()
  for (const f of classified) {
    if (!map.has(f.zone)) map.set(f.zone, [])
    map.get(f.zone)!.push(f)
  }
  return map
}

export function extractTopFolders(files: ClassifiedFile[], limit = 4): string[] {
  const folderCounts = new Map<string, number>()
  for (const f of files) {
    const parts = f.path.split('/')
    const folder = parts.length > 1 ? parts.slice(0, 2).join('/') : parts[0]
    folderCounts.set(folder, (folderCounts.get(folder) ?? 0) + 1)
  }
  return [...folderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([folder]) => folder)
}
