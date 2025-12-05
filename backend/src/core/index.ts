import cors from 'cors';
import fs from 'fs';
import path from 'path';
import server from '../utils/server/server'
import { registerRoutes } from './router'
import { loggerMiddleware } from './middleware'
// Import config to ensure env vars are loaded (handles both dev and production)
import { config } from '../config/env'

// Read version from package.json
const pkgPath = path.resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const BACKEND_VERSION = pkg.version || '1.0.0'

// Global error handlers to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error)
})

const app = server()

app.use(loggerMiddleware)
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());
app.use(app.serverStatic("/storage", "./storage"))

registerRoutes(app)

// Health check endpoint for Docker/DO App Platform
app.get("/health", (_: any, res: any) => {
  res.send({ status: "ok", timestamp: new Date().toISOString() })
})

// Version endpoint
app.get("/api/version", (_: any, res: any) => {
  res.send({
    version: BACKEND_VERSION,
    name: 'DrLeeLM',
    provider: config.provider,
    model: config.provider === 'gemini' ? config.gemini_model :
           config.provider === 'openai' ? config.openai_model :
           config.provider === 'claude' ? config.claude_model :
           config.provider === 'grok' ? config.grok_model :
           config.provider === 'openrouter' ? config.openrouter_model :
           config.ollama.model
  })
})

app.listen(config.port, () => {
  console.log(`\n========================================`)
  console.log(`[DrLeeLM] Backend v${BACKEND_VERSION}`)
  console.log(`========================================`)
  console.log(`URL: ${config.baseUrl}`)
  console.log(`LLM Provider: ${config.provider}`)
  console.log(`LLM Model: ${
    config.provider === 'gemini' ? config.gemini_model :
    config.provider === 'openai' ? config.openai_model :
    config.provider === 'claude' ? config.claude_model :
    config.provider === 'grok' ? config.grok_model :
    config.provider === 'openrouter' ? config.openrouter_model :
    config.ollama.model
  }`)
  console.log(`Embeddings: ${config.embeddings_provider}`)
  console.log(`API Key Set: ${
    config.provider === 'gemini' ? (config.gemini ? 'YES' : 'NO') :
    config.provider === 'openai' ? (config.openai ? 'YES' : 'NO') :
    config.provider === 'claude' ? (config.claude ? 'YES' : 'NO') :
    config.provider === 'grok' ? (config.grok ? 'YES' : 'NO') :
    config.provider === 'openrouter' ? (config.openrouter ? 'YES' : 'NO') :
    'N/A (Ollama)'
  }`)
  console.log(`========================================\n`)
})