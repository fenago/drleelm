import * as ollama from './ollama'
import * as gemini from './gemini'
import * as openai from './openai'
import * as grok from './grok'
import * as claude from './claude'
import * as openrouter from './openrouter'
import { config } from '../../../config/env'
import type { EmbeddingsLike, LLM } from './types'

type Pair = { llm: LLM; embeddings: EmbeddingsLike }

function pick(p: string) {
  switch (p) {
    case 'ollama': return ollama
    case 'gemini': return gemini
    case 'openai': return openai
    case 'grok': return grok
    case 'claude': return claude
    case 'openrouter': return openrouter
    default: return gemini
  }
}

export function makeModels(): Pair {
  console.log("[makeModels] LLM_PROVIDER:", config.provider)
  console.log("[makeModels] EMB_PROVIDER:", config.embeddings_provider)
  const mod = pick(config.provider)
  const llm = mod.makeLLM(config)

  // Use explicit EMB_PROVIDER if set, otherwise try LLM provider's embeddings
  let embeddings: EmbeddingsLike
  const embProvider = config.embeddings_provider
  if (embProvider && embProvider !== config.provider) {
    const embMod = pick(embProvider)
    embeddings = embMod.makeEmbeddings(config)
  } else {
    try {
      embeddings = mod.makeEmbeddings(config)
    } catch {
      const d = pick('openai')
      embeddings = d.makeEmbeddings(config)
    }
  }

  return { llm, embeddings }
}