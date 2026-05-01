import path from 'path'
import type { ClassifiedFile, CodeGraph, GraphEdge, GraphNode, ParsedFile, ZoneId } from './types'
import { resolveExternal } from './rules/externals'

function fileId(filePath: string): string {
  return `file:${filePath}`
}

function externalId(name: string): string {
  return `ext:${name}`
}

function resolveRelativeImport(fromFile: string, importPath: string): string {
  const dir = path.dirname(fromFile)
  const resolved = path.posix.normalize(`${dir}/${importPath}`)
  // Try with common extensions if no extension
  if (!path.extname(resolved)) {
    return resolved // caller can try .ts, .tsx, .js, .jsx appended
  }
  return resolved
}

export function buildGraph(classified: ClassifiedFile[], parsed: ParsedFile[]): CodeGraph {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  // Zone lookup
  const zoneByPath = new Map<string, ZoneId>()
  for (const f of classified) zoneByPath.set(f.path, f.zone)

  // Create a node for every classified file
  for (const f of classified) {
    const id = fileId(f.path)
    const label = path.basename(f.path)
    nodes.set(id, {
      id,
      type: 'file',
      zone: f.zone,
      path: f.path,
      label,
      fanIn: 0,
      fanOut: 0,
    })
  }

  // Set of all known file paths (for import resolution)
  const knownPaths = new Set(classified.map(f => f.path))

  for (const pf of parsed) {
    const fromId = fileId(pf.path)
    if (!nodes.has(fromId)) continue

    // Resolve relative imports → edges
    for (const imp of pf.imports) {
      if (imp.startsWith('.')) {
        const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'].map(
          ext => resolveRelativeImport(pf.path, imp) + ext,
        )
        const resolved = candidates.find(c => knownPaths.has(c))
        if (resolved) {
          const toId = fileId(resolved)
          edges.push({ from: fromId, to: toId, type: 'imports' })
          nodes.get(fromId)!.fanOut++
          if (nodes.has(toId)) nodes.get(toId)!.fanIn++
        }
      } else {
        // External package — may be a known external service
        const externalLabel = resolveExternal(imp)
        if (externalLabel) {
          const toId = externalId(externalLabel)
          if (!nodes.has(toId)) {
            nodes.set(toId, {
              id: toId,
              type: 'external',
              zone: 'external',
              path: null,
              label: externalLabel,
              fanIn: 0,
              fanOut: 0,
            })
          }
          edges.push({ from: fromId, to: toId, type: 'uses_external' })
          nodes.get(fromId)!.fanOut++
          nodes.get(toId)!.fanIn++
        }
      }
    }

    // Detected routes
    for (const route of pf.routes) {
      const routeId = `route:${pf.path}:${route}`
      nodes.set(routeId, {
        id: routeId,
        type: 'route',
        zone: 'entrypoints',
        path: pf.path,
        label: route,
        fanIn: 0,
        fanOut: 0,
      })
      edges.push({ from: fromId, to: routeId, type: 'defines_route' })
    }
  }

  return { nodes, edges }
}
