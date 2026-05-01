'use client'

import type { Flow } from '@/lib/blueprint/types'
import { ZONE_META } from '@/lib/blueprint/types'

interface FlowStripProps {
  flows: Flow[]
  selectedFlowId: string | null
  onSelect: (flow: Flow) => void
}

export function FlowStrip({ flows, selectedFlowId, onSelect }: FlowStripProps) {
  if (flows.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        Main Flows
      </h3>
      <div className="flex flex-wrap gap-2">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => onSelect(flow)}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              selectedFlowId === flow.id
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
            }`}
          >
            <span>{flow.name}</span>

            {/* Mini flow path preview */}
            <span className={`hidden group-hover:flex items-center gap-0.5 text-xs ${
              selectedFlowId === flow.id ? 'flex text-gray-300' : 'text-gray-400'
            }`}>
              {flow.steps.slice(0, 4).map((step, i) => {
                const meta = step.zone ? ZONE_META[step.zone] : null
                return (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <span className="opacity-50">→</span>}
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: meta?.color ?? '#9ca3af' }}
                    />
                  </span>
                )
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
