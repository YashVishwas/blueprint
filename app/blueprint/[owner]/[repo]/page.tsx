import { BlueprintView } from '@/components/blueprint/BlueprintView'

interface Props {
  params: Promise<{ owner: string; repo: string }>
  searchParams: Promise<{ mode?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { owner, repo } = await params
  return {
    title: `${owner}/${repo} — Blueprint`,
    description: `Visual architecture map of ${owner}/${repo}`,
  }
}

export default async function BlueprintPage({ params, searchParams }: Props) {
  const { owner, repo } = await params
  const { mode = 'offline' } = await searchParams

  return (
    <BlueprintView
      owner={owner}
      repo={repo}
      mode={mode === 'ai' ? 'ai' : 'offline'}
    />
  )
}
