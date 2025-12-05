import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../config/env'

type SettingField = {
  key: string
  label: string
  description: string
  type: 'text' | 'password' | 'select' | 'number'
  options?: string[]
  default: string | number
  value: string | number
  hasValue: boolean
  isFromEnv: boolean
  sensitive: boolean
  category: string
  min?: number
  max?: number
  step?: number
  dynamicOptions?: boolean  // Flag to fetch options from API
  optionsProvider?: string  // Provider name for fetching options
  optionsType?: string      // 'chat' or 'embedding'
}

type CategorizedSettings = Record<string, SettingField[]>

type ModelOption = {
  id: string
  name: string
  description?: string
}

const categoryOrder = ['LLM', 'Gemini', 'OpenAI', 'Claude', 'Grok', 'OpenRouter', 'Ollama', 'Parameters', 'TTS', 'Transcription', 'System']
const categoryDescriptions: Record<string, string> = {
  'LLM': 'Choose your primary AI provider and embeddings provider',
  'Gemini': 'Google\'s Gemini models - Fast and capable with generous free tier',
  'OpenAI': 'OpenAI\'s GPT models - Industry standard with great embeddings',
  'Claude': 'Anthropic\'s Claude models - Excellent for reasoning and analysis',
  'Grok': 'xAI\'s Grok models - Access via X/Twitter',
  'OpenRouter': 'Single API key for multiple providers - Pay per token',
  'Ollama': 'Run models locally - Free but requires local setup',
  'Parameters': 'Fine-tune model behavior',
  'TTS': 'Text-to-speech settings for podcast generation',
  'Transcription': 'Speech-to-text settings for audio transcription',
  'System': 'System configuration options'
}

// Map setting keys to their provider and type for dynamic fetching
const dynamicModelFields: Record<string, { provider: string; type?: string }> = {
  'gemini_model': { provider: 'gemini', type: 'chat' },
  'gemini_embed_model': { provider: 'gemini', type: 'embedding' },
  'OPENAI_MODEL': { provider: 'openai', type: 'chat' },
  'OPENAI_EMBED_MODEL': { provider: 'openai', type: 'embedding' },
  'CLAUDE_MODEL': { provider: 'claude', type: 'chat' },
  'GROK_MODEL': { provider: 'grok', type: 'chat' },
  'openrouter_model': { provider: 'openrouter', type: 'chat' },
  'OLLAMA_MODEL': { provider: 'ollama', type: 'chat' },
  'OLLAMA_EMBED_MODEL': { provider: 'ollama', type: 'embedding' },
}

