import fs from 'fs'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), 'storage', 'settings.json')

// Settings schema with descriptions and defaults
export const settingsSchema = {
  // LLM Provider Settings
  LLM_PROVIDER: {
    label: 'LLM Provider',
    description: 'Primary AI provider for chat and generation. Options: gemini, openai, claude, grok, openrouter, ollama',
    type: 'select',
    options: ['gemini', 'openai', 'claude', 'grok', 'openrouter', 'ollama'],
    default: 'gemini',
    category: 'LLM',
    sensitive: false
  },
  EMB_PROVIDER: {
    label: 'Embeddings Provider',
    description: 'Provider for text embeddings (used for document search). Options: openai, gemini, ollama',
    type: 'select',
    options: ['openai', 'gemini', 'ollama'],
    default: 'openai',
    category: 'LLM',
    sensitive: false
  },

  // Gemini
  gemini: {
    label: 'Gemini API Key',
    description: 'Google AI API key from https://aistudio.google.com/app/apikey',
    type: 'password',
    default: '',
    category: 'Gemini',
    sensitive: true,
    envAlias: 'GOOGLE_API_KEY'
  },
  gemini_model: {
    label: 'Gemini Model',
    description: 'Model to use. gemini-2.5-flash-lite is fastest, gemini-2.5-pro is most capable',
    type: 'select',
    options: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    default: 'gemini-2.5-flash-lite',
    category: 'Gemini',
    sensitive: false
  },
  gemini_embed_model: {
    label: 'Gemini Embedding Model',
    description: 'Model for text embeddings when using Gemini as embeddings provider',
    type: 'text',
    default: 'text-embedding-004',
    category: 'Gemini',
    sensitive: false
  },

  // OpenAI
  OPENAI_API_KEY: {
    label: 'OpenAI API Key',
    description: 'API key from https://platform.openai.com/api-keys',
    type: 'password',
    default: '',
    category: 'OpenAI',
    sensitive: true
  },
  OPENAI_EMBED_API_KEY: {
    label: 'OpenAI Embeddings API Key',
    description: 'Separate API key for embeddings (optional, uses main key if empty)',
    type: 'password',
    default: '',
    category: 'OpenAI',
    sensitive: true
  },
  OPENAI_MODEL: {
    label: 'OpenAI Model',
    description: 'gpt-4o is most capable, gpt-4o-mini is faster and cheaper',
    type: 'select',
    options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    default: 'gpt-4o-mini',
    category: 'OpenAI',
    sensitive: false
  },
  OPENAI_EMBED_MODEL: {
    label: 'OpenAI Embedding Model',
    description: 'Model for text embeddings. text-embedding-3-large is most capable',
    type: 'select',
    options: ['text-embedding-3-large', 'text-embedding-3-small', 'text-embedding-ada-002'],
    default: 'text-embedding-3-large',
    category: 'OpenAI',
    sensitive: false
  },

  // Claude (Anthropic)
  ANTHROPIC_API_KEY: {
    label: 'Anthropic API Key',
    description: 'API key from https://console.anthropic.com/settings/keys',
    type: 'password',
    default: '',
    category: 'Claude',
    sensitive: true
  },
  CLAUDE_MODEL: {
    label: 'Claude Model',
    description: 'claude-3-5-sonnet is balanced, opus is most capable',
    type: 'select',
    options: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-20240307'],
    default: 'claude-3-5-sonnet-latest',
    category: 'Claude',
    sensitive: false
  },

  // Grok (xAI)
  XAI_API_KEY: {
    label: 'xAI API Key',
    description: 'API key from https://console.x.ai/',
    type: 'password',
    default: '',
    category: 'Grok',
    sensitive: true
  },
  GROK_MODEL: {
    label: 'Grok Model',
    description: 'Grok model to use',
    type: 'text',
    default: 'grok-2-latest',
    category: 'Grok',
    sensitive: false
  },
  GROK_BASE: {
    label: 'Grok Base URL',
    description: 'API endpoint for Grok',
    type: 'text',
    default: 'https://api.x.ai/v1',
    category: 'Grok',
    sensitive: false
  },

  // OpenRouter
  OPENROUTER_API_KEY: {
    label: 'OpenRouter API Key',
    description: 'API key from https://openrouter.ai/keys - Access multiple models with one key',
    type: 'password',
    default: '',
    category: 'OpenRouter',
    sensitive: true
  },
  openrouter_model: {
    label: 'OpenRouter Model',
    description: 'Model ID like anthropic/claude-3-opus or openai/gpt-4o',
    type: 'text',
    default: '',
    category: 'OpenRouter',
    sensitive: false
  },

  // Ollama (Local)
  OLLAMA_MODEL: {
    label: 'Ollama Model',
    description: 'Local model name (e.g., llama4, mistral, codellama)',
    type: 'text',
    default: 'llama4',
    category: 'Ollama',
    sensitive: false
  },
  OLLAMA_EMBED_MODEL: {
    label: 'Ollama Embedding Model',
    description: 'Local embedding model (e.g., nomic-embed-text)',
    type: 'text',
    default: '',
    category: 'Ollama',
    sensitive: false
  },
  OLLAMA_BASE_URL: {
    label: 'Ollama Base URL',
    description: 'URL where Ollama is running',
    type: 'text',
    default: 'http://localhost:11434',
    category: 'Ollama',
    sensitive: false
  },

  // LLM Parameters
  LLM_TEMP: {
    label: 'Temperature',
    description: 'Controls randomness. 0 = deterministic, 1 = creative, 2 = very random',
    type: 'number',
    default: 1,
    min: 0,
    max: 2,
    step: 0.1,
    category: 'Parameters',
    sensitive: false
  },
  LLM_MAXTOK: {
    label: 'Max Tokens',
    description: 'Maximum response length in tokens. Higher = longer responses but slower',
    type: 'number',
    default: 16384,
    min: 256,
    max: 128000,
    category: 'Parameters',
    sensitive: false
  },

  // TTS Settings
  TTS_PROVIDER: {
    label: 'TTS Provider',
    description: 'Text-to-speech provider: edge (free), elevenlabs (paid, high quality), google',
    type: 'select',
    options: ['edge', 'elevenlabs', 'google'],
    default: 'edge',
    category: 'TTS',
    sensitive: false
  },
  TTS_VOICE_EDGE: {
    label: 'Edge TTS Voice',
    description: 'Primary voice for Edge TTS (e.g., en-US-AvaNeural)',
    type: 'text',
    default: 'en-US-AvaNeural',
    category: 'TTS',
    sensitive: false
  },
  TTS_VOICE_ALT_EDGE: {
    label: 'Edge TTS Alt Voice',
    description: 'Secondary voice for Edge TTS (e.g., en-US-AndrewNeural)',
    type: 'text',
    default: 'en-US-AndrewNeural',
    category: 'TTS',
    sensitive: false
  },
  ELEVEN_API_KEY: {
    label: 'ElevenLabs API Key',
    description: 'API key from https://elevenlabs.io/',
    type: 'password',
    default: '',
    category: 'TTS',
    sensitive: true
  },
  ELEVEN_VOICE_A: {
    label: 'ElevenLabs Voice A',
    description: 'Primary ElevenLabs voice ID',
    type: 'text',
    default: '',
    category: 'TTS',
    sensitive: false
  },
  ELEVEN_VOICE_B: {
    label: 'ElevenLabs Voice B',
    description: 'Secondary ElevenLabs voice ID',
    type: 'text',
    default: '',
    category: 'TTS',
    sensitive: false
  },
  GOOGLE_APPLICATION_CREDENTIALS: {
    label: 'Google Cloud Credentials',
    description: 'Path to Google Cloud service account JSON file',
    type: 'text',
    default: '',
    category: 'TTS',
    sensitive: false
  },
  TTS_VOICE_GOOGLE: {
    label: 'Google TTS Voice',
    description: 'Primary Google Cloud TTS voice',
    type: 'text',
    default: 'en-US-Neural2-F',
    category: 'TTS',
    sensitive: false
  },
  TTS_VOICE_ALT_GOOGLE: {
    label: 'Google TTS Alt Voice',
    description: 'Secondary Google Cloud TTS voice',
    type: 'text',
    default: 'en-US-Neural2-D',
    category: 'TTS',
    sensitive: false
  },

  // Transcription
  TRANSCRIPTION_PROVIDER: {
    label: 'Transcription Provider',
    description: 'Speech-to-text provider: openai (Whisper), assemblyai, google',
    type: 'select',
    options: ['openai', 'assemblyai', 'google'],
    default: 'openai',
    category: 'Transcription',
    sensitive: false
  },
  ASSEMBLYAI_API_KEY: {
    label: 'AssemblyAI API Key',
    description: 'API key from https://www.assemblyai.com/',
    type: 'password',
    default: '',
    category: 'Transcription',
    sensitive: true
  },
  GOOGLE_CLOUD_PROJECT_ID: {
    label: 'Google Cloud Project ID',
    description: 'Project ID for Google Cloud services',
    type: 'text',
    default: '',
    category: 'Transcription',
    sensitive: false
  },

  // Database
  db_mode: {
    label: 'Database Mode',
    description: 'Storage backend: json (file-based) or postgres',
    type: 'select',
    options: ['json', 'postgres'],
    default: 'json',
    category: 'System',
    sensitive: false
  },

  // System
  VITE_TIMEOUT: {
    label: 'Request Timeout',
    description: 'HTTP request timeout in milliseconds',
    type: 'number',
    default: 90000,
    min: 10000,
    max: 600000,
    category: 'System',
    sensitive: false
  },
  FFMPEG_PATH: {
    label: 'FFmpeg Path',
    description: 'Path to FFmpeg binary (for audio processing)',
    type: 'text',
    default: 'ffmpeg',
    category: 'System',
    sensitive: false
  }
}

