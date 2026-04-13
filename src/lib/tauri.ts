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
  apiKey: string
  apiKeyConfiguredAt: string
  lastValidationMessage?: string
  lastDeployMessage?: string
  lastDeployStdout?: string
  lastDeployStderr?: string
}

export async function getAppEnvironmentInfo() {
  return invoke<AppEnvironmentInfo>('get_app_environment_info')
}

export async function validateZeaburToken(apiKey: string) {
  return invoke<ZeaburValidationResult>('validate_zeabur_token', { apiKey })
}

export async function deployTemplateWithApiKey(apiKey: string, rawYaml: string) {
  return invoke<ZeaburDeployResult>('deploy_template_with_api_key', { apiKey, rawYaml })
}

export async function deployTemplateBatch(entries: Array<{ keyId: string; keyName: string; apiKey: string }>, rawYaml: string) {
  return invoke<BatchDeployResult[]>('deploy_template_batch_with_api_keys', { entries, rawYaml })
}

export async function saveZeaburKeysToDisk(keys: ZeaburKeyInfo[]) {
  return invoke<void>('save_zeabur_keys_to_disk', { keys })
}

export async function loadZeaburKeysFromDisk() {
  return invoke<ZeaburKeyInfo[]>('load_zeabur_keys_from_disk')
}
