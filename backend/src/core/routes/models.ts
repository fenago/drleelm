import { config } from '../../config/env'

type ModelInfo = {
  id: string
  name: string
  description?: string
}

// Fetch models from OpenAI
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    if (!res.ok) throw new Error('Failed to fetch OpenAI models')
    const data = await res.json()

    // Filter for chat models and sort by id
    const chatModels = data.data
      .filter((m: any) =>
        m.id.includes('gpt') &&
        !m.id.includes('instruct') &&
        !m.id.includes('vision')
      )
      .sort((a: any, b: any) => b.created - a.created)
      .slice(0, 20)

    return chatModels.map((m: any) => ({
      id: m.id,
      name: m.id
    }))
  } catch (err) {
    console.error('Error fetching OpenAI models:', err)
    // Return fallback list
    return [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
      { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
      { id: 'gpt-4', name: 'gpt-4' },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }
    ]
  }
}

// Fetch models from OpenAI for embeddings
async function fetchOpenAIEmbeddingModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    if (!res.ok) throw new Error('Failed to fetch OpenAI models')
    const data = await res.json()

    const embedModels = data.data
      .filter((m: any) => m.id.includes('embedding'))
      .sort((a: any, b: any) => b.created - a.created)

    return embedModels.map((m: any) => ({
      id: m.id,
      name: m.id
    }))
  } catch (err) {
    console.error('Error fetching OpenAI embedding models:', err)
    return [
      { id: 'text-embedding-3-large', name: 'text-embedding-3-large' },
      { id: 'text-embedding-3-small', name: 'text-embedding-3-small' },
      { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002' }
    ]
  }
}

// Fetch models from Gemini
async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
    if (!res.ok) throw new Error('Failed to fetch Gemini models')
    const data = await res.json()

    // Filter for generative models
    const genModels = data.models
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        !m.name.includes('embedding') &&
        !m.name.includes('aqa')
      )
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
        description: m.description
      }))

    return genModels
  } catch (err) {
    console.error('Error fetching Gemini models:', err)
    return [
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ]
  }
}

// Fetch Gemini embedding models
async function fetchGeminiEmbeddingModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
    if (!res.ok) throw new Error('Failed to fetch Gemini models')
    const data = await res.json()

    const embedModels = data.models
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes('embedContent') ||
        m.name.includes('embedding')
      )
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', '')
      }))

    return embedModels
  } catch (err) {
    console.error('Error fetching Gemini embedding models:', err)
    return [
      { id: 'text-embedding-004', name: 'text-embedding-004' },
      { id: 'embedding-001', name: 'embedding-001' }
    ]
  }
}

