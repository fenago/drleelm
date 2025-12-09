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
  console.log("[makeModels] EMB_PROVIDER (from env):", process.env.EMB_PROVIDER || "(not set)")
  const mod = pick(config.provider)
  const llm = mod.makeLLM(config)

  // Smart embedding provider selection:
  // 1. If EMB_PROVIDER is explicitly set in env, use it
  // 2. If OpenAI key exists, use OpenAI embeddings (best quality)
  // 3. Fallback to Gemini (free, good quality)
  let embeddings: EmbeddingsLike
  let effectiveEmbProvider: string

  const explicitEmbProvider = process.env.EMB_PROVIDER
  const hasOpenAIKey = !!(config.openai || config.openai_embed)
  const hasGeminiKey = !!config.gemini

  if (explicitEmbProvider) {
    // User explicitly set EMB_PROVIDER
    effectiveEmbProvider = explicitEmbProvider
    console.log(`[makeModels] Using explicit EMB_PROVIDER: ${effectiveEmbProvider}`)
  } else if (hasOpenAIKey) {
    // OpenAI key available, use OpenAI embeddings
    effectiveEmbProvider = 'openai'
    console.log("[makeModels] OPENAI_API_KEY found, using OpenAI embeddings")
  } else if (hasGeminiKey) {
    // Fallback to Gemini (free tier available)
    effectiveEmbProvider = 'gemini'
    console.log("[makeModels] No OPENAI_API_KEY, using Gemini embeddings (free)")
  } else {
    // Last resort - try gemini anyway
    effectiveEmbProvider = 'gemini'
    console.log("[makeModels] WARNING: No embedding API key found, trying Gemini")
  }

  try {
    const embMod = pick(effectiveEmbProvider)
    embeddings = embMod.makeEmbeddings(config)
    console.log(`[makeModels] Embeddings initialized: ${effectiveEmbProvider}`)
  } catch (err: any) {
    console.error(`[makeModels] Failed to create embeddings with ${effectiveEmbProvider}: ${err?.message}`)
    // Ultimate fallback to Gemini
    console.log("[makeModels] Falling back to Gemini embeddings")
    embeddings = gemini.makeEmbeddings(config)
  }

  return { llm, embeddings }
}