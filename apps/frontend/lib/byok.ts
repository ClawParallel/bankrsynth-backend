export const PROVIDERS = {
  anthropic: {
    label: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (recommended)' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
    ],
    baseUrl: 'https://api.anthropic.com',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-...',
    free: false,
  },
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o (recommended)' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    baseUrl: 'https://api.openai.com',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-...',
    free: false,
  },
  groq: {
    label: 'Groq (Free tier available)',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (free tier)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fastest)' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
    baseUrl: 'https://api.groq.com/openai',
    docsUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
    free: true,
  },
  google: {
    label: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    baseUrl: 'https://generativelanguage.googleapis.com',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'AIza...',
    free: true,
  },
  xai: {
    label: 'xAI / Grok',
    models: [
      { id: 'grok-2', label: 'Grok 2' },
      { id: 'grok-2-mini', label: 'Grok 2 Mini' },
    ],
    baseUrl: 'https://api.x.ai',
    docsUrl: 'https://console.x.ai/',
    keyHint: 'xai-...',
    free: false,
  },
  openrouter: {
    label: 'OpenRouter (all models)',
    models: [
      { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (free)' },
      { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { id: 'mistralai/mistral-large', label: 'Mistral Large' },
    ],
    baseUrl: 'https://openrouter.ai/api',
    docsUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-...',
    free: true,
  },
} as const

export type ProviderId = keyof typeof PROVIDERS

export interface BYOKConfig {
  provider: ProviderId
  model: string
  apiKey: string
}

const KEYS = {
  provider: 'bsynth_provider',
  model: 'bsynth_model',
  apiKey: 'bsynth_api_key',
}

export function saveBYOK(config: BYOKConfig) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.provider, config.provider)
  localStorage.setItem(KEYS.model, config.model)
  localStorage.setItem(KEYS.apiKey, config.apiKey)
}

export function loadBYOK(): BYOKConfig | null {
  if (typeof window === 'undefined') return null
  const provider = localStorage.getItem(KEYS.provider) as ProviderId
  const model = localStorage.getItem(KEYS.model)
  const apiKey = localStorage.getItem(KEYS.apiKey)
  if (!provider || !model || !apiKey) return null
  return { provider, model, apiKey }
}

export function clearBYOK() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
