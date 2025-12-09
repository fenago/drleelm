import path from 'path'
import fs from 'fs'

// Load .env file and OVERRIDE existing shell environment variables
// This ensures .env takes precedence over any stale shell exports
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    // Skip empty lines, comments, and section headers
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    // Force override existing env vars with .env values
    process.env[key] = value
  }
  console.log('[env] Loaded .env file with override')
}

export const config = {
  db_mode: process.env.db_mode || 'json',
  chroma_url: process.env.CHROMA_URL || 'http://localhost:8000',
  url: process.env.VITE_BACKEND_URL || '',
  timeout: Number(process.env.VITE_TIMEOUT || 90000),
  provider: process.env.LLM_PROVIDER || 'gemini',
  embeddings_provider: process.env.EMB_PROVIDER || '',  // Empty = smart selection in makeModels()
  openrouter: process.env.OPENROUTER_API_KEY || '',
  openrouter_model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite',
  gemini: process.env.gemini || process.env.GOOGLE_API_KEY || '',
  gemini_model: process.env.gemini_model || 'gemini-2.5-flash-lite',
  gemini_embed_model: process.env.gemini_embed_model || 'text-embedding-004',
  openai: process.env.OPENAI_API_KEY || '',
  openai_embed: process.env.OPENAI_EMBED_API_KEY || '',
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openai_embed_model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-large',
  claude: process.env.ANTHROPIC_API_KEY || '',
  claude_model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',
  grok: process.env.XAI_API_KEY || '',
  grok_model: process.env.GROK_MODEL || 'grok-2-latest',
  grok_base: process.env.GROK_BASE || 'https://api.x.ai/v1',
  ollama: {
    model: process.env.OLLAMA_MODEL || 'llama4',
    embedModel: process.env.OLLAMA_EMBED_MODEL || '',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  },
  temp: Number(process.env.LLM_TEMP || 1),
  max_tokens: Number(process.env.LLM_MAXTOK || 16384),
  port: Number(process.env.PORT || 5000),
  baseUrl: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  tts_provider: process.env.TTS_PROVIDER || 'edge',
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  tts_voice_edge: process.env.TTS_VOICE_EDGE || 'en-US-AvaNeural',
  tts_voice_alt_edge: process.env.TTS_VOICE_ALT_EDGE || 'en-US-AndrewNeural',
  eleven_api_key: process.env.ELEVEN_API_KEY || '',
  eleven_voice_a: process.env.ELEVEN_VOICE_A || '',
  eleven_voice_b: process.env.ELEVEN_VOICE_B || '',
  google_creds: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  tts_voice_google: process.env.TTS_VOICE_GOOGLE || 'en-US-Neural2-F',
  tts_voice_alt_google: process.env.TTS_VOICE_ALT_GOOGLE || 'en-US-Neural2-D',
  transcription_provider: process.env.TRANSCRIPTION_PROVIDER || 'openai',
  assemblyai_api_key: process.env.ASSEMBLYAI_API_KEY || '',
  google_project_id: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
}