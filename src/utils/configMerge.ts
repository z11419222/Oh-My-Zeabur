import { DEFAULT_DEPLOYMENT_CONFIG, type DeploymentConfig } from '../types/deployment'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Recursively backfills missing/invalid keys in `partial` from `defaults`.
 * `defaults` acts as the authoritative schema: every key present in defaults is
 * guaranteed in the result. A leaf from `partial` is only taken when its runtime
 * type matches the default, so stale/corrupt persisted state can never produce
 * `undefined` nested objects (the root cause of the blank-screen crash).
 */
function deepMerge<T>(defaults: T, partial: unknown): T {
  if (isPlainObject(defaults)) {
    if (!isPlainObject(partial)) {
      return defaults
    }
    const result: Record<string, unknown> = { ...defaults }
    for (const key of Object.keys(defaults)) {
      result[key] = deepMerge(defaults[key], partial[key])
    }
    return result as T
  }

  if (Array.isArray(defaults)) {
    return (Array.isArray(partial) ? partial : defaults) as T
  }

  if (partial !== undefined && partial !== null && typeof partial === typeof defaults) {
    return partial as T
  }

  return defaults
}

export function deepMergeConfig(
  defaults: DeploymentConfig,
  partial: unknown,
): DeploymentConfig {
  const base = isPlainObject(defaults) ? defaults : DEFAULT_DEPLOYMENT_CONFIG
  return deepMerge(base, partial)
}
