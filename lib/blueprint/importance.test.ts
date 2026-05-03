import { describe, it, expect } from 'vitest'
import {
  scoreStructural,
  scoreWithGraph,
  selectReadFirstStructural,
  selectReadFirst,
  selectImportantFiles,
} from './importance'
import type { ClassifiedFile, CodeGraph, FileEntry } from './types'

// ── scoreStructural ───────────────────────────────────────────────────────────

describe('scoreStructural', () => {
  it('rates root manifest highest', () => {
    const pkgJson = scoreStructural('package.json', 'platform', 1.0)
    const deepFile = scoreStructural('src/utils/helpers/string.ts', 'core_logic', 1.0)
    expect(pkgJson).toBeGreaterThan(deepFile)
  })

  it('entrypoints zone outscores experience for same path', () => {
    const entry = scoreStructural('src/routes.ts', 'entrypoints', 1.0)
    const ui = scoreStructural('src/routes.ts', 'experience', 1.0)
    expect(entry).toBeGreaterThan(ui)
  })

  it('applies depth penalty — shallower wins', () => {
    const shallow = scoreStructural('server.ts', 'entrypoints', 1.0)
    const deep = scoreStructural('src/server/main/server.ts', 'entrypoints', 1.0)
    expect(shallow).toBeGreaterThan(deep)
  })

  it('filename bonus applies for known patterns', () => {
    const withBonus = scoreStructural('schema.prisma', 'data', 1.0)
    const withoutBonus = scoreStructural('something.ts', 'data', 1.0)
    expect(withBonus).toBeGreaterThan(withoutBonus)
  })

  it('confidence scales the zone base', () => {
    const highConf = scoreStructural('lib/service.ts', 'core_logic', 0.9)
    const lowConf = scoreStructural('lib/service.ts', 'core_logic', 0.3)
    expect(highConf).toBeGreaterThan(lowConf)
  })

  it('never returns negative score', () => {
    const score = scoreStructural('a/b/c/d/e/f/g/h/i/j/k.ts', 'platform', 0.1)
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

// ── scoreWithGraph ────────────────────────────────────────────────────────────

describe('scoreWithGraph', () => {
  it('adds fan-in bonus on top of structural score', () => {
    const base = scoreStructural('lib/utils.ts', 'core_logic', 0.8)
    const withGraph = scoreWithGraph('lib/utils.ts', 'core_logic', 0.8, {
      id: 'file:lib/utils.ts',
      type: 'file',
      zone: 'core_logic',
      path: 'lib/utils.ts',
      label: 'utils.ts',
      fanIn: 10,
      fanOut: 2,
    })
    expect(withGraph).toBeGreaterThan(base)
  })

  it('returns structural score when node is undefined', () => {
    const structural = scoreStructural('lib/utils.ts', 'core_logic', 0.8)
    const withGraph = scoreWithGraph('lib/utils.ts', 'core_logic', 0.8, undefined)
    expect(withGraph).toEqual(structural)
  })

  it('high fan-in file beats high zone-base file with no graph data', () => {
    // A deeply nested util with 20 importers vs a root entrypoint with 0 importers
    const deepUtil = scoreWithGraph('src/internal/utils/parse.ts', 'core_logic', 0.8, {
      id: 'file:src/internal/utils/parse.ts',
      type: 'file',
      zone: 'core_logic',
      path: 'src/internal/utils/parse.ts',
      label: 'parse.ts',
      fanIn: 20,
      fanOut: 0,
    })
    const rootEntry = scoreWithGraph('routes/index.ts', 'entrypoints', 0.9, undefined)
    expect(deepUtil).toBeGreaterThan(rootEntry)
  })
})

// ── selectReadFirstStructural ─────────────────────────────────────────────────

const makeFile = (path: string, zone: ClassifiedFile['zone'], confidence = 0.8): ClassifiedFile => ({
  path,
  zone,
  confidence,
  reason: 'test',
})

const makeTree = (paths: string[]): FileEntry[] =>
  paths.map(p => ({ path: p, type: 'blob' as const }))

describe('selectReadFirstStructural', () => {
  it('returns at most limit files', () => {
    const classified: ClassifiedFile[] = Array.from({ length: 20 }, (_, i) =>
      makeFile(`src/file${i}.ts`, 'core_logic'),
    )
    const result = selectReadFirstStructural(classified, [], 7)
    expect(result.length).toBeLessThanOrEqual(7)
  })

  it('injects root manifest from tree if not classified', () => {
    const classified: ClassifiedFile[] = [makeFile('src/index.ts', 'entrypoints')]
    const tree = makeTree(['package.json', 'src/index.ts'])
    const result = selectReadFirstStructural(classified, tree, 7)
    expect(result).toContain('package.json')
  })

  it('does not duplicate package.json if already classified', () => {
    const classified: ClassifiedFile[] = [makeFile('package.json', 'platform')]
    const tree = makeTree(['package.json'])
    const result = selectReadFirstStructural(classified, tree, 7)
    expect(result.filter(f => f === 'package.json').length).toBe(1)
  })

  it('enforces max 3 per zone', () => {
    const classified: ClassifiedFile[] = Array.from({ length: 10 }, (_, i) =>
      makeFile(`routes/route${i}.ts`, 'entrypoints'),
    )
    const result = selectReadFirstStructural(classified, [], 7)
    const entrypointCount = result.filter(f => f.startsWith('routes/')).length
    expect(entrypointCount).toBeLessThanOrEqual(3)
  })

  it('prefers root entrypoint over deep utility', () => {
    const classified: ClassifiedFile[] = [
      makeFile('server.ts', 'entrypoints', 1.0),
      makeFile('src/utils/deep/helpers/format.ts', 'core_logic', 1.0),
    ]
    const result = selectReadFirstStructural(classified, [], 7)
    expect(result[0]).toBe('server.ts')
  })

  it('includes diverse zones rather than all from one zone', () => {
    const classified: ClassifiedFile[] = [
      makeFile('routes/a.ts', 'entrypoints', 1.0),
      makeFile('routes/b.ts', 'entrypoints', 1.0),
      makeFile('routes/c.ts', 'entrypoints', 1.0),
      makeFile('routes/d.ts', 'entrypoints', 1.0),
      makeFile('schema.prisma', 'data', 1.0),
      makeFile('lib/service.ts', 'core_logic', 1.0),
    ]
    const result = selectReadFirstStructural(classified, [], 7)
    const zones = new Set(
      result.map(path => classified.find(f => f.path === path)?.zone ?? 'platform'),
    )
    expect(zones.size).toBeGreaterThan(1)
  })
})

// ── selectImportantFiles ──────────────────────────────────────────────────────

describe('selectImportantFiles', () => {
  it('returns at most limit files', () => {
    const files: ClassifiedFile[] = Array.from({ length: 10 }, (_, i) =>
      makeFile(`lib/file${i}.ts`, 'core_logic'),
    )
    const graph: CodeGraph = { nodes: new Map(), edges: [] }
    expect(selectImportantFiles(files, graph, 3).length).toBeLessThanOrEqual(3)
  })

  it('ranks by fan-in when graph data is present', () => {
    const files: ClassifiedFile[] = [
      makeFile('lib/low.ts', 'core_logic'),
      makeFile('lib/high.ts', 'core_logic'),
    ]
    const graph: CodeGraph = {
      nodes: new Map([
        ['file:lib/low.ts', { id: 'file:lib/low.ts', type: 'file', zone: 'core_logic', path: 'lib/low.ts', label: 'low.ts', fanIn: 1, fanOut: 0 }],
        ['file:lib/high.ts', { id: 'file:lib/high.ts', type: 'file', zone: 'core_logic', path: 'lib/high.ts', label: 'high.ts', fanIn: 15, fanOut: 0 }],
      ]),
      edges: [],
    }
    const result = selectImportantFiles(files, graph, 2)
    expect(result[0]).toBe('lib/high.ts')
  })
})
