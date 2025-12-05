import fs from "fs"
import path from "path"
import { askWithContext, BASE_SYSTEM_PROMPT } from "../../lib/ai/ask"

const allowedRoots = [
  path.resolve(process.cwd(), "storage"),
  path.resolve(process.cwd(), "assets")
]

// Track active companion WebSocket connections
const companionSockets = new Map<string, Set<any>>()

const MAX_BYTES = 1.5 * 1024 * 1024 // 1.5MB guardrail for text reads

type CompanionHistory = { role: string; content: unknown }

function normalizePathInput(input: string): string {
  let trimmed = input.trim()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    trimmed = url.pathname || ""
  } catch {
    // not a URL, continue with raw string
  }
  return trimmed.replace(/\\/g, "/")
}

function resolveDocumentPath(input: string): string | null {
  if (!input) return null
  const normalized = normalizePathInput(input)
  if (!normalized) return null

  const cleaned = normalized.startsWith("/") ? normalized.slice(1) : normalized
  const candidates: string[] = []

  if (path.isAbsolute(normalized)) {
    candidates.push(path.normalize(normalized))
  } else {
    for (const root of allowedRoots) {
      candidates.push(path.resolve(root, cleaned))
    }
  }

  for (const candidate of candidates) {
    for (const root of allowedRoots) {
      const resolvedRoot = path.resolve(root)
      const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep
      if (candidate === resolvedRoot || candidate.startsWith(prefix)) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate
        }
      }
    }
  }
  return null
}

async function readDocumentText(filePath: string): Promise<string> {
  const stats = await fs.promises.stat(filePath)
  if (!stats.isFile()) throw new Error("document is not a file")
  if (stats.size > MAX_BYTES) throw new Error("document too large for companion (limit 1.5MB)")
  return fs.promises.readFile(filePath, "utf8")
}

function buildCompanionPrompt(label?: string): string {
  const focus = label ? ` for the document "${label}"` : " for this document"
  const extra = `
CONTEXT FOCUS
You are an AI companion${focus}. Use ONLY the supplied context to respond.
If the context is insufficient, say so clearly rather than guessing.
Favor concise, actionable study guidance grounded in the provided material.
`
  return `${BASE_SYSTEM_PROMPT}\n\n${extra.trim()}`
}

