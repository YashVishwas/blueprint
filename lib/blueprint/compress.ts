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
import { extractTopFolders, groupByZone } from './classify'
import { selectImportantFiles, selectReadFirst } from './importance'

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

    // Mean classifier confidence: reflects how certain the path-glob rules are
    // about zone membership, rather than file count (which is not a confidence signal).
    const meanConfidence =
      files.length > 0
        ? files.reduce((sum, f) => sum + f.confidence, 0) / files.length
        : 0

    return {
      id: zoneId,
      label: meta.label,
      description: '', // filled in by explain.ts
      folders,
      fileCount: files.length,
      importantFiles,
      confidence: meanConfidence,
    }
  })

  const readFirst = selectReadFirst(classified, graph, snapshot.tree)

  return { zones, flows, readFirst, externalSystems }
}
