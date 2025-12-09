import { ToolIO } from "../types"
import { getRetriever } from "../../utils/database/db"
import { embeddings } from "../../utils/llm/llm"

function toStr(x: unknown) { if (x == null) return ""; if (typeof x === "string") return x; try { return JSON.stringify(x) } catch { return String(x) } }

export const Ragsearch: ToolIO = {
  name: "rag.search",
  desc: "Retrieve top-k passages from namespace (json/chroma) for a query.",
  schema: { type: "object", properties: { q: { type: "string" }, ns: { type: "string" }, k: { type: "number" } }, required: [] },
  run: async (input: any, ctx: Record<string, any>) => {
    const q = toStr(input?.q ?? ctx?.q ?? "").trim()
    const ns = toStr(input?.ns ?? ctx?.ns ?? "drleelm").trim() || "drleelm"
    const kNum = Number(input?.k ?? 6); const k = Number.isFinite(kNum) && kNum > 0 ? Math.min(kNum, 20) : 6

    console.log(`[RAG] Search query="${q.slice(0, 50)}..." ns="${ns}" k=${k}`)

    if (!q) {
      console.log("[RAG] Empty query, returning empty result")
      return [{ text: "" }]
    }

    try {
      const retriever = await getRetriever(ns, embeddings)
      console.log(`[RAG] Got retriever for ns="${ns}"`)

      const docs = await retriever.invoke(q)
      console.log(`[RAG] Retrieved ${docs?.length || 0} documents`)

      const out = (docs || []).slice(0, k).map((d: any) => ({ text: toStr(d?.pageContent || ""), meta: d?.metadata || {} }))

      if (out.length > 0) {
        console.log(`[RAG] Returning ${out.length} docs, first doc length: ${out[0]?.text?.length || 0} chars`)
      } else {
        console.log("[RAG] No documents found for query")
      }

      return out.length ? out : [{ text: "" }]
    } catch (err: any) {
      console.error(`[RAG] ERROR: ${err?.message || err}`)
      console.error(`[RAG] Stack: ${err?.stack || "no stack"}`)
      return [{ text: "" }]
    }
  }
}