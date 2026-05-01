import { GenerateForm } from '@/components/blueprint/GenerateForm'

const EXAMPLES = [
  { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
  { label: 'tiangolo/fastapi', url: 'https://github.com/tiangolo/fastapi' },
  { label: 'prisma/prisma', url: 'https://github.com/prisma/prisma' },
  { label: 'gin-gonic/gin', url: 'https://github.com/gin-gonic/gin' },
]

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-12 max-w-2xl">
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="14" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="3" y="11" width="18" height="5" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="7" y="19" width="10" height="2" rx="1" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Blueprint
        </h1>
        <p className="text-xl text-gray-500 leading-relaxed">
          Paste a GitHub repo. See the system.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          One visual map showing what the codebase is, how it flows, and where to start.
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-xl">
        <GenerateForm />
      </div>

      {/* Examples */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <span className="text-sm text-gray-400">Try:</span>
        {EXAMPLES.map(ex => (
          <a
            key={ex.label}
            href={`/blueprint/${ex.label}?mode=offline`}
            className="text-sm text-gray-500 hover:text-gray-900 font-mono underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 transition-colors"
          >
            {ex.label}
          </a>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-24 text-center text-xs text-gray-300">
        <a
          href="https://github.com/YashVishwas/blueprint"
          className="hover:text-gray-500 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open source on GitHub
        </a>
        {' · '}
        <span>Works on public repos · No account needed</span>
      </footer>
    </main>
  )
}
