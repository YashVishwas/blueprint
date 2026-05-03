'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Blueprint, Flow, Zone } from '@/lib/blueprint/types'
import { Canvas } from './Canvas'
import { SidePanel } from './SidePanel'
import { FlowStrip } from './FlowStrip'
import { ReadFirstStrip } from './ReadFirstStrip'
import { ProgressLog, type ProgressEvent } from './ProgressLog'
import Link from 'next/link'

interface BlueprintViewProps {
  owner: string
  repo: string
  mode: 'ai' | 'offline'
}

type PageState = 'loading' | 'fast_map' | 'complete' | 'error'

const EVENT_MESSAGES: Record<string, string> = {
  'status': '',
  'ingest.done': 'Repository tree fetched',
  'inventory.done': 'Stack detected',
  'classify.done': 'Zones classified',
  'parse.done': 'Source files parsed',
  'flows.done': 'Execution flows detected',
  'explain.done': 'Descriptions generated',
  'complete': 'Blueprint ready',
}

export function BlueprintView({ owner, repo, mode }: BlueprintViewProps) {
  const [state, setState] = useState<PageState>('loading')
  const terminalRef = useRef(false) // true once complete or error is reached
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [quickZones, setQuickZones] = useState<Zone[]>([])
  const [quickFlows, setQuickFlows] = useState<Flow[]>([])
  const [quickReadFirst, setQuickReadFirst] = useState<string[]>([])
  const [inventory, setInventory] = useState<Blueprint['inventory'] | null>(null)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)

  const addProgress = useCallback((id: string, message: string, status: ProgressEvent['status'] = 'done') => {
    setProgress(prev => {
      const existing = prev.find(e => e.id === id)
      if (existing) return prev.map(e => e.id === id ? { ...e, status, message } : e)
      return [...prev, { id, message, status }]
    })
  }, [])

  useEffect(() => {
    const url = `https://github.com/${owner}/${repo}`
    const params = new URLSearchParams({ url, mode })
    const evtSource = new EventSource(`/api/blueprint?${params}`)

    let currentStatusId = 0

    evtSource.addEventListener('status', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { message: string }
      const id = `status-${++currentStatusId}`
      addProgress(id, data.message, 'pending')
    })

    evtSource.addEventListener('ingest.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { fileCount: number; commit: string }
      addProgress('ingest', `Repository fetched — ${data.fileCount} files`, 'done')
    })

    evtSource.addEventListener('inventory.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Blueprint['inventory']
      setInventory(data)
      const stack = [...data.frameworks.slice(0, 3), ...data.languages.slice(0, 2)].join(', ')
      addProgress('inventory', `Stack detected: ${stack || 'unknown'}`, 'done')
    })

    evtSource.addEventListener('classify.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        zones: Array<{ id: string; fileCount: number; folders: string[] }>
        readFirst?: string[]
      }

      // Build quick zones for fast canvas render
      const zones: Zone[] = data.zones.map(z => ({
        id: z.id as Zone['id'],
        label: z.id,
        description: '',
        folders: z.folders,
        fileCount: z.fileCount,
        importantFiles: [],
        confidence: 0.6,
      }))
      setQuickZones(zones)
      if (data.readFirst && data.readFirst.length > 0) setQuickReadFirst(data.readFirst)
      setState('fast_map')
      addProgress('classify', 'Zones classified', 'done')
    })

    evtSource.addEventListener('parse.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { parsedFiles: number }
      addProgress('parse', `${data.parsedFiles} source files parsed`, 'done')
    })

    evtSource.addEventListener('flows.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { flowCount: number; flows: Flow[] }
      setQuickFlows(data.flows)
      addProgress('flows', `${data.flowCount} execution flow${data.flowCount !== 1 ? 's' : ''} detected`, 'done')
    })

    evtSource.addEventListener('explain.done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { summary: string }
      addProgress('explain', 'Descriptions generated', 'done')
    })

    evtSource.addEventListener('cached', (e: MessageEvent) => {
      addProgress('cache', 'Loaded from cache', 'done')
    })

    evtSource.addEventListener('complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { blueprint: Blueprint }
      setBlueprint(data.blueprint)
      setInventory(data.blueprint.inventory)
      terminalRef.current = true
      setState('complete')
      addProgress('complete', 'Blueprint ready ✓', 'done')
      evtSource.close()
    })

    evtSource.addEventListener('error', (e: MessageEvent | Event) => {
      let message = 'Failed to generate blueprint'
      if (e instanceof MessageEvent) {
        try {
          const data = JSON.parse(e.data) as { message: string }
          message = data.message
        } catch { /* use default */ }
      }
      terminalRef.current = true
      setError(message)
      setState('error')
      evtSource.close()
    })

    // onerror fires when the SSE stream closes — only show "Connection lost" if we
    // haven't already reached a terminal state (complete or error)
    evtSource.onerror = () => {
      if (!terminalRef.current) {
        setError('Connection lost. Please try again.')
        setState('error')
      }
      evtSource.close()
    }

    return () => evtSource.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, mode])

  const displayZones = blueprint?.zones ?? quickZones
  const displayFlows = blueprint?.flows ?? quickFlows
  const displayReadFirst = blueprint?.readFirst ?? (quickReadFirst.length > 0 ? quickReadFirst : null)
  const repoUrl = `https://github.com/${owner}/${repo}`
  const isEnriching = state === 'fast_map'

  const handleSelectZone = (zone: Zone) => {
    setSelectedZone(zone)
    setSelectedFlow(null)
  }

  const handleSelectFlow = (flow: Flow) => {
    setSelectedFlow(flow)
    setSelectedZone(null)
  }

  const handleClosePanel = () => {
    setSelectedZone(null)
    setSelectedFlow(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/" className="text-sm font-bold text-gray-900 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="14" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="3" y="11" width="18" height="5" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="7" y="19" width="10" height="2" rx="1" fill="currentColor" opacity="0.4" />
            </svg>
            Blueprint
          </Link>

          <span className="text-gray-200">/</span>

          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-gray-700 hover:text-gray-900 transition-colors"
          >
            {owner}/{repo}
          </a>

          {/* Stack chips */}
          <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
            {inventory?.frameworks.slice(0, 3).map(f => (
              <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 whitespace-nowrap">
                {f}
              </span>
            ))}
            {inventory?.languages.slice(0, 2).map(l => (
              <span key={l} className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400 whitespace-nowrap">
                {l}
              </span>
            ))}
          </div>

          {/* Mode + status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              mode === 'ai'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {mode === 'ai' ? '✦ AI' : '⚡ Offline'}
            </span>

            {state === 'complete' && blueprint && (
              <ExportButtons blueprint={blueprint} />
            )}
          </div>
        </div>
      </header>

      {/* Summary bar */}
      {(state === 'fast_map' || state === 'complete') && inventory && (
        <div className="bg-white border-b border-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <p className="text-sm text-gray-500">
              {[
                inventory.frameworks[0] && `${inventory.frameworks[0]} app`,
                `${displayZones.length} zones`,
                displayZones.find(z => z.id === 'entrypoints')?.fileCount
                  ? `${displayZones.find(z => z.id === 'entrypoints')!.fileCount} entrypoints`
                  : null,
                displayFlows.length > 0 ? `${displayFlows.length} flows` : null,
                inventory.hasDocker ? 'Docker' : null,
                inventory.hasGithubActions ? 'GitHub Actions' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {state === 'error' && (
          <div className="max-w-md mx-auto mt-12">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-red-600 text-sm font-medium mb-1">Failed to generate blueprint</p>
              <p className="text-red-400 text-sm">{error}</p>
              <Link href="/" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-900 underline">
                ← Try another repo
              </Link>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex justify-center mt-12">
            <ProgressLog events={progress} isLoading />
          </div>
        )}

        {(state === 'fast_map' || state === 'complete') && (
          <div className="grid gap-5" style={{ gridTemplateColumns: selectedZone || selectedFlow ? '1fr 340px' : '1fr' }}>
            {/* Left: canvas + strips */}
            <div className="space-y-5 min-w-0">
              {/* Progress overlay while enriching */}
              {state === 'fast_map' && (
                <div className="flex justify-center">
                  <ProgressLog events={progress} isLoading={state === 'fast_map'} />
                </div>
              )}

              {/* The Canvas */}
              <Canvas
                zones={displayZones}
                flows={displayFlows}
                selectedZone={selectedZone}
                onSelectZone={handleSelectZone}
                isLoading={isEnriching}
              />

              {/* Flows */}
              {displayFlows.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <FlowStrip
                    flows={displayFlows}
                    selectedFlowId={selectedFlow?.id ?? null}
                    onSelect={handleSelectFlow}
                  />
                </div>
              )}

              {/* Read first — shown as soon as structural analysis completes (~5s) */}
              {displayReadFirst && displayReadFirst.length > 0 && (
                <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${isEnriching ? 'opacity-80' : ''}`}>
                  <ReadFirstStrip files={displayReadFirst} repoUrl={repoUrl} />
                </div>
              )}

              {/* Repo summary (when complete) */}
              {blueprint?.repo.summary && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{blueprint.repo.summary}</p>
                  {blueprint.externalSystems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {blueprint.externalSystems.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-orange-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: side panel */}
            {(selectedZone || selectedFlow) && (
              <div className="w-[340px] flex-shrink-0">
                <SidePanel
                  selectedZone={selectedZone}
                  selectedFlow={selectedFlow}
                  repoUrl={repoUrl}
                  onClose={handleClosePanel}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ExportButtons({ blueprint }: { blueprint: Blueprint }) {
  const key = `${blueprint.repo.owner}/${blueprint.repo.name}@${blueprint.repo.commit}`
  const encoded = encodeURIComponent(key)

  return (
    <div className="flex items-center gap-1">
      <a
        href={`/api/export/${encoded}?format=md`}
        download={`BLUEPRINT-${blueprint.repo.name}.md`}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-gray-400 text-gray-500 hover:text-gray-700 transition-colors"
      >
        .md
      </a>
      <a
        href={`/api/export/${encoded}?format=json`}
        download={`blueprint-${blueprint.repo.name}.json`}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-gray-400 text-gray-500 hover:text-gray-700 transition-colors"
      >
        .json
      </a>
      <a
        href={`/api/export/${encoded}?format=mmd`}
        download={`blueprint-${blueprint.repo.name}.mmd`}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-gray-400 text-gray-500 hover:text-gray-700 transition-colors"
      >
        .mmd
      </a>
    </div>
  )
}
