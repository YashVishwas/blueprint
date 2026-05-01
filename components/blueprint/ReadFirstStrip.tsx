'use client'

interface ReadFirstStripProps {
  files: string[]
  repoUrl: string
}

export function ReadFirstStrip({ files, repoUrl }: ReadFirstStripProps) {
  if (files.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        Read First
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {files.map((file, i) => (
          <span key={file} className="flex items-center gap-1.5">
            <a
              href={`${repoUrl}/blob/HEAD/${file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-md px-2 py-1 transition-colors"
            >
              <span className="text-gray-300 text-xs">{i + 1}</span>
              {file}
            </a>
            {i < files.length - 1 && (
              <span className="text-gray-300 text-xs">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
