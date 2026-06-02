import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parseGitHubRepository } from './github'

describe('parseGitHubRepository', () => {
  it('parses canonical https URLs', () => {
    const result = parseGitHubRepository('https://github.com/QuantumNous/new-api')
    expect(result).toEqual({
      repoUrl: 'https://github.com/QuantumNous/new-api',
      owner: 'QuantumNous',
      repo: 'new-api',
    })
  })

  it('normalizes git@ SSH URLs and strips the .git suffix', () => {
    const result = parseGitHubRepository('git@github.com:QuantumNous/new-api.git')
    expect(result.owner).toBe('QuantumNous')
    expect(result.repo).toBe('new-api')
    expect(result.repoUrl).toBe('https://github.com/QuantumNous/new-api')
  })

  it('accepts bare owner/repo shorthand', () => {
    const result = parseGitHubRepository('QuantumNous/new-api')
    expect(result.owner).toBe('QuantumNous')
    expect(result.repo).toBe('new-api')
  })

  it('trims surrounding whitespace', () => {
    const result = parseGitHubRepository('  https://github.com/owner/repo.git  ')
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
  })

  it('returns empty owner/repo for empty input without throwing', () => {
    const result = parseGitHubRepository('   ')
    expect(result.owner).toBe('')
    expect(result.repo).toBe('')
  })

  // Round-trip property: any slug-shaped owner/repo survives parsing intact.
  it('round-trips arbitrary slug-shaped owner/repo pairs', () => {
    const slug = fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/)
    fc.assert(
      fc.property(slug, slug, (owner, repo) => {
        const result = parseGitHubRepository(`${owner}/${repo}`)
        expect(result.owner).toBe(owner)
        expect(result.repo).toBe(repo)
      }),
    )
  })
})