export function companionRoutes(app: any) {
  // WebSocket endpoint for streaming companion responses
  app.ws("/ws/companion", (ws: any, req: any) => {
    const url = new URL(req.url, "http://localhost")
    const sessionId = url.searchParams.get("sessionId")
    if (!sessionId) {
      return ws.close(1008, "sessionId required")
    }

    let set = companionSockets.get(sessionId)
    if (!set) {
      set = new Set()
      companionSockets.set(sessionId, set)
    }
    set.add(ws)

    ws.on("close", () => {
      set!.delete(ws)
      if (set!.size === 0) companionSockets.delete(sessionId)
    })

    ws.send(JSON.stringify({ type: "ready", sessionId }))
  })

  // Streaming companion endpoint that returns immediately and streams via WebSocket
  app.post("/api/companion/stream", async (req: any, res: any) => {
    const requestStart = Date.now()
    const elapsed = () => `${((Date.now() - requestStart) / 1000).toFixed(2)}s`

    console.log(`[companion] /api/companion/stream called at ${new Date().toISOString()}`)
    try {
      const body = req.body || {}
      const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
      if (!sessionId) return res.status(400).send({ error: "sessionId required" })

      const question = typeof body.question === "string" ? body.question.trim() : ""
      if (!question) return res.status(400).send({ error: "question required" })

      const history = Array.isArray(body.history) ? (body.history as CompanionHistory[]) : undefined
      const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle.trim() : ""

      let contextText = ""
      let filename: string | undefined

      if (typeof body.documentText === "string" && body.documentText.trim()) {
        contextText = body.documentText
        console.log(`[companion] [${elapsed()}] Using provided documentText (${contextText.length} chars)`)
      } else if (typeof body.filePath === "string" && body.filePath.trim()) {
        const resolved = resolveDocumentPath(body.filePath)
        if (!resolved) return res.status(404).send({ error: "document not found or not accessible" })
        filename = path.basename(resolved)
        try {
          contextText = await readDocumentText(resolved)
          console.log(`[companion] [${elapsed()}] Read file ${filename} (${contextText.length} chars)`)
        } catch (err: any) {
          const msg = err?.message || "unable to read document"
          return res.status(400).send({ error: msg })
        }
      } else {
        return res.status(400).send({ error: "documentText or filePath required" })
      }

      if (!contextText.trim()) {
        return res.status(400).send({ error: "document is empty" })
      }

      // Return immediately - streaming happens via WebSocket
      res.status(202).json({
        ok: true,
        message: "Request received, streaming response via WebSocket",
        sessionId,
        stream: `/ws/companion?sessionId=${sessionId}`
      })

      // Get WebSocket connections for this session
      const sockets = companionSockets.get(sessionId)
      if (!sockets || sockets.size === 0) {
        console.warn(`[companion] No active WebSocket connections for session ${sessionId}`)
        return
      }

      const emitToSession = (data: any) => {
        sockets.forEach((ws) => {
          try {
            ws.send(JSON.stringify(data))
          } catch (err) {
            console.error("[companion] Error sending to WebSocket:", err)
          }
        })
      }

      emitToSession({ type: "thinking" })

      try {
        console.log(`[companion] [${elapsed()}] Starting streaming LLM call`)
        const prompt = buildCompanionPrompt(filename || documentTitle)
        const llmStart = Date.now()

        const answer = await askWithContext({
          question,
          context: contextText,
          topic: typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined,
          history,
          systemPrompt: prompt,
          cacheScope: "companion"
        })

        const llmTime = ((Date.now() - llmStart) / 1000).toFixed(2)
        console.log(`[companion] [${elapsed()}] LLM call completed in ${llmTime}s`)

        // Send the complete answer
        emitToSession({ type: "answer", companion: answer })
        emitToSession({ type: "done" })
      } catch (err: any) {
        console.error(`[companion] [${elapsed()}] ERROR:`, err?.message || err)
        emitToSession({ type: "error", error: err?.message || "Failed to generate response" })
      }
    } catch (err: any) {
      console.error(`[companion] [${elapsed()}] ERROR:`, err?.message || err)
      res.status(500).send({ error: "failed to process companion request" })
    }
  })

  app.post("/api/companion/ask", async (req: any, res: any) => {
    const requestStart = Date.now()
    const elapsed = () => `${((Date.now() - requestStart) / 1000).toFixed(2)}s`

    console.log(`[companion] /api/companion/ask called at ${new Date().toISOString()}`)
    try {
      const body = req.body || {}
      console.log(`[companion] [${elapsed()}] Request body keys:`, Object.keys(body))
      const question = typeof body.question === "string" ? body.question.trim() : ""
      if (!question) return res.status(400).send({ error: "question required" })

      const history = Array.isArray(body.history) ? (body.history as CompanionHistory[]) : undefined
      const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle.trim() : ""

      let contextText = ""
      let filename: string | undefined

      if (typeof body.documentText === "string" && body.documentText.trim()) {
        contextText = body.documentText
        console.log(`[companion] [${elapsed()}] Using provided documentText (${contextText.length} chars)`)
      } else if (typeof body.filePath === "string" && body.filePath.trim()) {
        const resolved = resolveDocumentPath(body.filePath)
        if (!resolved) return res.status(404).send({ error: "document not found or not accessible" })
        filename = path.basename(resolved)
        try {
          contextText = await readDocumentText(resolved)
          console.log(`[companion] [${elapsed()}] Read file ${filename} (${contextText.length} chars)`)
        } catch (err: any) {
          const msg = err?.message || "unable to read document"
          return res.status(400).send({ error: msg })
        }
      } else {
        return res.status(400).send({ error: "documentText or filePath required" })
      }

      if (!contextText.trim()) {
        return res.status(400).send({ error: "document is empty" })
      }

      console.log(`[companion] [${elapsed()}] Starting LLM call - question: "${question.slice(0, 50)}..." context: ${contextText.length} chars`)
      const prompt = buildCompanionPrompt(filename || documentTitle)
      const llmStart = Date.now()

      const answer = await askWithContext({
        question,
        context: contextText,
        topic: typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined,
        history,
        systemPrompt: prompt,
        cacheScope: "companion"
      })

      const llmTime = ((Date.now() - llmStart) / 1000).toFixed(2)
      console.log(`[companion] [${elapsed()}] LLM call completed in ${llmTime}s`)
      console.log(`[companion] [${elapsed()}] Sending response`)

      res.send({ ok: true, companion: answer })
    } catch (err: any) {
      console.error(`[companion] [${elapsed()}] ERROR:`, err?.message || err, err?.stack || "")
      res.status(500).send({ error: "failed to run companion request" })
    }
  })
}
