import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parse } from 'yaml'
import { generateZeaburYaml } from './template'
import { deepMergeConfig } from './configMerge'
import { DEFAULT_DEPLOYMENT_CONFIG } from '../types/deployment'

describe('generateZeaburYaml', () => {
  it('produces parseable YAML for the default config', () => {
    const yaml = generateZeaburYaml(DEFAULT_DEPLOYMENT_CONFIG)
    const parsed = parse(yaml) as { apiVersion?: string; kind?: string }
    expect(parsed.apiVersion).toBe('zeabur.com/v1')
    expect(parsed.kind).toBe('Template')
  })

  it('never throws and stays valid YAML for any backfilled partial config', () => {
    fc.assert(
      fc.property(fc.anything(), (partial) => {
        const config = deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, partial)
        const yaml = generateZeaburYaml(config)
        expect(() => parse(yaml)).not.toThrow()
      }),
    )
  })

  it('omits shared infra services for cluster-slave mode', () => {
    const config = deepMergeConfig(DEFAULT_DEPLOYMENT_CONFIG, { deployMode: 'cluster-slave' })
    const parsed = parse(generateZeaburYaml(config)) as {
      spec: { services: Array<{ name: string }> }
    }
    const serviceNames = parsed.spec.services.map((service) => service.name)
    expect(serviceNames).not.toContain('PostgreSQL')
    expect(serviceNames).not.toContain('Redis')
    expect(serviceNames).toContain('New API')
  })
})
