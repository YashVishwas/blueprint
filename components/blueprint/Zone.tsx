'use client'

import { motion } from 'framer-motion'
import type { Zone } from '@/lib/blueprint/types'
import { ZONE_META } from '@/lib/blueprint/types'

interface ZoneCardProps {
  zone: Zone
  isSelected: boolean
  onSelect: (zone: Zone) => void
  compact?: boolean
}

export function ZoneCard({ zone, isSelected, onSelect, compact = false }: ZoneCardProps) {
  const meta = ZONE_META[zone.id]
  const isEmpty = zone.fileCount === 0

  return (
    <motion.div
      layout
      whileHover={isEmpty ? undefined : { y: -2 }}
      onClick={() => !isEmpty && onSelect(zone)}
      className={`zone-card rounded-xl border p-4 cursor-pointer select-none transition-all ${
        isEmpty ? 'opacity-40 cursor-default' : ''
      } ${isSelected ? 'ring-2' : ''}`}
      style={{
        backgroundColor: meta.bg,
        borderColor: isSelected ? meta.color : meta.border,
        outline: isSelected ? `2px solid ${meta.color}` : 'none',
        outlineOffset: '2px',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: meta.color }}
          >
            {meta.label}
          </h3>
          {zone.description && !compact && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {zone.description}
            </p>
          )}
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          {zone.fileCount}
        </span>
      </div>

      {/* Folder pills */}
      {zone.folders.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {zone.folders.slice(0, 3).map(f => (
            <span
              key={f}
              className="text-xs px-1.5 py-0.5 bg-white bg-opacity-70 rounded border border-white text-gray-500 font-mono"
            >
              {f}/
            </span>
          ))}
        </div>
      )}

      {/* Important files */}
      {!compact && zone.importantFiles.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {zone.importantFiles.slice(0, 2).map(f => (
            <p key={f} className="text-xs text-gray-400 font-mono truncate">
              {f}
            </p>
          ))}
        </div>
      )}

      {isEmpty && (
        <p className="text-xs text-gray-400 italic">Not detected</p>
      )}
    </motion.div>
  )
}
