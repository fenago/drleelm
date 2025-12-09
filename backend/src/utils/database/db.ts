import fs from "fs"
import path from "path"
import { Chroma } from "@langchain/community/vectorstores/chroma"
import { Document } from "@langchain/core/documents"
import { EmbeddingsInterface } from "@langchain/core/embeddings"
import { config } from "../../config/env"

const memoryStores: Record<string, any> = {}
const retrieverCache: Record<string, any> = {}

export function getRagDocuments(collection: string): { pageContent: string; metadata: any }[] {
  const file = path.join(process.cwd(), "storage", "json", `${collection}.json`)
  if (!fs.existsSync(file)) return []
  try {
    const docs = JSON.parse(fs.readFileSync(file, "utf-8"))
    return docs.map((d: any) => ({
      pageContent: d.pageContent || "",
      metadata: d.metadata || {},
    }))
  } catch {
    return []
  }
}

export async function saveDocuments(
  collection: string,
  docs: Document[],
  embeddings: EmbeddingsInterface
) {
  if (config.db_mode === "json") {
    const file = path.join(process.cwd(), "storage", "json", `${collection}.json`)
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      file,
      JSON.stringify(
        docs.map(d => ({
          pageContent: typeof d.pageContent === "string" ? d.pageContent : String(d.pageContent ?? ""),
          metadata: d.metadata || {}
        })),
        null,
        2
      )
    )
    delete memoryStores[collection]
    delete retrieverCache[collection]
  } else {
    const store = new Chroma(embeddings, {
      collectionName: collection,
      collectionMetadata: { "hnsw:space": "cosine" },
      url: config.chroma_url,
    })
    await store.addDocuments(docs)
    retrieverCache[collection] = store.asRetriever({ k: 4 })
  }
}

export async function getRetriever(
  collection: string,
  embeddings: EmbeddingsInterface
) {
  console.log(`[db.getRetriever] collection="${collection}" cached=${!!retrieverCache[collection]}`)

  if (retrieverCache[collection]) {
    console.log(`[db.getRetriever] Returning cached retriever for "${collection}"`)
    return retrieverCache[collection]
  }

  if (config.db_mode === "json") {
    const file = path.join(process.cwd(), "storage", "json", `${collection}.json`)
    console.log(`[db.getRetriever] JSON file: ${file}`)
    console.log(`[db.getRetriever] File exists: ${fs.existsSync(file)}`)

    const docsRaw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : []
    console.log(`[db.getRetriever] Loaded ${docsRaw.length} raw documents from JSON`)

    if (docsRaw.length === 0) {
      console.log(`[db.getRetriever] WARNING: No documents in collection "${collection}"`)
    }

    const docs = docsRaw.map((d: any) => new Document({
      pageContent: typeof d.pageContent === "string" ? d.pageContent : String(d.pageContent ?? ""),
      metadata: d.metadata || {},
    }))

    if (!memoryStores[collection]) {
      console.log(`[db.getRetriever] Creating MemoryVectorStore with ${docs.length} docs...`)
      try {
        const { MemoryVectorStore } = await import("langchain/vectorstores/memory")
        memoryStores[collection] = await MemoryVectorStore.fromDocuments(docs, embeddings)
        console.log(`[db.getRetriever] MemoryVectorStore created successfully`)
      } catch (embErr: any) {
        console.error(`[db.getRetriever] EMBEDDING ERROR: ${embErr?.message || embErr}`)
        console.error(`[db.getRetriever] This usually means the embedding API key is missing or invalid`)
        throw embErr
      }
    }
    retrieverCache[collection] = memoryStores[collection].asRetriever({ k: 4 })
    return retrieverCache[collection]
  } else {
    const store = new Chroma(embeddings, {
      collectionName: collection,
      url: config.chroma_url,
    })
    retrieverCache[collection] = store.asRetriever({ k: 4 })
    return retrieverCache[collection]
  }
}