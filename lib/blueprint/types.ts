import { z } from 'zod'

export const ZONE_IDS = ['experience', 'entrypoints', 'core_logic', 'data', 'external', 'platform'] as const
export const ZoneIdSchema = z.enum(ZONE_IDS)
export type ZoneId = z.infer<typeof ZoneIdSchema>

export const ZoneSchema = z.object({
  id: ZoneIdSchema,
  label: z.string(),
  description: z.string(),
  folders: z.array(z.string()),
  fileCount: z.number().int().nonnegative(),
  importantFiles: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export const FlowStepSchema = z.object({
  label: z.string(),
  zone: ZoneIdSchema.nullable(),
  file: z.string().nullable(),
})

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  steps: z.array(FlowStepSchema),
})

export const BlueprintSchema = z.object({
  repo: z.object({
    name: z.string(),
    url: z.string(),
    owner: z.string(),
    commit: z.string(),
    defaultBranch: z.string(),
    summary: z.string(),
  }),
  inventory: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    packageManager: z.string().nullable(),
    hasDocker: z.boolean(),
    hasGithubActions: z.boolean(),
    topLevelFolders: z.array(z.string()),
  }),
  zones: z.array(ZoneSchema),
  flows: z.array(FlowSchema),
  readFirst: z.array(z.string()).max(7),
  externalSystems: z.array(z.string()),
  meta: z.object({
    generatedAt: z.string(),
    mode: z.enum(['ai', 'offline']),
    durationMs: z.number(),
  }),
})

export type Blueprint = z.infer<typeof BlueprintSchema>
export type Zone = z.infer<typeof ZoneSchema>
export type Flow = z.infer<typeof FlowSchema>
export type FlowStep = z.infer<typeof FlowStepSchema>

export const ZONE_META: Record<ZoneId, { label: string; color: string; bg: string; border: string; text: string }> = {
  experience: {
    label: 'Experience',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#93c5fd',
    text: '#1e40af',
  },
  entrypoints: {
    label: 'Entrypoints',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    text: '#5b21b6',
  },
  core_logic: {
    label: 'Core Logic',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#86efac',
    text: '#15803d',
  },
  data: {
    label: 'Data',
    color: '#ca8a04',
    bg: '#fefce8',
    border: '#fde047',
    text: '#a16207',
  },
  external: {
    label: 'External Systems',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fdba74',
    text: '#c2410c',
  },
  platform: {
    label: 'Platform',
    color: '#4b5563',
    bg: '#f9fafb',
    border: '#d1d5db',
    text: '#374151',
  },
}

// Internal pipeline types

export interface FileEntry {
  path: string
  type: 'blob' | 'tree'
  size?: number
  sha?: string
}

export interface RepoSnapshot {
  owner: string
  repo: string
  defaultBranch: string
  commit: string
  tree: FileEntry[]
  rawContents: Map<string, string>
  totalSizeBytes: number
}

export interface Inventory {
  languages: string[]
  frameworks: string[]
  packageManager: string | null
  hasDocker: boolean
  hasGithubActions: boolean
  topLevelFolders: string[]
}

export interface ClassifiedFile {
  path: string
  zone: ZoneId
  confidence: number
  reason: string
}

export interface ParsedFile {
  path: string
  imports: string[]
  exports: string[]
  routes: string[]
  components: string[]
  externalPackages: string[]
}

export interface GraphNode {
  id: string
  type: 'file' | 'route' | 'component' | 'service' | 'model' | 'external' | 'config'
  zone: ZoneId
  path: string | null
  label: string
  fanIn: number
  fanOut: number
}

export interface GraphEdge {
  from: string
  to: string
  type: 'imports' | 'calls' | 'defines_route' | 'uses_external'
}

export interface CodeGraph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

export interface CompressedMap {
  zones: Zone[]
  flows: Flow[]
  readFirst: string[]
  externalSystems: string[]
}

export type SSEEmitter = (event: string, data: unknown) => void
