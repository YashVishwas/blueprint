import { Octokit } from '@octokit/rest'
import type { FileEntry, RepoSnapshot } from './types'

const MAX_REPO_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB
const MAX_FILE_SIZE_BYTES = 512 * 1024 // 512 KB per file for content fetching
const MAX_CONTENT_FILES = 60 // fetch raw content for at most this many files

function octokit() {
  const token = process.env.GITHUB_TOKEN
  // Only pass auth if token looks real (not a placeholder or empty)
  const auth = token && !token.startsWith('your_') && token.length > 10 ? token : undefined
  return new Octokit({ auth })
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim())
    if (!u.hostname.includes('github.com')) return null
    const parts = u.pathname.replace(/^\//, '').split('/')
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

export async function getDefaultBranch(owner: string, repo: string): Promise<{ branch: string; sha: string; sizeKB: number }> {
  const kit = octokit()
  const { data } = await kit.repos.get({ owner, repo })
  const branch = data.default_branch
  const sizeKB = data.size ?? 0

  const branchData = await kit.repos.getBranch({ owner, repo, branch })
  const sha = branchData.data.commit.sha

  return { branch, sha, sizeKB }
}

export async function fetchRepoTree(owner: string, repo: string, sha: string): Promise<FileEntry[]> {
  const kit = octokit()
  const { data } = await kit.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: '1',
  })

  if (data.truncated) {
    console.warn(`[ingest] tree truncated for ${owner}/${repo} — repo is very large`)
  }

  return data.tree
    .filter(item => item.path && item.type)
    .map(item => ({
      path: item.path!,
      type: item.type as 'blob' | 'tree',
      size: item.size,
      sha: item.sha ?? undefined,
    }))
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const kit = octokit()
    const { data } = await kit.repos.getContent({ owner, repo, path })
    if (Array.isArray(data) || data.type !== 'file') return null
    if ((data as any).size > MAX_FILE_SIZE_BYTES) return null
    const content = (data as any).content as string
    return Buffer.from(content, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

// Prioritize files for raw content fetching
function prioritize(files: FileEntry[]): FileEntry[] {
  const PRIORITY_PATTERNS = [
    /package\.json$/,
    /tsconfig\.json$/,
    /next\.config\.(ts|js|mjs)$/,
    /vite\.config\.(ts|js)$/,
    /prisma\/schema\.prisma$/,
    /drizzle\.config\.(ts|js)$/,
    /requirements\.txt$/,
    /go\.mod$/,
    /Cargo\.toml$/,
    /Gemfile$/,
    /app\/api\//,
    /pages\/api\//,
    /routes\//,
    /controllers\//,
    /services\//,
    /models\//,
    /main\.(ts|js|py|go|rs)$/,
    /server\.(ts|js)$/,
    /index\.(ts|js)$/,
    /app\.(ts|js|py)$/,
  ]

  const scored = files
    .filter(f => f.type === 'blob' && (f.size ?? 0) < MAX_FILE_SIZE_BYTES)
    .map(f => {
      let score = 0
      PRIORITY_PATTERNS.forEach((pat, i) => {
        if (pat.test(f.path)) score += (PRIORITY_PATTERNS.length - i) * 2
      })
      // Penalize deeply nested files
      const depth = f.path.split('/').length
      score -= depth * 0.5
      return { file: f, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.map(s => s.file)
}

export async function ingest(owner: string, repo: string): Promise<RepoSnapshot> {
  const { branch, sha, sizeKB } = await getDefaultBranch(owner, repo)

  const totalSizeBytes = sizeKB * 1024
  if (totalSizeBytes > MAX_REPO_SIZE_BYTES) {
    throw new Error(`Repository is too large (${Math.round(sizeKB / 1024)} MB). Blueprint supports repos up to 200 MB.`)
  }

  const tree = await fetchRepoTree(owner, repo, sha)
  const blobFiles = tree.filter(f => f.type === 'blob')

  // Fetch content for the most important files
  const prioritized = prioritize(blobFiles).slice(0, MAX_CONTENT_FILES)
  const rawContents = new Map<string, string>()

  await Promise.allSettled(
    prioritized.map(async f => {
      const content = await fetchFileContent(owner, repo, f.path)
      if (content) rawContents.set(f.path, content)
    }),
  )

  return {
    owner,
    repo,
    defaultBranch: branch,
    commit: sha,
    tree: blobFiles,
    rawContents,
    totalSizeBytes,
  }
}
