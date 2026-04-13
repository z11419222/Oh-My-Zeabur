import { messages, type MessageKey } from '../i18n/messages'
import { useAppStore } from '../store/appStore'

export function useI18n() {
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const t = (key: MessageKey) => messages[language][key] ?? key

  return {
    language,
    setLanguage,
    t,
  }
}
