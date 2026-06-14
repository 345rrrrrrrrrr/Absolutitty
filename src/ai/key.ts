// API key storage — tiny module kept separate so the heavy AI/compiler
// bundle can be lazy-loaded only when AI mode is actually used.

const STORAGE_KEY = 'geminiApiKey';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? import.meta.env.VITE_GEMINI_API_KEY ?? '';
}

export function storeApiKey(key: string): void {
  if (key) localStorage.setItem(STORAGE_KEY, key);
  else localStorage.removeItem(STORAGE_KEY);
}