export default function Settings() {
  const [categories, setCategories] = useState<CategorizedSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [changes, setChanges] = useState<Record<string, string | number>>({})
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'LLM': true,
    'Gemini': true
  })
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  // Auto-fetch models for expanded categories on initial load
  useEffect(() => {
    if (Object.keys(categories).length === 0) return

    // Fetch models for all expanded categories
    Object.keys(expandedCategories).forEach(cat => {
      if (expandedCategories[cat]) {
        const fields = categories[cat] || []
        fields.forEach(field => {
          const config = dynamicModelFields[field.key]
          if (config) {
            fetchModelsForProvider(config.provider, config.type)
          }
        })
      }
    })
  }, [categories]) // Run when categories are loaded

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${env.backend}/api/settings`)
      const data = await res.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const fetchModelsForProvider = async (provider: string, type?: string) => {
    const cacheKey = `${provider}_${type || 'chat'}`
    if (dynamicModels[cacheKey] || loadingModels[cacheKey]) return

    setLoadingModels(prev => ({ ...prev, [cacheKey]: true }))
    try {
      const url = type
        ? `${env.backend}/api/models/${provider}?type=${type}`
        : `${env.backend}/api/models/${provider}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success && data.models) {
        setDynamicModels(prev => ({ ...prev, [cacheKey]: data.models }))
      }
    } catch (err) {
      console.error(`Failed to fetch models for ${provider}:`, err)
    } finally {
      setLoadingModels(prev => ({ ...prev, [cacheKey]: false }))
    }
  }

  const getOptionsForField = (field: SettingField, currentValue: string | number): string[] => {
    const config = dynamicModelFields[field.key]
    let options: string[] = []

    if (config) {
      const cacheKey = `${config.provider}_${config.type || 'chat'}`
      const models = dynamicModels[cacheKey]
      if (models && models.length > 0) {
        options = models.map(m => m.id)
      } else {
        // Use static options as fallback
        options = field.options || []
      }
    } else {
      options = field.options || []
    }

    // Always ensure current value is in the options list
    const currentStr = String(currentValue)
    if (currentStr && !options.includes(currentStr)) {
      options = [currentStr, ...options]
    }

    return options
  }

  const getModelDisplayName = (fieldKey: string, modelId: string): string => {
    const config = dynamicModelFields[fieldKey]
    if (config) {
      const cacheKey = `${config.provider}_${config.type || 'chat'}`
      const models = dynamicModels[cacheKey]
      const model = models?.find(m => m.id === modelId)
      if (model) {
        return model.description ? `${model.name} (${model.description})` : model.name
      }
    }
    return modelId
  }

  // Fetch models when a category is expanded
  const handleCategoryExpand = (cat: string) => {
    toggleCategory(cat)
    // Trigger model fetch for relevant fields in this category
    const fields = categories[cat] || []
    fields.forEach(field => {
      const config = dynamicModelFields[field.key]
      if (config) {
        fetchModelsForProvider(config.provider, config.type)
      }
    })
  }

  const handleChange = (key: string, value: string | number) => {
    setChanges(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`${env.backend}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changes })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved! Some changes may require a server restart.' })
        setChanges({})
        fetchSettings() // Refresh
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (key: string) => {
    try {
      const res = await fetch(`${env.backend}/api/settings/${key}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `${key} reset to default` })
        // Remove from changes if present
        setChanges(prev => {
          const { [key]: _, ...rest } = prev
          return rest
        })
        fetchSettings()
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to reset setting' })
    }
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const getValue = (field: SettingField) => {
    if (changes[field.key] !== undefined) return changes[field.key]
    return field.value
  }

  const hasChanges = Object.keys(changes).length > 0

  if (loading) {
    return (
      <div className="min-h-screen w-full px-4 lg:pl-28 lg:pr-4 flex items-center justify-center">
        <div className="text-stone-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="max-w-4xl mx-auto pt-6 px-4 pb-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to='/'
              className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900 transition-colors"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" className="size-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-7">
                <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
              </svg>
              Settings
            </h1>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
          <div className="flex gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-sky-400 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-sky-200">
              <p className="font-medium mb-1">API Keys & Configuration</p>
              <p className="text-sky-300/80">Settings are stored locally and override environment variables. Sensitive values (API keys) are masked but you can reveal them. Changes are applied immediately but some may require a server restart.</p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-4">
          {categoryOrder.filter(cat => categories[cat]?.length > 0).map(cat => (
            <div key={cat} className="rounded-2xl bg-stone-950 border border-stone-800 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => handleCategoryExpand(cat)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-900/50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white text-left">{cat}</h2>
                  <p className="text-sm text-stone-400 text-left">{categoryDescriptions[cat]}</p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`size-5 text-stone-400 transition-transform ${expandedCategories[cat] ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Category Content */}
              {expandedCategories[cat] && (
                <div className="px-6 pb-6 space-y-4 border-t border-stone-800 pt-4">
                  {categories[cat].map((field: SettingField) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-stone-200">
                          {field.label}
                          {field.isFromEnv && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              from .env
                            </span>
                          )}
                        </label>
                        {field.hasValue && !field.isFromEnv && (
                          <button
                            onClick={() => handleReset(field.key)}
                            className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mb-2">{field.description}</p>

                      {field.type === 'select' && (field.options || dynamicModelFields[field.key]) ? (
                        <div className="relative">
                          <select
                            value={String(getValue(field))}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            onFocus={() => {
                              const config = dynamicModelFields[field.key]
                              if (config) fetchModelsForProvider(config.provider, config.type)
                            }}
                            className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-sky-500 transition-colors"
                          >
                            {getOptionsForField(field, getValue(field)).map(opt => (
                              <option key={opt} value={opt}>{getModelDisplayName(field.key, opt)}</option>
                            ))}
                          </select>
                          {loadingModels[`${dynamicModelFields[field.key]?.provider}_${dynamicModelFields[field.key]?.type || 'chat'}`] && (
                            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-stone-500">Loading...</span>
                          )}
                        </div>
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={getValue(field)}
                          onChange={(e) => handleChange(field.key, Number(e.target.value))}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-sky-500 transition-colors"
                        />
                      ) : field.type === 'password' ? (
                        <div className="relative">
                          <input
                            type={showSensitive[field.key] ? 'text' : 'password'}
                            value={String(getValue(field))}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.hasValue ? '••••••••' : 'Not set'}
                            className="w-full px-4 py-2.5 pr-12 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-sky-500 transition-colors font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSensitive(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                          >
                            {showSensitive[field.key] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(getValue(field))}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={String(field.default) || 'Not set'}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-sky-500 transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Save Button */}
        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
