'use client'

export interface ProgressEvent {
  id: string
  message: string
  status: 'pending' | 'done' | 'error'
}

interface ProgressLogProps {
  events: ProgressEvent[]
  isLoading: boolean
}

export function ProgressLog({ events, isLoading }: ProgressLogProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-700">Generating Blueprint...</span>
      </div>

      <div className="space-y-2.5">
        {events.map(event => (
          <div key={event.id} className="flex items-center gap-3">
            {event.status === 'done' && (
              <svg width="14" height="14" viewBox="0 0 14 14" className="text-green-500 flex-shrink-0">
                <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
                <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {event.status === 'pending' && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin flex-shrink-0" />
            )}
            {event.status === 'error' && (
              <svg width="14" height="14" viewBox="0 0 14 14" className="text-red-500 flex-shrink-0">
                <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
                <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            <span
              className={`text-sm ${
                event.status === 'done'
                  ? 'text-gray-600'
                  : event.status === 'error'
                    ? 'text-red-600'
                    : 'text-gray-500 animate-pulse-soft'
              }`}
            >
              {event.message}
            </span>
          </div>
        ))}

        {isLoading && events.length === 0 && (
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin flex-shrink-0" />
            <span className="text-sm text-gray-400 animate-pulse-soft">Connecting...</span>
          </div>
        )}
      </div>
    </div>
  )
}
