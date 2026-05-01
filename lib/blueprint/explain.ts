import Anthropic from '@anthropic-ai/sdk'
import type { Blueprint, CompressedMap, Inventory } from './types'
import {
  getFlowDescription,
  getReadFirstExplanation,
  getRepoSummary,
  getZoneDescription,
} from './rules/templates'

const SYSTEM_PROMPT = `You are an expert software architect writing a concise architectural overview for a GitHub repository.

You will receive a JSON object describing the repository's structure. Your job is to narrate it in plain English — clearly and briefly.

STRICT RULES:
1. Only describe what exists in the provided JSON. Never invent files, services, or architecture.
2. Each zone description: 1-2 sentences max. Explain PURPOSE, not just file counts.
3. Repo summary: 1 sentence. What does this system do?
4. Flow descriptions: 1 sentence per flow, describing the execution path.
5. Read-first explanation: 1 sentence explaining why this reading order makes sense.
6. No markdown formatting, no bullet points. Plain text only.
7. Tone: senior engineer, plain language, direct.

Respond with valid JSON matching this exact schema:
{
  "summary": "string",
  "zoneSummaries": {
    "experience": "string",
    "entrypoints": "string",
    "core_logic": "string",
    "data": "string",
    "external": "string",
    "platform": "string"
  },
  "flowSummaries": ["string", ...],
  "readFirstSummary": "string"
}`

interface ExplainResult {
  summary: string
  zoneSummaries: Record<string, string>
  flowSummaries: string[]
  readFirstSummary: string
}

async function callClaude(
  repoName: string,
  map: CompressedMap,
  inventory: Inventory,
): Promise<ExplainResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const input = JSON.stringify({
    repo: repoName,
    inventory: {
      languages: inventory.languages.slice(0, 5),
      frameworks: inventory.frameworks.slice(0, 8),
      packageManager: inventory.packageManager,
      hasDocker: inventory.hasDocker,
      hasGithubActions: inventory.hasGithubActions,
    },
    zones: map.zones.map(z => ({
      id: z.id,
      fileCount: z.fileCount,
      folders: z.folders,
      importantFiles: z.importantFiles.slice(0, 5),
    })),
    flows: map.flows.map(f => ({
      name: f.name,
      steps: f.steps.map(s => ({ label: s.label, zone: s.zone })),
    })),
    readFirst: map.readFirst,
    externalSystems: map.externalSystems,
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ] as Anthropic.Messages.TextBlockParam[],
    messages: [{ role: 'user', content: input }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON from response (handle potential markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returned non-JSON response')

  return JSON.parse(jsonMatch[0]) as ExplainResult
}

function offlineExplain(
  repoName: string,
  map: CompressedMap,
  inventory: Inventory,
): ExplainResult {
  const zoneCounts: Record<string, number> = {}
  for (const z of map.zones) zoneCounts[z.id] = z.fileCount

  const summary = getRepoSummary(
    repoName,
    inventory.languages,
    inventory.frameworks,
    map.externalSystems,
    zoneCounts as any,
  )

  const zoneSummaries: Record<string, string> = {}
  for (const zone of map.zones) {
    zoneSummaries[zone.id] = getZoneDescription(
      zone.id,
      zone.fileCount,
      zone.folders,
      inventory.frameworks,
    )
  }

  const flowSummaries = map.flows.map(f =>
    getFlowDescription(f.name, f.steps.map(s => s.label)),
  )

  const readFirstSummary = getReadFirstExplanation(map.readFirst)

  return { summary, zoneSummaries, flowSummaries, readFirstSummary }
}

export async function explain(
  repoName: string,
  map: CompressedMap,
  inventory: Inventory,
  mode: 'ai' | 'offline',
): Promise<Blueprint['repo']['summary'] extends string ? ExplainResult : never> {
  if (mode === 'offline' || !process.env.ANTHROPIC_API_KEY) {
    return offlineExplain(repoName, map, inventory) as any
  }

  try {
    return await callClaude(repoName, map, inventory) as any
  } catch (err) {
    console.warn('[explain] Claude call failed, falling back to offline mode:', err)
    return offlineExplain(repoName, map, inventory) as any
  }
}

export function applyNarration(
  map: CompressedMap,
  narration: ExplainResult,
): CompressedMap {
  return {
    ...map,
    zones: map.zones.map(z => ({
      ...z,
      description: narration.zoneSummaries[z.id] ?? z.description,
    })),
    flows: map.flows.map((f, i) => ({
      ...f,
      // flows themselves don't have description field in schema, confidence carries weight
    })),
  }
}

export type { ExplainResult }
