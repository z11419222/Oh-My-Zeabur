import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppLanguage } from '../i18n/messages'

interface AppState {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

function getInitialLanguage(): AppLanguage {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh-CN'
  }

  return 'en-US'
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: getInitialLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'mirrorzeabur-app-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