type SettingsData = Record<string, string | number>

function ensureStorageDir() {
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadSettings(): SettingsData {
  ensureStorageDir()
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    } catch {
      return {}
    }
  }
  return {}
}

function saveSettings(data: SettingsData) {
  ensureStorageDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2))
}

// Apply settings to process.env so they take effect
function applySettings(settings: SettingsData) {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== '') {
      process.env[key] = String(value)
    }
  }
}

// Load and apply settings on module init
const initialSettings = loadSettings()
applySettings(initialSettings)

export function settingsRoutes(app: any) {
  // Get settings schema and current values
  app.get('/api/settings', async (req: any, res: any) => {
    try {
      const saved = loadSettings()

      // Build response with schema and current values
      const settings: Record<string, any> = {}

      for (const [key, schema] of Object.entries(settingsSchema)) {
        const envValue = process.env[key]
        const savedValue = saved[key]

        // Priority: saved value > env value > default
        let value = savedValue ?? envValue ?? schema.default

        // Mask sensitive values
        const displayValue = schema.sensitive && value ? '••••••••' : value

        settings[key] = {
          ...schema,
          value: displayValue,
          hasValue: !!value && value !== '',
          isFromEnv: !savedValue && !!envValue
        }
      }

      // Group by category
      const categories: Record<string, any[]> = {}
      for (const [key, setting] of Object.entries(settings)) {
        const cat = (setting as any).category
        if (!categories[cat]) categories[cat] = []
        categories[cat].push({ key, ...setting })
      }

      res.json({ success: true, settings, categories })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Update settings
  app.post('/api/settings', async (req: any, res: any) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { settings: newSettings } = body

      if (!newSettings || typeof newSettings !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid settings data' })
      }

      const current = loadSettings()

      // Update only provided values
      for (const [key, value] of Object.entries(newSettings)) {
        const schema = settingsSchema[key as keyof typeof settingsSchema]
        if (!schema) continue

        // Skip masked values (user didn't change them)
        if (schema.sensitive && value === '••••••••') continue

        // Delete if empty, otherwise update
        if (value === '' || value === null) {
          delete current[key]
        } else {
          current[key] = value as string | number
        }
      }

      saveSettings(current)
      applySettings(current)

      res.json({ success: true, message: 'Settings saved. Some changes may require restart.' })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Delete a specific setting (revert to env/default)
  app.delete('/api/settings/:key', async (req: any, res: any) => {
    try {
      const { key } = req.params
      const current = loadSettings()

      if (current[key] !== undefined) {
        delete current[key]
        saveSettings(current)

        // Revert to env value or default
        const schema = settingsSchema[key as keyof typeof settingsSchema]
        if (schema) {
          const envValue = process.env[key]
          if (!envValue) {
            delete process.env[key]
          }
        }
      }

      res.json({ success: true, message: `Setting ${key} reverted to default` })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
}
