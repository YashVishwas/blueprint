import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Blueprint — Understand any repo in one glance',
  description:
    'Paste a GitHub repository URL and Blueprint generates a visual architecture map showing what the codebase is, how it flows, and where to start.',
  openGraph: {
    title: 'Blueprint',
    description: 'Paste a GitHub repo. See the system.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  )
}
