export function parseGitHubRepository(input: string): {
  repoUrl: string
  owner: string
  repo: string
} {
  const trimmed = input.trim()
  const normalized = trimmed
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')

  let url: URL
  try {
    url = normalized.startsWith('http')
      ? new URL(normalized)
      : new URL(`https://github.com/${normalized.replace(/^\/+/, '')}`)
  } catch {
    return { repoUrl: trimmed, owner: '', repo: '' }
  }

  const parts = url.pathname.split('/').filter(Boolean)
  return {
    repoUrl: `https://github.com/${parts[0] ?? ''}/${parts[1] ?? ''}`.replace(/\/$/, ''),
    owner: parts[0] ?? '',
    repo: parts[1] ?? '',
  }
}

export async function fetchGitHubRepoId(owner: string, repo: string): Promise<string> {
  if (!owner || !repo) return ''
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub repository info: ${response.status}`)
  }
  const data = await response.json() as { id?: number }
  return data.id ? String(data.id) : ''
}
