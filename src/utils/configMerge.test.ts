import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { deepMergeConfig } from './configMerge'
import { DEFAULT_DEPLOYMENT_CONFIG } from '../types/deployment'

const NESTED_SECTIONS = ['repository', 'services', 'cluster', 'secrets', 'runtime'] as const

describe('deepMergeConfig', () => {
  // P2: for ANY persisted shape, every nested section is fully backfilled from
  // defaults, so downstream property access can never hit `undefined`.
  it('always returns all nested sections fully defined for arbitrary partial input', () => {
    fc.assert(
      fc.property(fc.anything(), (partial) => {
        const merged = deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, partial)
        for (const section of NESTED_SECTIONS) {
          const defaults = DEFAULT_DEPLOYMENT_CONFIG[section] as Record<string, unknown>
          const value = merged[section] as Record<string, unknown>
          expect(value).toBeTypeOf('object')
          for (const leaf of Object.keys(defaults)) {
            expect(value[leaf]).not.toBeUndefined()
          }
        }
      }),
    )
  })

  it('keeps valid same-typed overrides from the partial', () => {
    const merged = deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, {
      projectName: 'override',
      cluster: { nodeType: 'slave' },
    })
    expect(merged.projectName).toBe('override')
    expect(merged.cluster.nodeType).toBe('slave')
    // Untouched leaves fall back to defaults.
    expect(merged.cluster.syncFrequency).toBe(DEFAULT_DEPLOYMENT_CONFIG.cluster.syncFrequency)
  })

  it('discards type-mismatched leaves in favour of defaults', () => {
    const merged = deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, {
      cluster: { syncFrequency: 'not-a-number' },
    })
    expect(merged.cluster.syncFrequency).toBe(DEFAULT_DEPLOYMENT_CONFIG.cluster.syncFrequency)
  })

  it('returns defaults untouched when partial is null/undefined', () => {
    expect(deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, null)).toEqual(DEFAULT_DEPLOYMENT_CONFIG)
    expect(deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, undefined)).toEqual(DEFAULT_DEPLOYMENT_CONFIG)
  })
})
