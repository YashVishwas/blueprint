'use client'

import { motion } from 'framer-motion'
import type { Flow, Zone } from '@/lib/blueprint/types'
import { ZONE_IDS, ZONE_META } from '@/lib/blueprint/types'
import { ZoneCard } from './Zone'

interface CanvasProps {
  zones: Zone[]
  flows: Flow[]
  selectedZone: Zone | null
  onSelectZone: (zone: Zone) => void
  isLoading?: boolean
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 select-none">
      <div className="w-px h-5 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <div className="h-px w-6 bg-gray-100" />
        {label && <span className="text-xs text-gray-300">{label}</span>}
        <div className="h-px w-6 bg-gray-100" />
      </div>
      {/* Arrowhead */}
      <svg width="8" height="5" viewBox="0 0 8 5" className="fill-gray-200">
        <polygon points="4,5 0,0 8,0" />
      </svg>
    </div>
  )
}

function YConnector({ leftLabel = 'reads/writes', rightLabel = 'calls' }: {
  leftLabel?: string
  rightLabel?: string
}) {
  return (
    <div className="relative h-10 w-full select-none">
      <svg
        viewBox="0 0 400 40"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Main stem down */}
        <line x1="200" y1="0" x2="200" y2="18" stroke="#e5e7eb" strokeWidth="1" />
        {/* Horizontal spread */}
        <line x1="100" y1="18" x2="300" y2="18" stroke="#e5e7eb" strokeWidth="1" />
        {/* Left branch */}
        <line x1="100" y1="18" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="1" />
        {/* Right branch */}
        <line x1="300" y1="18" x2="300" y2="40" stroke="#e5e7eb" strokeWidth="1" />
        {/* Left arrowhead */}
        <polygon points="100,40 96,33 104,33" fill="#e5e7eb" />
        {/* Right arrowhead */}
        <polygon points="300,40 296,33 304,33" fill="#e5e7eb" />
      </svg>
      {/* Labels */}
      <div className="absolute inset-0 flex items-end justify-around pb-0.5 pointer-events-none">
        <span className="text-xs text-gray-300">{leftLabel}</span>
        <span className="text-xs text-gray-300">{rightLabel}</span>
      </div>
    </div>
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const zoneVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export function Canvas({ zones, flows, selectedZone, onSelectZone, isLoading }: CanvasProps) {
  const zoneMap = new Map(zones.map(z => [z.id, z]))

  const experience = zoneMap.get('experience')
  const entrypoints = zoneMap.get('entrypoints')
  const core = zoneMap.get('core_logic')
  const data = zoneMap.get('data')
  const external = zoneMap.get('external')
  const platform = zoneMap.get('platform')

  // Build placeholder zones for ones not yet loaded
  const placeholder = (id: typeof ZONE_IDS[number]): Zone => ({
    id,
    label: ZONE_META[id].label,
    description: '',
    folders: [],
    fileCount: 0,
    importantFiles: [],
    confidence: 0,
  })

  const exp = experience ?? placeholder('experience')
  const ent = entrypoints ?? placeholder('entrypoints')
  const cor = core ?? placeholder('core_logic')
  const dat = data ?? placeholder('data')
  const ext = external ?? placeholder('external')
  const plat = platform ?? placeholder('platform')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Client label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center mb-1"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
            User / Client
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col"
      >
        {/* Experience */}
        <Connector label="interacts" />
        <motion.div variants={zoneVariants}>
          <ZoneCard
            zone={exp}
            isSelected={selectedZone?.id === 'experience'}
            onSelect={onSelectZone}
          />
        </motion.div>

        {/* Entrypoints */}
        <Connector label="calls" />
        <motion.div variants={zoneVariants}>
          <ZoneCard
            zone={ent}
            isSelected={selectedZone?.id === 'entrypoints'}
            onSelect={onSelectZone}
          />
        </motion.div>

        {/* Core Logic */}
        <Connector label="invokes" />
        <motion.div variants={zoneVariants}>
          <ZoneCard
            zone={cor}
            isSelected={selectedZone?.id === 'core_logic'}
            onSelect={onSelectZone}
          />
        </motion.div>

        {/* Y-split to Data + External */}
        <YConnector leftLabel="reads/writes" rightLabel="calls" />
        <motion.div variants={zoneVariants} className="grid grid-cols-2 gap-3">
          <ZoneCard
            zone={dat}
            isSelected={selectedZone?.id === 'data'}
            onSelect={onSelectZone}
          />
          <ZoneCard
            zone={ext}
            isSelected={selectedZone?.id === 'external'}
            onSelect={onSelectZone}
          />
        </motion.div>

        {/* Platform (full-width, separated) */}
        <motion.div variants={zoneVariants} className="mt-4 pt-4 border-t border-dashed border-gray-100">
          <ZoneCard
            zone={plat}
            isSelected={selectedZone?.id === 'platform'}
            onSelect={onSelectZone}
            compact
          />
        </motion.div>
      </motion.div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
          Enriching with deeper analysis...
        </div>
      )}
    </div>
  )
}