// Fetch models from OpenRouter
async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    })
    if (!res.ok) throw new Error('Failed to fetch OpenRouter models')
    const data = await res.json()

    // Sort by context length and pricing, return top models
    const models = data.data
      .filter((m: any) => m.id && !m.id.includes(':free'))
      .sort((a: any, b: any) => {
        // Prefer newer models
        const aScore = (a.context_length || 0) + (a.top_provider ? 1000 : 0)
        const bScore = (b.context_length || 0) + (b.top_provider ? 1000 : 0)
        return bScore - aScore
      })
      .slice(0, 100)
      .map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        description: `${m.context_length ? `${Math.floor(m.context_length/1000)}k ctx` : ''}`
      }))

    return models
  } catch (err) {
    console.error('Error fetching OpenRouter models:', err)
    return [
      { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
      { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick' }
    ]
  }
}

// Fetch models from Ollama (local)
async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`)
    if (!res.ok) throw new Error('Failed to fetch Ollama models')
    const data = await res.json()

    return data.models.map((m: any) => ({
      id: m.name,
      name: m.name,
      description: m.details?.parameter_size || ''
    }))
  } catch (err) {
    console.error('Error fetching Ollama models:', err)
    return [
      { id: 'llama4', name: 'llama4' },
      { id: 'llama3.2', name: 'llama3.2' },
      { id: 'mistral', name: 'mistral' },
      { id: 'codellama', name: 'codellama' }
    ]
  }
}

// Fetch models from Grok (xAI) - uses OpenAI-compatible API
async function fetchGrokModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    if (!res.ok) throw new Error('Failed to fetch Grok models')
    const data = await res.json()

    return data.data.map((m: any) => ({
      id: m.id,
      name: m.id
    }))
  } catch (err) {
    console.error('Error fetching Grok models:', err)
    return [
      { id: 'grok-2-latest', name: 'grok-2-latest' },
      { id: 'grok-2', name: 'grok-2' },
      { id: 'grok-beta', name: 'grok-beta' }
    ]
  }
}

// Fetch models from Claude (Anthropic)
async function fetchClaudeModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    })
    if (!res.ok) throw new Error('Failed to fetch Claude models')
    const data = await res.json()

    // Sort by created_at (newest first) and add performance tags
    const claudeTags: Record<string, string> = {
      'haiku': 'Fastest - Budget',
      'sonnet': 'Balanced - Recommended',
      'opus': 'Most capable - Slow'
    }

    return data.data
      .filter((m: any) => m.type === 'model')
      .map((m: any) => {
        let tag = ''
        if (m.id.includes('haiku')) tag = claudeTags['haiku']
        else if (m.id.includes('sonnet')) tag = claudeTags['sonnet']
        else if (m.id.includes('opus')) tag = claudeTags['opus']

        return {
          id: m.id,
          name: m.display_name || m.id,
          description: tag
        }
      })
  } catch (err) {
    console.error('Error fetching Claude models:', err)
    // Fallback list
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced - Best value' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable - Slow' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced - Recommended' },
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Most capable - Slow' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: 'Fast - Budget' }
    ]
  }
}

// Add speed/performance tags to Gemini models
function addGeminiTags(models: ModelInfo[]): ModelInfo[] {
  const tags: Record<string, string> = {
    'gemini-2.5-flash-lite': 'Fastest - Free tier',
    'gemini-2.5-flash': 'Fast - Balanced',
    'gemini-2.5-pro': 'Most capable - Slower',
    'gemini-2.0-flash': 'Fast - Good balance',
    'gemini-1.5-pro': 'Capable - Legacy',
    'gemini-1.5-flash': 'Fast - Legacy',
  }
  return models.map(m => ({
    ...m,
    description: tags[m.id] || m.description
  }))
}

// Add speed/performance tags to OpenAI models
function addOpenAITags(models: ModelInfo[]): ModelInfo[] {
  const tags: Record<string, string> = {
    'gpt-4o': 'Most capable - Recommended',
    'gpt-4o-mini': 'Fast - Budget friendly',
    'gpt-4-turbo': 'Capable - Higher cost',
    'gpt-4': 'Legacy - Use 4o instead',
    'gpt-3.5-turbo': 'Fastest - Basic tasks',
    'text-embedding-3-large': 'Best quality - Recommended',
    'text-embedding-3-small': 'Fast - Lower cost',
    'text-embedding-ada-002': 'Legacy - Use v3 instead',
  }
  return models.map(m => ({
    ...m,
    description: tags[m.id] || m.description || m.id
  }))
}

export function modelsRoutes(app: any) {
  // Get available models for a provider
  app.get('/api/models/:provider', async (req: any, res: any) => {
    const { provider } = req.params
    const { type } = req.query // 'chat' or 'embedding'

    try {
      let models: ModelInfo[] = []

      switch (provider) {
        case 'openai':
          if (type === 'embedding') {
            models = addOpenAITags(await fetchOpenAIEmbeddingModels(config.openai || config.openai_embed))
          } else {
            models = addOpenAITags(await fetchOpenAIModels(config.openai))
          }
          break

        case 'gemini':
          if (type === 'embedding') {
            models = await fetchGeminiEmbeddingModels(config.gemini)
          } else {
            models = addGeminiTags(await fetchGeminiModels(config.gemini))
          }
          break

        case 'openrouter':
          models = await fetchOpenRouterModels(config.openrouter)
          break

        case 'ollama':
          models = await fetchOllamaModels(config.ollama.baseUrl)
          break

        case 'grok':
          models = await fetchGrokModels(config.grok, config.grok_base)
          break

        case 'claude':
          models = await fetchClaudeModels(config.claude)
          break

        default:
          return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` })
      }

      res.json({ success: true, models })
    } catch (err: any) {
      console.error(`Error fetching models for ${provider}:`, err)
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Get all models for all configured providers
  app.get('/api/models', async (_req: any, res: any) => {
    try {
      const result: Record<string, ModelInfo[]> = {}

      // Fetch in parallel for providers that have API keys configured
      const fetches: Promise<void>[] = []

      if (config.openai) {
        fetches.push(
          fetchOpenAIModels(config.openai).then(m => { result.openai = m }),
          fetchOpenAIEmbeddingModels(config.openai).then(m => { result.openai_embed = m })
        )
      }

      if (config.gemini) {
        fetches.push(
          fetchGeminiModels(config.gemini).then(m => { result.gemini = m }),
          fetchGeminiEmbeddingModels(config.gemini).then(m => { result.gemini_embed = m })
        )
      }

      if (config.openrouter) {
        fetches.push(
          fetchOpenRouterModels(config.openrouter).then(m => { result.openrouter = m })
        )
      }

      if (config.ollama.baseUrl) {
        fetches.push(
          fetchOllamaModels(config.ollama.baseUrl).then(m => { result.ollama = m })
        )
      }

      if (config.grok) {
        fetches.push(
          fetchGrokModels(config.grok, config.grok_base).then(m => { result.grok = m })
        )
      }

      // Claude - fetch if API key available
      if (config.claude) {
        fetches.push(
          fetchClaudeModels(config.claude).then(m => { result.claude = m })
        )
      }

      await Promise.allSettled(fetches)

      res.json({ success: true, models: result })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
}
