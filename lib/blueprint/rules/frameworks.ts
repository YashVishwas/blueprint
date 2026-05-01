export interface FrameworkSignature {
  name: string
  language: string
  indicators: {
    files?: string[]
    deps?: string[]
    devDeps?: string[]
    dirPatterns?: RegExp[]
    filePatterns?: RegExp[]
  }
}

export const FRAMEWORK_SIGNATURES: FrameworkSignature[] = [
  // ── JavaScript / TypeScript ─────────────────────────────────────────────────
  {
    name: 'Next.js',
    language: 'TypeScript',
    indicators: {
      files: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
      deps: ['next'],
    },
  },
  {
    name: 'Remix',
    language: 'TypeScript',
    indicators: {
      files: ['remix.config.js', 'remix.config.ts'],
      deps: ['@remix-run/react', '@remix-run/node'],
    },
  },
  {
    name: 'Vite',
    language: 'TypeScript',
    indicators: {
      files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'],
      deps: ['vite'],
    },
  },
  {
    name: 'Nuxt',
    language: 'TypeScript',
    indicators: {
      files: ['nuxt.config.ts', 'nuxt.config.js'],
      deps: ['nuxt'],
    },
  },
  {
    name: 'SvelteKit',
    language: 'TypeScript',
    indicators: {
      files: ['svelte.config.js', 'svelte.config.ts'],
      deps: ['@sveltejs/kit'],
    },
  },
  {
    name: 'Express',
    language: 'TypeScript',
    indicators: { deps: ['express'] },
  },
  {
    name: 'Fastify',
    language: 'TypeScript',
    indicators: { deps: ['fastify'] },
  },
  {
    name: 'NestJS',
    language: 'TypeScript',
    indicators: { deps: ['@nestjs/core'] },
  },
  {
    name: 'tRPC',
    language: 'TypeScript',
    indicators: { deps: ['@trpc/server'] },
  },
  {
    name: 'Hono',
    language: 'TypeScript',
    indicators: { deps: ['hono'] },
  },
  {
    name: 'Elysia',
    language: 'TypeScript',
    indicators: { deps: ['elysia'] },
  },
  // ── ORMs / Data ─────────────────────────────────────────────────────────────
  {
    name: 'Prisma',
    language: 'TypeScript',
    indicators: {
      files: ['prisma/schema.prisma'],
      deps: ['@prisma/client'],
      devDeps: ['prisma'],
    },
  },
  {
    name: 'Drizzle',
    language: 'TypeScript',
    indicators: {
      files: ['drizzle.config.ts', 'drizzle.config.js'],
      deps: ['drizzle-orm'],
    },
  },
  {
    name: 'TypeORM',
    language: 'TypeScript',
    indicators: { deps: ['typeorm'] },
  },
  {
    name: 'Sequelize',
    language: 'TypeScript',
    indicators: { deps: ['sequelize'] },
  },
  // ── Testing ─────────────────────────────────────────────────────────────────
  {
    name: 'Vitest',
    language: 'TypeScript',
    indicators: { devDeps: ['vitest'], files: ['vitest.config.ts', 'vitest.config.js'] },
  },
  {
    name: 'Jest',
    language: 'TypeScript',
    indicators: { devDeps: ['jest'], files: ['jest.config.ts', 'jest.config.js'] },
  },
  // ── Python ─────────────────────────────────────────────────────────────────
  {
    name: 'FastAPI',
    language: 'Python',
    indicators: { filePatterns: [/fastapi/i], files: ['requirements.txt'] },
  },
  {
    name: 'Django',
    language: 'Python',
    indicators: { files: ['manage.py', 'settings.py'], dirPatterns: [/django/i] },
  },
  {
    name: 'Flask',
    language: 'Python',
    indicators: { filePatterns: [/flask/i], files: ['requirements.txt'] },
  },
  // ── Go ──────────────────────────────────────────────────────────────────────
  {
    name: 'Go',
    language: 'Go',
    indicators: { files: ['go.mod', 'go.sum'] },
  },
  {
    name: 'Gin',
    language: 'Go',
    indicators: { filePatterns: [/gin-gonic\/gin/] },
  },
  {
    name: 'Fiber',
    language: 'Go',
    indicators: { filePatterns: [/gofiber\/fiber/] },
  },
  // ── Rust ────────────────────────────────────────────────────────────────────
  {
    name: 'Rust',
    language: 'Rust',
    indicators: { files: ['Cargo.toml', 'Cargo.lock'] },
  },
  {
    name: 'Axum',
    language: 'Rust',
    indicators: { filePatterns: [/axum/] },
  },
  // ── Ruby ────────────────────────────────────────────────────────────────────
  {
    name: 'Rails',
    language: 'Ruby',
    indicators: { files: ['Gemfile', 'config/routes.rb'], dirPatterns: [/rails/i] },
  },
  // ── Java / Kotlin ───────────────────────────────────────────────────────────
  {
    name: 'Spring Boot',
    language: 'Java',
    indicators: { filePatterns: [/spring-boot/i] },
  },
]

// Language detection by file extension
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.cs': 'C#',
  '.php': 'PHP',
  '.scala': 'Scala',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.hs': 'Haskell',
  '.clj': 'Clojure',
  '.dart': 'Dart',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C',
  '.hpp': 'C++',
}
