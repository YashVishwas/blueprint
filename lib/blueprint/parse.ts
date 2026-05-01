import type { ParsedFile, RepoSnapshot } from './types'
import type { ClassifiedFile } from './types'
import { EXTERNAL_PACKAGE_MAP } from './rules/externals'

const TS_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function isJsTs(path: string): boolean {
  const ext = path.slice(path.lastIndexOf('.'))
  return TS_JS_EXTENSIONS.has(ext)
}

// Extract imports from TS/JS source using Babel parser
async function extractImports(content: string, filePath: string): Promise<{
  imports: string[]
  exports: string[]
  routes: string[]
  components: string[]
  externalPackages: string[]
}> {
  const result = {
    imports: [] as string[],
    exports: [] as string[],
    routes: [] as string[],
    components: [] as string[],
    externalPackages: [] as string[],
  }

  try {
    const { parse } = await import('@babel/parser')
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    })

    for (const node of ast.program.body) {
      // Import declarations: import X from 'y'
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value
        result.imports.push(source)
        if (!source.startsWith('.') && !source.startsWith('/')) {
          // It's an npm package
          const pkgName = source.startsWith('@')
            ? source.split('/').slice(0, 2).join('/')
            : source.split('/')[0]
          if (pkgName) result.externalPackages.push(pkgName)
        }
      }

      // Export declarations
      if (
        node.type === 'ExportDefaultDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration'
      ) {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          const decl = node.declaration
          if (decl.type === 'FunctionDeclaration' && decl.id) {
            result.exports.push(decl.id.name)
          }
          if (decl.type === 'ClassDeclaration' && decl.id) {
            result.exports.push(decl.id.name)
          }
        }
      }
    }

    // Detect route handlers using regex (fast, no need for full AST)
    const routePatterns = [
      // Next.js App Router: export async function GET/POST/PUT/DELETE
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g,
      // Express: app.get/post/put/delete, router.get etc.
      /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g,
      // Fastify: fastify.get/post etc.
      /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g,
    ]

    for (const pat of routePatterns) {
      let match
      while ((match = pat.exec(content)) !== null) {
        result.routes.push(match[2] ?? match[1])
      }
    }

    // Detect React components (functions/classes starting with uppercase)
    const componentPattern = /(?:export\s+)?(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g
    let m
    while ((m = componentPattern.exec(content)) !== null) {
      if (content.includes('return') && (content.includes('<') || content.includes('jsx'))) {
        result.components.push(m[1])
      }
    }
  } catch {
    // Parser failure — fall back to regex-only extraction
    const importRe = /^import\s+.*?from\s+['"`]([^'"`]+)['"`]/gm
    let match
    while ((match = importRe.exec(content)) !== null) {
      const source = match[1]
      result.imports.push(source)
      if (!source.startsWith('.') && !source.startsWith('/')) {
        const pkgName = source.startsWith('@')
          ? source.split('/').slice(0, 2).join('/')
          : source.split('/')[0]
        if (pkgName) result.externalPackages.push(pkgName)
      }
    }
  }

  // Deduplicate
  result.imports = [...new Set(result.imports)]
  result.exports = [...new Set(result.exports)]
  result.routes = [...new Set(result.routes)]
  result.components = [...new Set(result.components)]
  result.externalPackages = [...new Set(result.externalPackages)]
    .filter(pkg => EXTERNAL_PACKAGE_MAP[pkg] !== undefined)

  return result
}

export async function parseFiles(
  snapshot: RepoSnapshot,
  classified: ClassifiedFile[],
): Promise<ParsedFile[]> {
  const results: ParsedFile[] = []

  // Only parse files we have content for, and only TS/JS
  const jstsFiles = classified.filter(f => isJsTs(f.path) && snapshot.rawContents.has(f.path))

  await Promise.allSettled(
    jstsFiles.map(async f => {
      const content = snapshot.rawContents.get(f.path)!
      const extracted = await extractImports(content, f.path)
      results.push({ path: f.path, ...extracted })
    }),
  )

  return results
}
