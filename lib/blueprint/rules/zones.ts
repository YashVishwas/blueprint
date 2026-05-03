import type { ZoneId } from '../types'

export interface ZoneRule {
  zone: ZoneId
  weight: number
  patterns: string[]
}

export const ZONE_RULES: ZoneRule[] = [
  // ── Experience ──────────────────────────────────────────────────────────────
  {
    zone: 'experience',
    weight: 1.0,
    patterns: [
      // Next.js / React pages
      'pages/**',
      'app/**/page.tsx',
      'app/**/page.jsx',
      'app/**/page.ts',
      'app/**/page.js',
      'app/**/layout.tsx',
      'app/**/layout.jsx',
      'app/**/loading.tsx',
      'app/**/not-found.tsx',
      'app/**/error.tsx',
      // Generic UI dirs
      'components/**',
      'src/components/**',
      'views/**',
      'src/views/**',
      'screens/**',
      'src/screens/**',
      'ui/**',
      'src/ui/**',
      'frontend/**',
      'client/**',
      'templates/**',
      'src/templates/**',
      // Mobile
      'android/**',
      'ios/**',
      // Storybook
      '**/*.stories.tsx',
      '**/*.stories.jsx',
      '**/*.stories.ts',
      '**/*.stories.js',
      // Static assets
      'public/**',
      'static/**',
      'assets/**',
    ],
  },

  // ── Entrypoints ─────────────────────────────────────────────────────────────
  {
    zone: 'entrypoints',
    weight: 1.0,
    patterns: [
      // Next.js API routes
      'app/api/**',
      'pages/api/**',
      // Express / Fastify / Hono style
      'routes/**',
      'src/routes/**',
      'router/**',
      'src/router/**',
      // MVC controllers
      'controllers/**',
      'src/controllers/**',
      // Handlers
      'handlers/**',
      'src/handlers/**',
      'webhooks/**',
      'src/webhooks/**',
      // GraphQL
      'resolvers/**',
      'src/resolvers/**',
      'graphql/**',
      'src/graphql/**',
      // Entry files
      'main.ts',
      'main.js',
      'main.py',
      'main.go',
      'main.rs',
      'main.rb',
      'server.ts',
      'server.js',
      'server.py',
      'index.ts',
      'index.js',
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'src/server.ts',
      'src/server.js',
      'app.ts',
      'app.js',
      'app.py',
      'app.rb',
      // CLI
      'cmd/**',
      'bin/**',
      'cli/**',
      'src/cli/**',
      // Django / FastAPI / Flask
      'urls.py',
      '**/urls.py',
      '**/views.py',
      '**/routers.py',
    ],
  },

  // ── Core Logic ──────────────────────────────────────────────────────────────
  {
    zone: 'core_logic',
    weight: 1.0,
    patterns: [
      'services/**',
      'src/services/**',
      'lib/**',
      'src/lib/**',
      'domain/**',
      'src/domain/**',
      'use-cases/**',
      'usecases/**',
      'src/use-cases/**',
      'workflows/**',
      'src/workflows/**',
      'managers/**',
      'src/managers/**',
      'processors/**',
      'src/processors/**',
      'helpers/**',
      'src/helpers/**',
      'utils/**',
      'src/utils/**',
      'core/**',
      'src/core/**',
      'business/**',
      'src/business/**',
      'logic/**',
      'src/logic/**',
      'internal/**',
      'pkg/**',
      'common/**',
      'src/common/**',
      // Python
      '**/services.py',
      '**/tasks.py',
      // Hooks (React)
      'hooks/**',
      'src/hooks/**',
    ],
  },

  // ── Data ────────────────────────────────────────────────────────────────────
  {
    zone: 'data',
    weight: 1.0,
    patterns: [
      'db/**',
      'database/**',
      'models/**',
      'src/models/**',
      'repositories/**',
      'src/repositories/**',
      'repos/**',
      'src/repos/**',
      'migrations/**',
      'src/migrations/**',
      'schema/**',
      'schemas/**',
      'src/schemas/**',
      'prisma/**',
      'drizzle/**',
      'sequelize/**',
      'typeorm/**',
      'entities/**',
      'src/entities/**',
      'seeds/**',
      'seeders/**',
      // Store / state management
      'store/**',
      'src/store/**',
      'stores/**',
      'src/stores/**',
      'state/**',
      'src/state/**',
      'redux/**',
      'src/redux/**',
      'slices/**',
      // File patterns
      '**/*.prisma',
      '**/*.sql',
      '**/schema.ts',
      '**/schema.js',
      '**/drizzle.config.ts',
    ],
  },

  // ── External Systems ────────────────────────────────────────────────────────
  // Directories that explicitly wrap third-party services or APIs.
  // Lower weight (0.7) because adapters/clients can be internal too — the graph
  // stage resolves the definitive external list from npm/pip import names.
  {
    zone: 'external',
    weight: 0.7,
    patterns: [
      'integrations/**',
      'src/integrations/**',
      'providers/**',
      'src/providers/**',
      'adapters/**',
      'src/adapters/**',
      'connectors/**',
      'src/connectors/**',
      'third-party/**',
      'api-clients/**',
      'src/api-clients/**',
      // Python
      '**/integrations.py',
      '**/providers.py',
    ],
  },

  // ── Platform / Runtime ───────────────────────────────────────────────────────
  {
    zone: 'platform',
    weight: 1.0,
    patterns: [
      // Docker
      'Dockerfile',
      'Dockerfile.*',
      '*.dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      'docker-compose.*.yml',
      // CI/CD
      '.github/**',
      '.gitlab-ci.yml',
      '.circleci/**',
      '.travis.yml',
      'Jenkinsfile',
      '.buildkite/**',
      'bitbucket-pipelines.yml',
      // IaC
      'terraform/**',
      'tf/**',
      'infra/**',
      'infrastructure/**',
      'pulumi/**',
      'cdk/**',
      'serverless.yml',
      'serverless.yaml',
      // Kubernetes
      'k8s/**',
      'kubernetes/**',
      'helm/**',
      // Deploy scripts
      'deploy/**',
      'deployment/**',
      'scripts/**',
      // Config files
      '.env',
      '.env.*',
      'Makefile',
      'makefile',
      'nginx/**',
      'nginx.conf',
      'ansible/**',
      // Shell
      '**/*.sh',
      '**/*.bash',
    ],
  },
]

// Patterns where we override the above rules with a stronger signal
export const STRONG_ENTRYPOINT_PATTERNS = [
  /app\/api\//,
  /pages\/api\//,
  /routes?\//,
  /controllers?\//,
  /handlers?\//,
]

export const STRONG_DATA_PATTERNS = [
  /\.prisma$/,
  /\.sql$/,
  /migrations?\//,
  /prisma\//,
  /drizzle\//,
]

// Globs that should always be excluded from classification
export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.next/**',
  'dist/**',
  'build/**',
  'out/**',
  '.git/**',
  'coverage/**',
  '.turbo/**',
  'vendor/**',
  'target/**',
  '__pycache__/**',
  '.venv/**',
  'venv/**',
  '*.lock',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.d.ts',
  '**/*.map',
  '**/*.snap',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.svg',
  '**/*.ico',
  '**/*.woff',
  '**/*.woff2',
  '**/*.ttf',
  '**/*.eot',
  '**/*.pdf',
  '**/*.zip',
]
