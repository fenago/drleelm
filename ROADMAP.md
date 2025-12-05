# DrLeeLM Roadmap

## Local Model Support (Priority: High)

### Overview
Enable users to download and run AI models locally - either in-browser using WebGPU or via Ollama for more powerful local inference.

---

## Phase 1: Browser-Based Models (WebGPU/LiteRT)

### Models Available for Browser
These lightweight models run directly in the browser using WebGPU - no server required:

| Model | Size | Download URL | Use Case |
|-------|------|--------------|----------|
| Gemma 3n E2B | ~1.5GB | [gemma-3n-E2B-it-int4-Web.litertlm](https://pub-8f8063a5b7fd42c1bf158b9ba33997d5.r2.dev/gemma-3n-E2B-it-int4-Web.litertlm) | Fast responses, basic Q&A |
| Gemma 3n E4B | ~2.5GB | [gemma-3n-E4B-it-int4-Web.litertlm](https://pub-8f8063a5b7fd42c1bf158b9ba33997d5.r2.dev/gemma-3n-E4B-it-int4-Web.litertlm) | Better quality, moderate speed |
| Gemma 3 270M | ~300MB | [gemma3-270m-it-q8-web.task](https://pub-8f8063a5b7fd42c1bf158b9ba33997d5.r2.dev/gemma3-270m-it-q8-web.task) | Ultra-fast, simple tasks |

### Implementation Tasks
- [ ] Create `LocalModelManager` class for browser model lifecycle
- [ ] Implement IndexedDB storage for downloaded models
- [ ] Add download progress UI with pause/resume
- [ ] Integrate MediaPipe/LiteRT for inference
- [ ] Add WebGPU detection and fallback messaging
- [ ] Create model selection UI in Settings
- [ ] Implement streaming responses from local models
- [ ] Add "Offline Mode" toggle in Settings

### Technical Requirements
- WebGPU-capable browser (Chrome 113+, Edge 113+, Firefox 121+)
- Sufficient device RAM (4GB+ for E2B, 8GB+ for E4B)
- IndexedDB storage space

---

## Phase 2: Ollama Integration (Local Server)

### Recommended Ollama Models
For users who want more powerful local models via Ollama:

#### Chat Models
| Model | Size | RAM Required | Command | Best For |
|-------|------|--------------|---------|----------|
| **llama3.2:1b** | 1.3GB | 4GB | `ollama pull llama3.2:1b` | Fast, low-resource |
| **llama3.2:3b** | 2.0GB | 6GB | `ollama pull llama3.2:3b` | Balanced |
| **phi3:mini** | 2.3GB | 6GB | `ollama pull phi3:mini` | Reasoning tasks |
| **mistral:7b** | 4.1GB | 8GB | `ollama pull mistral` | General purpose |
| **gemma2:2b** | 1.6GB | 4GB | `ollama pull gemma2:2b` | Google quality |
| **gemma2:9b** | 5.4GB | 12GB | `ollama pull gemma2:9b` | High quality |
| **qwen2.5:3b** | 1.9GB | 6GB | `ollama pull qwen2.5:3b` | Multilingual |
| **qwen2.5:7b** | 4.4GB | 10GB | `ollama pull qwen2.5:7b` | Best multilingual |
| **llama3.1:8b** | 4.7GB | 10GB | `ollama pull llama3.1:8b` | Most capable |

#### Coding Models
| Model | Size | RAM Required | Command | Best For |
|-------|------|--------------|---------|----------|
| **codellama:7b** | 3.8GB | 8GB | `ollama pull codellama:7b` | Code generation |
| **deepseek-coder:6.7b** | 3.8GB | 8GB | `ollama pull deepseek-coder:6.7b` | Code + explanations |
| **starcoder2:3b** | 1.7GB | 6GB | `ollama pull starcoder2:3b` | Fast coding |

#### Embedding Models (for RAG/Search)
| Model | Size | Command | Dimensions |
|-------|------|---------|------------|
| **nomic-embed-text** | 274MB | `ollama pull nomic-embed-text` | 768 |
| **mxbai-embed-large** | 670MB | `ollama pull mxbai-embed-large` | 1024 |
| **all-minilm** | 45MB | `ollama pull all-minilm` | 384 |

### Implementation Tasks
- [ ] Add Ollama model browser in Settings
- [ ] Implement `ollama pull` progress tracking via API
- [ ] Show installed vs available models
- [ ] One-click download for recommended models
- [ ] Auto-detect Ollama installation status
- [ ] Add model delete/cleanup functionality
- [ ] Show model RAM requirements with system RAM check

---

## Phase 3: Unified Local Model Experience

### Model Manager UI
Create a dedicated "Local Models" page with:

```
┌─────────────────────────────────────────────────────────────┐
│  Local Models                                    [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BROWSER MODELS (WebGPU)                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Gemma 3n E2B    1.5GB   [Download]               │   │
│  │ ● Gemma 3n E4B    2.5GB   [Active] [Delete]        │   │
│  │ ○ Gemma 3 270M    300MB   [Download]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OLLAMA MODELS (Local Server)                               │
│  Status: ● Running on localhost:11434                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● llama3.2:3b     2.0GB   [Active] [Delete]        │   │
│  │ ○ mistral:7b      4.1GB   [Download]               │   │
│  │ ○ codellama:7b    3.8GB   [Download]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  System: 16GB RAM available │ WebGPU: Supported             │
└─────────────────────────────────────────────────────────────┘
```

### Features
- [ ] Unified model selection dropdown across app
- [ ] Auto-switch to local model when offline
- [ ] Performance comparison (tokens/sec) display
- [ ] Model recommendations based on device specs
- [ ] Import custom GGUF models for Ollama
- [ ] Export chat history for offline use

---

## Phase 4: Hybrid Mode

### Smart Routing
- Use browser models for quick follow-ups
- Route complex queries to cloud APIs
- Fall back to local when rate limited
- Cost tracking: local vs cloud usage

### Implementation
- [ ] Add "Smart Routing" option in Settings
- [ ] Implement query complexity scoring
- [ ] Track and display cost savings
- [ ] Allow per-feature model preferences

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  LocalModelProvider                                          │
│  ├── BrowserModelEngine (WebGPU/LiteRT)                     │
│  │   └── IndexedDB (model cache)                            │
│  └── OllamaClient                                           │
│      └── HTTP → localhost:11434                             │
├─────────────────────────────────────────────────────────────┤
│                      Backend (Node.js)                       │
├─────────────────────────────────────────────────────────────┤
│  /api/local-models                                          │
│  ├── GET  /browser     - list browser models                │
│  ├── GET  /ollama      - list ollama models                 │
│  ├── POST /ollama/pull - download ollama model              │
│  └── DELETE /ollama/:model - remove model                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Timeline Estimates

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Browser Models | Not Started | Requires WebGPU research |
| Phase 2: Ollama Integration | Partial | Basic support exists |
| Phase 3: Model Manager UI | Not Started | Design needed |
| Phase 4: Hybrid Mode | Not Started | After Phase 1-3 |

---

## Resources

- [MediaPipe LLM Inference](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js)
- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [WebGPU Status](https://github.com/nicklv/WebGPU-Status)
- [LiteRT (TensorFlow Lite)](https://ai.google.dev/edge/litert)

---

## Notes

- Browser models are best for privacy-conscious users
- Ollama provides better quality but requires installation
- Consider adding a "first-run" wizard for local model setup
- Mobile browser support is limited (primarily desktop)
