import type { NextRequest } from 'next/server'
import { cacheGet } from '@/lib/blueprint/cache'
import { toMarkdown, toMermaid } from '@/lib/blueprint/render'
import type { Blueprint } from '@/lib/blueprint/types'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'json'

  // id is already encoded owner%2Frepo%40sha
  const key = `blueprint:${decodeURIComponent(id)}`
  const cached = await cacheGet(key)

  if (!cached) {
    return new Response('Blueprint not found. Generate it first.', { status: 404 })
  }

  const blueprint = JSON.parse(cached) as Blueprint

  switch (format) {
    case 'md': {
      const markdown = toMarkdown(blueprint)
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="BLUEPRINT-${blueprint.repo.name}.md"`,
        },
      })
    }

    case 'mmd': {
      const mermaid = toMermaid(blueprint)
      return new Response(mermaid, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="blueprint-${blueprint.repo.name}.mmd"`,
        },
      })
    }

    case 'json':
    default: {
      return new Response(JSON.stringify(blueprint, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="blueprint-${blueprint.repo.name}.json"`,
        },
      })
    }
  }
}
