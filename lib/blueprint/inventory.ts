import path from 'path'
import type { FileEntry, Inventory, RepoSnapshot } from './types'
import { FRAMEWORK_SIGNATURES, LANGUAGE_EXTENSIONS } from './rules/frameworks'

export function detectInventory(snapshot: RepoSnapshot): Inventory {
  const { tree, rawContents } = snapshot
  const paths = tree.map(f => f.path)
  const pathSet = new Set(paths)

  // ── Languages ──────────────────────────────────────────────────────────────
  const langCounts = new Map<string, number>()
  for (const f of tree) {
    const ext = path.extname(f.path).toLowerCase()
    const lang = LANGUAGE_EXTENSIONS[ext]
    if (lang) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1)
  }
  const languages = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)

  // ── Package manager ────────────────────────────────────────────────────────
  let packageManager: string | null = null
  if (pathSet.has('pnpm-lock.yaml')) packageManager = 'pnpm'
  else if (pathSet.has('yarn.lock')) packageManager = 'yarn'
  else if (pathSet.has('bun.lockb') || pathSet.has('bun.lock')) packageManager = 'bun'
  else if (pathSet.has('package-lock.json')) packageManager = 'npm'
  else if (pathSet.has('Pipfile.lock') || pathSet.has('poetry.lock')) packageManager = 'pip'
  else if (pathSet.has('Gemfile.lock')) packageManager = 'bundler'
  else if (pathSet.has('go.sum')) packageManager = 'go modules'
  else if (pathSet.has('Cargo.lock')) packageManager = 'cargo'

  // ── Frameworks ────────────────────────────────────────────────────────────
  const frameworks: string[] = []

  // Get dependencies from package.json
  let allDeps: Record<string, string> = {}
  let devDeps: Record<string, string> = {}
  const pkgJson = rawContents.get('package.json')
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson)
      allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.peerDependencies ?? {}) }
      devDeps = pkg.devDependencies ?? {}
    } catch {
      // ignore
    }
  }

  // Get Python dependencies
  const reqTxt = rawContents.get('requirements.txt')
  const pipDeps = new Set<string>()
  if (reqTxt) {
    for (const line of reqTxt.split('\n')) {
      const pkg = line.split(/[>=<!]/)[0].trim().toLowerCase()
      if (pkg) pipDeps.add(pkg)
    }
  }

  // Get Go modules
  const goMod = rawContents.get('go.mod')
  const goDeps = new Set<string>()
  if (goMod) {
    for (const line of goMod.split('\n')) {
      const match = line.trim().match(/^require\s+(\S+)/)
      if (match) goDeps.add(match[1])
    }
  }

  for (const sig of FRAMEWORK_SIGNATURES) {
    const { indicators } = sig
    let matched = false

    if (indicators.files?.some(f => pathSet.has(f))) matched = true
    if (!matched && indicators.deps?.some(d => allDeps[d])) matched = true
    if (!matched && indicators.devDeps?.some(d => devDeps[d])) matched = true
    if (!matched && indicators.filePatterns) {
      const allContent = [...rawContents.values()].join('\n')
      if (indicators.filePatterns.some(p => p.test(allContent))) matched = true
    }
    if (!matched && indicators.dirPatterns) {
      const allPaths = paths.join('\n')
      if (indicators.dirPatterns.some(p => p.test(allPaths))) matched = true
    }

    if (matched && !frameworks.includes(sig.name)) {
      frameworks.push(sig.name)
    }
  }

  // ── Infrastructure ────────────────────────────────────────────────────────
  const hasDocker = paths.some(p =>
    p === 'Dockerfile' ||
    p.startsWith('Dockerfile.') ||
    p === 'docker-compose.yml' ||
    p === 'docker-compose.yaml' ||
    p.endsWith('.dockerfile'),
  )

  const hasGithubActions = paths.some(p => p.startsWith('.github/workflows/'))

  // ── Top-level folders ─────────────────────────────────────────────────────
  const topFolderSet = new Set<string>()
  for (const f of tree) {
    const parts = f.path.split('/')
    if (parts.length > 1) topFolderSet.add(parts[0])
  }
  const topLevelFolders = [...topFolderSet].sort()

  return {
    languages,
    frameworks,
    packageManager,
    hasDocker,
    hasGithubActions,
    topLevelFolders,
  }
}
