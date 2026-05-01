import path from 'path'

interface CacheEntry {
  value: string
  createdAt: number
}

// ── SQLite implementation ─────────────────────────────────────────────────────

let sqlite: any = null

function getDb() {
  if (sqlite) return sqlite
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3')
  const dbPath = process.env.SQLITE_PATH ?? path.join(process.cwd(), '.blueprint-cache.db')
  sqlite = new Database(dbPath)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)
  return sqlite
}

async function sqliteGet(key: string): Promise<string | null> {
  try {
    const row = getDb().prepare('SELECT value FROM cache WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  } catch (err) {
    console.warn('[cache] SQLite get error:', err)
    return null
  }
}

async function sqliteSet(key: string, value: string): Promise<void> {
  try {
    getDb().prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(key, value)
  } catch (err) {
    console.warn('[cache] SQLite set error:', err)
  }
}

// ── Upstash implementation ────────────────────────────────────────────────────

async function upstashGet(key: string): Promise<string | null> {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    })
    const data = (await res.json()) as { result: string | null }
    return data.result ?? null
  } catch (err) {
    console.warn('[cache] Upstash get error:', err)
    return null
  }
}

async function upstashSet(key: string, value: string): Promise<void> {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    })
  } catch (err) {
    console.warn('[cache] Upstash set error:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const driver = process.env.CACHE_DRIVER ?? 'sqlite'

export async function cacheGet(key: string): Promise<string | null> {
  if (driver === 'upstash') return upstashGet(key)
  return sqliteGet(key)
}

export async function cacheSet(key: string, value: string): Promise<void> {
  if (driver === 'upstash') return upstashSet(key, value)
  return sqliteSet(key, value)
}

export function makeCacheKey(owner: string, repo: string, sha: string): string {
  return `blueprint:${owner}/${repo}@${sha}`
}
