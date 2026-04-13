import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_DEPLOYMENT_CONFIG,
  type DeploymentConfig,
  type DeploymentRecord,
  type ZeaburConfig,
  type ZeaburKeyInfo,
} from '../types/deployment'
import { generateZeaburYaml } from '../utils/template'
import { loadZeaburKeysFromDisk, saveZeaburKeysToDisk } from '../lib/tauri'

interface DeploymentState {
  currentConfig: DeploymentConfig
  generatedYaml: string
  records: DeploymentRecord[]
  zeabur: ZeaburConfig
  setConfig: (config: DeploymentConfig) => void
  updateConfig: (updater: (config: DeploymentConfig) => DeploymentConfig) => void
  resetConfig: () => void
  regenerateYaml: () => void
  saveCurrentRecord: (payload?: { accountIds?: string[]; accountNames?: string[] }) => void
  saveDraftRecord: () => void
  loadRecord: (id: string) => void
  addZeaburKey: (payload: { name: string; apiKey: string }) => void
  removeZeaburKey: (id: string) => void
  switchZeaburKey: (id: string) => void
  updateZeaburKey: (id: string, payload: Partial<ZeaburKeyInfo>) => void
  setZeaburValidationResult: (keyId: string, message: string) => void
  setZeaburDeployResult: (keyId: string, payload: { message: string; stdout: string; stderr: string }) => void
  initializeZeaburKeys: () => Promise<void>
}

type PersistedDeploymentState = Pick<DeploymentState, 'currentConfig' | 'generatedYaml' | 'records'>

const initialYaml = generateZeaburYaml(DEFAULT_DEPLOYMENT_CONFIG)

export const useDeploymentStore = create<DeploymentState>()(
  persist(
    (set, get) => ({
      currentConfig: DEFAULT_DEPLOYMENT_CONFIG,
      generatedYaml: initialYaml,
      records: [],
      zeabur: {
        keys: [],
        currentKeyId: '',
      },
      setConfig: (config) => set({ currentConfig: config, generatedYaml: generateZeaburYaml(config) }),
      updateConfig: (updater) => {
        const nextConfig = updater(get().currentConfig)
        set({ currentConfig: nextConfig, generatedYaml: generateZeaburYaml(nextConfig) })
      },
      resetConfig: () => set({ currentConfig: DEFAULT_DEPLOYMENT_CONFIG, generatedYaml: generateZeaburYaml(DEFAULT_DEPLOYMENT_CONFIG) }),
      regenerateYaml: () => set((state) => ({ generatedYaml: generateZeaburYaml(state.currentConfig) })),
      saveCurrentRecord: (payload) => {
        const { currentConfig, generatedYaml, records } = get()
        const timestamp = new Date().toISOString()
        const id = `dep_${Date.now()}`
        const currentKey = get().zeabur.keys.find((item) => item.id === get().zeabur.currentKeyId)
        const accountIds = payload?.accountIds ?? (currentKey ? [currentKey.id] : [])
        const accountNames = payload?.accountNames ?? (currentKey ? [currentKey.name] : [])
        const record: DeploymentRecord = {
          id,
          name: currentConfig.projectName,
          createdAt: timestamp,
          updatedAt: timestamp,
          deployMode: currentConfig.deployMode,
          repository: currentConfig.repository,
          config: currentConfig,
          generatedYaml,
          accountIds,
          accountNames,
        }
        set({ records: [record, ...records] })
      },
      saveDraftRecord: () => {
        const { currentConfig, generatedYaml, records } = get()
        const timestamp = new Date().toISOString()
        const id = `draft_${Date.now()}`
        const record: DeploymentRecord = {
          id,
          name: `${currentConfig.projectName}-draft`,
          createdAt: timestamp,
          updatedAt: timestamp,
          deployMode: currentConfig.deployMode,
          repository: currentConfig.repository,
          config: currentConfig,
          generatedYaml,
          accountIds: [],
          accountNames: [],
        }
        set({ records: [record, ...records] })
      },
      loadRecord: (id) => {
        const record = get().records.find((item) => item.id === id)
        if (!record) return
        set({ currentConfig: record.config, generatedYaml: record.generatedYaml })
      },
      addZeaburKey: ({ name, apiKey }) => {
        const current = get().zeabur
        const key: ZeaburKeyInfo = {
          id: `key_${Date.now()}`,
          name,
          apiKey,
          apiKeyConfiguredAt: new Date().toISOString(),
        }

        set({
          zeabur: {
            ...current,
            keys: [key, ...current.keys],
            currentKeyId: current.currentKeyId || key.id,
          },
        })
        void saveZeaburKeysToDisk([key, ...current.keys])
      },
      removeZeaburKey: (id) => {
        const current = get().zeabur
        const nextKeys = current.keys.filter((item) => item.id !== id)
        const nextCurrentKeyId = current.currentKeyId === id ? (nextKeys[0]?.id ?? '') : current.currentKeyId
        set({
          zeabur: {
            ...current,
            keys: nextKeys,
            currentKeyId: nextCurrentKeyId,
          },
        })
        void saveZeaburKeysToDisk(nextKeys)
      },
      switchZeaburKey: (id) => {
        set({
          zeabur: {
            ...get().zeabur,
            currentKeyId: id,
          },
        })
      },
      updateZeaburKey: (id, payload) => {
        const current = get().zeabur
        set({
          zeabur: {
            ...current,
            keys: current.keys.map((item) => (
              item.id === id
                ? {
                    ...item,
                    ...payload,
                  }
                : item
            )),
          },
        })
        void saveZeaburKeysToDisk(current.keys.map((item) => (
          item.id === id
            ? {
                ...item,
                ...payload,
              }
            : item
        )))
      },
      setZeaburValidationResult: (keyId, message) => {
        set({
          zeabur: {
            ...get().zeabur,
            keys: get().zeabur.keys.map((item) => (
              item.id === keyId
                ? { ...item, lastValidationMessage: message }
                : item
            )),
          },
        })
      },
      setZeaburDeployResult: (keyId, { message, stdout, stderr }) => {
        set({
          zeabur: {
            ...get().zeabur,
            keys: get().zeabur.keys.map((item) => (
              item.id === keyId
                ? {
                    ...item,
                    lastDeployMessage: message,
                    lastDeployStdout: stdout,
                    lastDeployStderr: stderr,
                  }
                : item
            )),
          },
        })
      },
      initializeZeaburKeys: async () => {
        try {
          const keys = await loadZeaburKeysFromDisk()
          set({
            zeabur: {
              ...get().zeabur,
              keys,
              currentKeyId: get().zeabur.currentKeyId || keys[0]?.id || '',
            },
          })
        } catch {
          // ignore load failure in MVP
        }
      },
    }),
    {
      name: 'mirrorzeabur-deployment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedDeploymentState => ({
        currentConfig: state.currentConfig,
        generatedYaml: state.generatedYaml,
        records: state.records,
      }),
    },
  ),
)
