import { invoke } from '@tauri-apps/api/core'

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
  return invoke<AppEnvironmentInfo>('get_app_environment_info')
}

export async function validateZeaburToken(apiKey: string) {
  return invoke<ZeaburValidationResult>('validate_zeabur_token', { apiKey })
}

export async function validateStoredZeaburKey(keyId: string) {
  return invoke<ZeaburValidationResult>('validate_stored_zeabur_key', { keyId })
}

export async function deployTemplateWithApiKey(apiKey: string, rawYaml: string) {
  return invoke<ZeaburDeployResult>('deploy_template_with_api_key', { apiKey, rawYaml })
}

export async function deployTemplateWithStoredKey(keyId: string, rawYaml: string) {
  return invoke<ZeaburDeployResult>('deploy_template_with_stored_key', { keyId, rawYaml })
}

export async function deployTemplateBatch(entries: Array<{ keyId: string; keyName: string; apiKey: string }>, rawYaml: string) {
  return invoke<BatchDeployResult[]>('deploy_template_batch_with_api_keys', { entries, rawYaml })
}

export async function deployTemplateBatchWithStoredKeys(entries: Array<{ keyId: string; keyName: string }>, rawYaml: string) {
  return invoke<BatchDeployResult[]>('deploy_template_batch_with_stored_keys', { entries, rawYaml })
}

export async function saveZeaburKeysToDisk(payload: ZeaburPersistedState) {
  return invoke<void>('save_zeabur_keys_to_disk', { payload })
}

export async function loadZeaburKeysFromDisk() {
  return invoke<ZeaburPersistedState>('load_zeabur_keys_from_disk')
}

export async function saveZeaburKeyToSecureStore(payload: ZeaburKeyPayload) {
  return invoke<void>('save_zeabur_key_to_secure_store', { payload })
}

export async function deleteZeaburKeyFromSecureStore(keyId: string) {
  return invoke<void>('delete_zeabur_key_from_secure_store', { keyId })
}
