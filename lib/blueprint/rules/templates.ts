import type { ZoneId } from '../types'

// Offline mode narration templates — generated without LLM

export function getZoneDescription(
  zoneId: ZoneId,
  fileCount: number,
  folders: string[],
  frameworks: string[],
): string {
  const folderList = folders.slice(0, 3).join(', ')

  switch (zoneId) {
    case 'experience': {
      if (fileCount === 0) return 'No user-facing UI detected in this repository.'
      const hasReact = frameworks.some(f => ['Next.js', 'Remix', 'Vite', 'Nuxt'].includes(f))
      if (hasReact) {
        return `User-facing React components and pages (${fileCount} files${folderList ? ` in ${folderList}` : ''}). This is where users interact with the application.`
      }
      return `User interface layer with ${fileCount} files${folderList ? ` across ${folderList}` : ''}. Contains templates, views, and client-facing code.`
    }

    case 'entrypoints': {
      if (fileCount === 0) return 'No explicit entrypoints detected — execution may start from a single file.'
      return `Request handling layer with ${fileCount} files${folderList ? ` in ${folderList}` : ''}. This is where external requests arrive and get routed to the appropriate logic.`
    }

    case 'core_logic': {
      if (fileCount === 0) return 'Business logic may be co-located with entrypoints or data layer.'
      return `Core business logic with ${fileCount} files${folderList ? ` in ${folderList}` : ''}. Contains the rules, services, and workflows that define what this system does.`
    }

    case 'data': {
      if (fileCount === 0) return 'No dedicated data layer detected — the system may use an external database directly.'
      const hasPrisma = folders.some(f => f.includes('prisma'))
      if (hasPrisma) {
        return `Database layer using Prisma ORM with ${fileCount} files${folderList ? ` in ${folderList}` : ''}. Defines data models, migrations, and persistence logic.`
      }
      return `Data persistence layer with ${fileCount} files${folderList ? ` in ${folderList}` : ''}. Contains models, migrations, and repository patterns.`
    }

    case 'external': {
      if (fileCount === 0) return 'No third-party service integrations detected.'
      return `Third-party service integrations (${fileCount} files${folderList ? ` touching ${folderList}` : ''}). Wraps external APIs and manages credentials and retry logic.`
    }

    case 'platform': {
      if (fileCount === 0) return 'No deployment or infrastructure configuration detected.'
      return `Deployment and infrastructure configuration with ${fileCount} files. Defines how this system is built, deployed, and operated.`
    }
  }
}

export function getRepoSummary(
  repoName: string,
  languages: string[],
  frameworks: string[],
  externalSystems: string[],
  zoneFileCounts: Record<ZoneId, number>,
): string {
  const hasUI = zoneFileCounts.experience > 0
  const hasAPI = zoneFileCounts.entrypoints > 0
  const hasWorkers = false // would need to detect this
  const hasData = zoneFileCounts.data > 0

  const langStr = languages.slice(0, 2).join(' / ')
  const frameworkStr = frameworks.slice(0, 3).join(', ')
  const extStr = externalSystems.slice(0, 3).join(', ')

  const parts: string[] = []

  if (frameworkStr) parts.push(frameworkStr)
  else if (langStr) parts.push(langStr)

  if (hasUI && hasAPI) parts.push('full-stack application')
  else if (hasUI) parts.push('frontend application')
  else if (hasAPI) parts.push('API service')
  else parts.push('library or tool')

  if (hasData) parts.push('with database')
  if (extStr) parts.push(`using ${extStr}`)

  return parts.join(' — ')
}

export function getFlowDescription(flowName: string, steps: string[]): string {
  if (steps.length === 0) return `${flowName} flow — no steps detected.`
  const start = steps[0]
  const end = steps[steps.length - 1]
  return `${flowName}: originates at ${start}, passes through ${steps.length - 2} intermediate steps, and terminates at ${end}.`
}

export function getReadFirstExplanation(files: string[]): string {
  if (files.length === 0) return 'Start from the root directory and follow imports from the main entry file.'
  return `Begin with ${files[0]} to understand project structure and configuration, then follow the imports into ${files.slice(1, 3).join(' → ')}.`
}
