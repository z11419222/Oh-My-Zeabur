import { invoke } from '@tauri-apps/api/core'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: unknown
    }
  }
}

const browserFallbackKeyState: ZeaburPersistedState = {
  keys: [],
  currentKeyId: '',
}

function hasTauriRuntime() {
  return (
    typeof window !== 'undefined'
    && typeof window.__TAURI_INTERNALS__ === 'object'
    && window.__TAURI_INTERNALS__ !== null
    && typeof window.__TAURI_INTERNALS__.invoke === 'function'
  )
}

function requireTauriRuntime() {
  if (!hasTauriRuntime()) {
    throw new Error('Tauri runtime is not available. Run npm run tauri:dev to use this desktop-only feature.')
  }
}

function invokeDesktop<T>(command: string, args?: Record<string, unknown>) {
  requireTauriRuntime()
  return invoke<T>(command, args)
}

export interface AppEnvironmentInfo {
  platform: string
  appName: string
  appVersion: string
}

export interface ZeaburValidationResult {
  ok: boolean
  message: string
}

export interface ZeaburDeployResult {
  ok: boolean
  message: string
  stdout: string
  stderr: string
}

export interface BatchDeployResult {
  keyId: string
  keyName: string
  ok: boolean
  message: string
  stdout: string
  stderr: string
}

export interface ZeaburKeyInfo {
  id: string
  name: string
  apiKeyConfiguredAt: string
  hasSecret?: boolean
  lastValidationMessage?: string
  lastDeployMessage?: string
  lastDeployStdout?: string
  lastDeployStderr?: string
}

export interface ZeaburPersistedState {
  keys: ZeaburKeyInfo[]
  currentKeyId: string
}

export interface ZeaburKeyPayload {
  id: string
  name: string
  apiKey: string
  apiKeyConfiguredAt: string
}

export async function getAppEnvironmentInfo() {
  if (!hasTauriRuntime()) {
    return {
      platform: 'browser',
      appName: 'MirrorZeabur',
      appVersion: 'dev',
    }
  }

  return invokeDesktop<AppEnvironmentInfo>('get_app_environment_info')
}

export async function validateZeaburToken(apiKey: string) {
  return invokeDesktop<ZeaburValidationResult>('validate_zeabur_token', { apiKey })
}

export async function validateStoredZeaburKey(keyId: string) {
  return invokeDesktop<ZeaburValidationResult>('validate_stored_zeabur_key', { keyId })
}

export async function deployTemplateWithApiKey(apiKey: string, rawYaml: string) {
  return invokeDesktop<ZeaburDeployResult>('deploy_template_with_api_key', { apiKey, rawYaml })
}

export async function deployTemplateWithStoredKey(keyId: string, rawYaml: string) {
  return invokeDesktop<ZeaburDeployResult>('deploy_template_with_stored_key', { keyId, rawYaml })
}

export async function deployTemplateBatch(entries: Array<{ keyId: string; keyName: string; apiKey: string }>, rawYaml: string) {
  return invokeDesktop<BatchDeployResult[]>('deploy_template_batch_with_api_keys', { entries, rawYaml })
}

export async function deployTemplateBatchWithStoredKeys(entries: Array<{ keyId: string; keyName: string }>, rawYaml: string) {
  return invokeDesktop<BatchDeployResult[]>('deploy_template_batch_with_stored_keys', { entries, rawYaml })
}

export async function saveZeaburKeysToDisk(payload: ZeaburPersistedState) {
  if (!hasTauriRuntime()) {
    return
  }

  return invokeDesktop<void>('save_zeabur_keys_to_disk', { payload })
}

export async function loadZeaburKeysFromDisk() {
  if (!hasTauriRuntime()) {
    return browserFallbackKeyState
  }

  return invokeDesktop<ZeaburPersistedState>('load_zeabur_keys_from_disk')
}

export async function saveZeaburKeyToSecureStore(payload: ZeaburKeyPayload) {
  return invokeDesktop<void>('save_zeabur_key_to_secure_store', { payload })
}

export async function deleteZeaburKeyFromSecureStore(keyId: string) {
  return invokeDesktop<void>('delete_zeabur_key_from_secure_store', { keyId })
}
