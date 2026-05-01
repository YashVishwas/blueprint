import type { NextRequest } from 'next/server'
import { runPipeline } from '@/lib/blueprint/pipeline'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Allow up to 120 seconds for deep analysis
export const maxDuration = 120

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') ?? ''
  const mode = (searchParams.get('mode') ?? 'offline') as 'ai' | 'offline'

  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  const emit = (event: string, data: unknown) => {
    try {
      const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      writer.write(encoder.encode(chunk)).catch(() => {/* stream may be closed */})
    } catch {
      // ignore
    }
  }

  // Run pipeline async — don't await here so we can return the stream immediately
  runPipeline({ url, mode, emit })
    .catch(err => {
      emit('error', { message: err instanceof Error ? err.message : String(err) })
    })
    .finally(() => {
      writer.close().catch(() => {/* already closed */})
    })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
