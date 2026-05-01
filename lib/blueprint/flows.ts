import type { CodeGraph, Flow, FlowStep, ZoneId } from './types'
import { ZONE_IDS } from './types'

const ZONE_ORDER: ZoneId[] = ['experience', 'entrypoints', 'core_logic', 'data', 'external', 'platform']

function zoneRank(zone: ZoneId): number {
  return ZONE_ORDER.indexOf(zone)
}

// BFS from an entrypoint node outward through imports/calls edges
function traceFlow(
  startId: string,
  graph: CodeGraph,
  maxDepth = 6,
): FlowStep[] {
  const visited = new Set<string>()
  const steps: FlowStep[] = []
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id) || depth > maxDepth) continue
    visited.add(id)

    const node = graph.nodes.get(id)
    if (!node) continue

    // Skip platform nodes in flows — they're infrastructure, not execution paths
    if (node.zone === 'platform') continue

    steps.push({
      label: node.label,
      zone: node.zone,
      file: node.path,
    })

    // Follow outgoing edges, preferring edges that move "down" the stack
    const outgoing = graph.edges
      .filter(e => e.from === id && (e.type === 'imports' || e.type === 'calls' || e.type === 'uses_external'))
      .map(e => graph.nodes.get(e.to))
      .filter((n): n is NonNullable<typeof n> => n !== undefined)
      .filter(n => !visited.has(n.id))
      .sort((a, b) => zoneRank(b.zone) - zoneRank(a.zone))

    for (const next of outgoing.slice(0, 3)) {
      queue.push({ id: next.id, depth: depth + 1 })
    }
  }

  return steps
}

function flowName(path: string): string {
  const base = path.split('/').pop() ?? path
  const name = base.replace(/\.(ts|tsx|js|jsx)$/, '')

  // Common patterns → human names
  const nameMap: Record<string, string> = {
    'checkout': 'Checkout',
    'payment': 'Payment',
    'order': 'Order',
    'auth': 'Authentication',
    'login': 'Login',
    'signup': 'Sign Up',
    'register': 'Register',
    'webhook': 'Webhook',
    'user': 'User Management',
    'search': 'Search',
    'upload': 'File Upload',
    'notification': 'Notification',
    'email': 'Email',
    'cart': 'Cart',
    'product': 'Product',
    'profile': 'Profile',
    'dashboard': 'Dashboard',
    'subscription': 'Subscription',
    'billing': 'Billing',
  }

  for (const [key, label] of Object.entries(nameMap)) {
    if (name.toLowerCase().includes(key)) return label
  }

  // Fallback: title-case the filename
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function scoreFlow(flow: FlowStep[]): number {
  // Longer flows that cross multiple zones score higher
  const uniqueZones = new Set(flow.map(s => s.zone)).size
  const length = flow.length
  const crossesBoundaries = uniqueZones >= 2 ? 1 : 0
  return length * 0.4 + uniqueZones * 0.4 + crossesBoundaries * 0.2
}

export function detectFlows(graph: CodeGraph, maxFlows = 5): Flow[] {
  // Find all entrypoint nodes
  const entrypoints = [...graph.nodes.values()].filter(
    n => n.zone === 'entrypoints' && n.type !== 'external',
  )

  if (entrypoints.length === 0) return []

  const candidateFlows: Array<{ name: string; steps: FlowStep[]; score: number }> = []

  for (const entry of entrypoints) {
    const steps = traceFlow(entry.id, graph)
    if (steps.length < 2) continue

    const score = scoreFlow(steps)
    const name = flowName(entry.path ?? entry.label)

    candidateFlows.push({ name, steps, score })
  }

  // Deduplicate flows with very similar paths
  const seen = new Set<string>()
  const unique = candidateFlows
    .sort((a, b) => b.score - a.score)
    .filter(f => {
      const key = f.steps
        .slice(0, 3)
        .map(s => s.label)
        .join('→')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return unique.slice(0, maxFlows).map((f, i) => ({
    id: `flow-${i}`,
    name: f.name,
    confidence: Math.min(0.95, 0.5 + f.score * 0.1),
    steps: f.steps,
  }))
}
