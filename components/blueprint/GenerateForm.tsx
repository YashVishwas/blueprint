'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\/$/, '')
    const u = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`)
    if (!u.hostname.includes('github.com')) return null
    const parts = u.pathname.replace(/^\//, '').split('/')
    if (parts.length < 2 || !parts[0] || !parts[1]) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

export function GenerateForm({ defaultMode = 'ai' }: { defaultMode?: 'ai' | 'offline' }) {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'ai' | 'offline'>(defaultMode)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Enter a GitHub repository URL')
      return
    }

    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      setError('Invalid GitHub URL — try: https://github.com/owner/repo')
      return
    }

    router.push(`/blueprint/${parsed.owner}/${parsed.repo}?mode=${mode}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* URL input */}
      <div className="relative">
        <input
          type="text"
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          placeholder="https://github.com/owner/repo"
          className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 px-1">{error}</p>
      )}

      {/* Mode toggle + Submit row */}
      <div className="flex items-center gap-3">
        {/* Mode selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'ai'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✦ AI
          </button>
          <button
            type="button"
            onClick={() => setMode('offline')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'offline'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚡ Offline
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="flex-1 py-2.5 px-5 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          Generate Blueprint →
        </button>
      </div>

      {mode === 'offline' && (
        <p className="text-xs text-gray-400 px-1">
          Offline mode: instant results with no AI — no API key needed.
        </p>
      )}
    </form>
  )
}
