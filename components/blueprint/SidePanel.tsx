'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Flow, Zone } from '@/lib/blueprint/types'
import { ZONE_META } from '@/lib/blueprint/types'

interface SidePanelProps {
  selectedZone: Zone | null
  selectedFlow: Flow | null
  repoUrl: string
  onClose: () => void
}

function GitHubLink({ repoUrl, filePath }: { repoUrl: string; filePath: string }) {
  const url = `${repoUrl}/blob/HEAD/${filePath}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-mono text-blue-500 hover:text-blue-700 hover:underline break-all"
    >
      {filePath}
    </a>
  )
}

export function SidePanel({ selectedZone, selectedFlow, repoUrl, onClose }: SidePanelProps) {
  const isOpen = selectedZone !== null || selectedFlow !== null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            {selectedZone && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: ZONE_META[selectedZone.id].color }}
                />
                <span className="font-semibold text-sm text-gray-900">
                  {ZONE_META[selectedZone.id].label}
                </span>
              </div>
            )}
            {selectedFlow && (
              <span className="font-semibold text-sm text-gray-900">
                {selectedFlow.name} Flow
              </span>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selectedZone && <ZoneDetail zone={selectedZone} repoUrl={repoUrl} />}
            {selectedFlow && <FlowDetail flow={selectedFlow} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ZoneDetail({ zone, repoUrl }: { zone: Zone; repoUrl: string }) {
  const meta = ZONE_META[zone.id]

  return (
    <>
      {zone.description && (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">{zone.description}</p>
        </div>
      )}

      {zone.fileCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Files
            </h4>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
            >
              {zone.fileCount} total
            </span>
          </div>

          {zone.folders.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Key folders</p>
              <div className="flex flex-wrap gap-1">
                {zone.folders.map(f => (
                  <span
                    key={f}
                    className="text-xs px-2 py-0.5 bg-gray-50 rounded border border-gray-100 font-mono text-gray-600"
                  >
                    {f}/
                  </span>
                ))}
              </div>
            </div>
          )}

          {zone.importantFiles.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Important files</p>
              <div className="space-y-1.5">
                {zone.importantFiles.map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-300 flex-shrink-0">
                      <path d="M2 1h4l3 3v5H2V1z" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <GitHubLink repoUrl={repoUrl} filePath={f} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {zone.fileCount === 0 && (
        <p className="text-sm text-gray-400 italic">
          No files classified in this zone for this repository.
        </p>
      )}
    </>
  )
}

function FlowDetail({ flow }: { flow: Flow }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400">
          Confidence: {Math.round(flow.confidence * 100)}%
        </span>
      </div>

      <div className="space-y-2">
        {flow.steps.map((step, i) => {
          const isLast = i === flow.steps.length - 1
          const meta = step.zone ? ZONE_META[step.zone] : null

          return (
            <div key={i}>
              <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-gray-50">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: meta?.color ?? '#9ca3af' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{step.label}</p>
                  {step.zone && (
                    <p className="text-xs text-gray-400" style={{ color: meta?.text }}>
                      {meta?.label}
                    </p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center my-0.5">
                  <div className="w-px h-3 bg-gray-200" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
