import * as SecureStore from "expo-secure-store"

const GEMINI_KEY_STORAGE = "gemini_api_key"

export const SecureKeyService = {
  async getGeminiKey(): Promise<string | null> {
    try {
      return (await SecureStore.getItemAsync(GEMINI_KEY_STORAGE)) || null
    } catch {
      return null
    }
  },
  async setGeminiKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(GEMINI_KEY_STORAGE, key, { keychainService: "intelliprep_gemini_key" })
  },
  async clearGeminiKey(): Promise<void> {
    await SecureStore.deleteItemAsync(GEMINI_KEY_STORAGE)
  },
}


