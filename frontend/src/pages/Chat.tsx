import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { env } from "../config/env";

// Custom hook for elapsed time tracking
function useElapsedTimer(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
    }
  }, [isRunning]);

  return elapsed;
}
import { chatJSON, getChatDetail, type FlashCard, createFlashcard, listFlashcards, deleteFlashcard, getChats, type ChatMessage, type SavedFlashcard, podcastStart } from "../lib/api";
import MarkdownView from "../components/Chat/MarkdownView";
import ActionRow from "../components/Chat/ActionRow";
import FlashCards from "../components/Chat/FlashCards";
import SelectionPopup from "../components/Chat/SelectionPopup";
import Composer from "../components/Chat/Composer";
import BagFab from "../components/Chat/BagFab";
import BagDrawer from "../components/Chat/BagDrawer";
import LoadingIndicator from "../components/Chat/LoadingIndicator";
import { useCompanion } from "../components/Companion/CompanionProvider";

type BagItem = { id: string; kind: "flashcard" | "note"; title: string; content: string };

function extractFirstJsonObject(s: string): string {
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1); }
  }
  return "";
}

function normalizePayload(payload: unknown): { md: string; flashcards: FlashCard[]; topic?: string } {
  if (typeof payload === "string") {
    const s = payload.trim();
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj = JSON.parse(s); return { md: String(obj?.answer || ""), flashcards: Array.isArray(obj?.flashcards) ? obj.flashcards : [], topic: typeof obj?.topic === "string" ? obj.topic : undefined }; } catch { }
    }
    const inner = extractFirstJsonObject(s);
    if (inner) {
      try { const obj = JSON.parse(inner); return { md: String(obj?.answer || ""), flashcards: Array.isArray(obj?.flashcards) ? obj.flashcards : [], topic: typeof obj?.topic === "string" ? obj.topic : undefined }; } catch { }
    }
    return { md: s, flashcards: [] };
  }
  if (payload && typeof payload === "object") {
    const o = payload as any;
    return { md: String(o?.answer || o?.html || ""), flashcards: Array.isArray(o?.flashcards) ? o.flashcards : [], topic: typeof o?.topic === "string" ? o.topic : undefined };
  }
  return { md: "", flashcards: [] };
}

function deriveTopicFromMarkdown(md: string): string {
  const m = md.match(/^\s*#{1,6}\s+(.+?)\s*$/m);
  return m ? m[1].trim() : "";
}

export default function Chat() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const state = (location?.state || {}) as {
    chatId?: string;
    q?: string;
    answer?: string | { html?: string; answer?: string; flashcards?: FlashCard[]; topic?: string };
    flashcards?: FlashCard[];
  };

  const initialChatId = search.get("chatId") || state.chatId || "";
  const initialQuestion = search.get("q") || state.q || "";

  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessage[] | undefined>([]);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [selected, setSelected] = useState<{ text: string; x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState<boolean>(!!(initialChatId || initialQuestion));
  const [awaitingAnswer, setAwaitingAnswer] = useState<boolean>(false);
  const [topic, setTopic] = useState<string>("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const [chatVerified, setChatVerified] = useState(false);
  const { setDocument } = useCompanion();
  const elapsedSeconds = useElapsedTimer(awaitingAnswer);

  const selPopupRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const answerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingAnswerRef = useRef<boolean>(false);
  const timeoutWarningRefs = useRef<{ t5?: ReturnType<typeof setTimeout>; t10?: ReturnType<typeof setTimeout> }>({});

  function clearTimeoutWarnings() {
    if (timeoutWarningRefs.current.t5) clearTimeout(timeoutWarningRefs.current.t5);
    if (timeoutWarningRefs.current.t10) clearTimeout(timeoutWarningRefs.current.t10);
    setSlowWarning(false);
  }
  const keyFor = (kind: BagItem["kind"], title: string, content: string) =>
    `${kind}:${title.trim().toLowerCase()}|${content.trim().toLowerCase()}`;

  // Keep ref in sync with state for use in async callbacks
  useEffect(() => {
    awaitingAnswerRef.current = awaitingAnswer;
  }, [awaitingAnswer]);

  useEffect(() => {
    if (!initialChatId && !initialQuestion) {
      (async () => {
        try {
          setConnecting(true);
          const res = await getChats();
          const list = Array.isArray(res?.chats) ? res.chats : [];
          if (list.length) {
            const latest = [...list].sort((a: any, b: any) => (b.at || 0) - (a.at || 0))[0];
            if (latest?.id) {
              setChatId(latest.id);
              navigate(`/chat?chatId=${encodeURIComponent(latest.id)}`, { replace: true, state: { chatId: latest.id } });
            } else {
              navigate("/", { replace: true });
            }
          } else {
            navigate("/", { replace: true });
          }
        } catch {
          navigate("/", { replace: true });
        }
      })();
    }
  }, [initialChatId, initialQuestion, navigate]);

  useEffect(() => {
    const cid = search.get("chatId") || state.chatId || "";
    setChatId(cid);
    if (state.answer) {
      const init = normalizePayload(state.answer);
      const seed: ChatMessage[] = [];
      if (initialQuestion) seed.push({ role: "user", content: initialQuestion, at: Date.now() });
      if (init.md) seed.push({ role: "assistant", content: init.md, at: Date.now() });
      if (seed.length) setMessages(seed);
      if ((init.flashcards?.length || state.flashcards?.length)) setCards(init.flashcards?.length ? init.flashcards : (state.flashcards || []));
      if (init.topic) setTopic(init.topic || "");
      else if (init.md) setTopic(deriveTopicFromMarkdown(init.md));
    } else {
      if (initialQuestion) {
        setMessages((prev) => (Array.isArray(prev) && prev.length ? prev : [{ role: "user", content: initialQuestion, at: Date.now() }]));
        setAwaitingAnswer(true);
      }
    }
  }, [search, state.chatId, state.answer, state.flashcards, initialQuestion]);

  useEffect(() => {
    if (!chatId) return;
    // Reset verification when chatId changes to prevent WebSocket connecting before verification
    setChatVerified(false);
    getChatDetail(chatId)
      .then((res) => {
        if (res?.ok && Array.isArray(res.messages)) {
          const normalized = res.messages.map((m) =>
            m.role === "assistant" ? { ...m, content: normalizePayload((m as any).content).md } : m
          );
          setMessages(normalized);
          setConnecting(false);
          setChatVerified(true);
          for (let i = normalized.length - 1; i >= 0; i--) {
            const raw = (res.messages[i] as any)?.content;
            if (normalized[i].role === "assistant") {
              const n = normalizePayload(raw);
              if (n.flashcards.length) setCards(n.flashcards);
              if (n.topic) setTopic(n.topic);
              else if (n.md) setTopic(deriveTopicFromMarkdown(n.md));
              break;
            }
          }
        } else {
          // Chat not found - clear URL and redirect to home
          console.warn("[Chat] Chat not found, redirecting to home");
          navigate("/", { replace: true });
        }
      })
      .catch((err) => {
        // Error loading chat (404, etc) - clear URL and redirect to home
        console.error("[Chat] Error loading chat:", err);
        navigate("/", { replace: true });
      });
  }, [chatId, navigate]);

  const wsConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only connect WebSocket after chat is verified to exist
    if (!chatId || !chatVerified) return;
    wsConnectedRef.current = false;
    const wsUrl = (env.backend || window.location.origin).replace(/^http/, "ws") + `/ws/chat?chatId=${encodeURIComponent(chatId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      wsConnectedRef.current = true;
      setConnecting(false);
      setChatError(null);
    };

    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m?.type === "answer") {
          // Clear polling timeout - we got the answer via WebSocket
          if (answerTimeoutRef.current) {
            clearTimeout(answerTimeoutRef.current);
            answerTimeoutRef.current = null;
          }
          clearTimeoutWarnings();
          const norm = normalizePayload(m.answer);
          setMessages((prev) => ([...(Array.isArray(prev) ? prev : []), { role: "assistant", content: norm.md, at: Date.now() }]));
          if (norm.flashcards.length) setCards(norm.flashcards);
          if (norm.topic) setTopic(norm.topic);
          else if (norm.md) setTopic((t) => t || deriveTopicFromMarkdown(norm.md));
          setAwaitingAnswer(false);
          setChatError(null);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
        } else if (m?.type === "done") {
          // Safety net: ensure timer stops when backend signals completion
          if (answerTimeoutRef.current) {
            clearTimeout(answerTimeoutRef.current);
            answerTimeoutRef.current = null;
          }
          clearTimeoutWarnings();
          setAwaitingAnswer(false);
        } else if (m?.type === "error") {
          // Stop timer and show error when backend reports failure
          if (answerTimeoutRef.current) {
            clearTimeout(answerTimeoutRef.current);
            answerTimeoutRef.current = null;
          }
          clearTimeoutWarnings();
          setAwaitingAnswer(false);
          setChatError(m.error || "Something went wrong. Please try again.");
        }
      } catch (e) {
        console.error("[WebSocket] Failed to parse message:", e, ev.data);
      }
    };

    ws.onerror = () => {
      // WebSocket failed - mark as not connected so we rely on polling
      wsConnectedRef.current = false;
      setConnecting(false);
    };

    ws.onclose = (ev) => {
      wsConnectedRef.current = false;
      // Only show error if WebSocket was our only hope (no polling running)
      // and the close was unexpected
      if (ev.code !== 1000 && !ev.wasClean && !answerTimeoutRef.current && !awaitingAnswerRef.current) {
        // Don't show error for initial connection failures - polling will handle it
        if (ev.code === 1006) {
          // Connection failed before establishment - this is common in production
          // Just clear connecting state, polling will handle answers
          setConnecting(false);
        } else {
          setChatError("Connection lost. Please refresh the page.");
        }
      }
    };

    return () => {
      try { ws.close(); } catch { }
      wsRef.current = null;
      wsConnectedRef.current = false;
      // Clear polling timeout on unmount
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current);
        answerTimeoutRef.current = null;
      }
    };
  }, [chatId, chatVerified]);

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setSelected(null); return; }
      const r = sel.getRangeAt(0);
      const rect = r.getBoundingClientRect();
      if (!rect || !r.toString().trim()) return;
      setSelected({ text: r.toString().trim(), x: rect.left + rect.width / 2 - 60 + window.scrollX, y: rect.bottom + window.scrollY });
    };
    const onDocClick = (e: any) => {
      const n = e.target as Node;
      if (selPopupRef.current && !selPopupRef.current.contains(n) && !window.getSelection()?.toString().trim()) setSelected(null);
    };
    document.addEventListener("mouseup", onSel);
    document.addEventListener("keyup", onSel);
    document.addEventListener("click", onDocClick);
    return () => {
      document.removeEventListener("mouseup", onSel);
      document.removeEventListener("keyup", onSel);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
  }, [Array.isArray(messages) ? messages.length : 0]);

  const addToBag = async (kind: BagItem["kind"], title: string, content: string) => {
    const k = keyFor(kind, title, content);
    if (seenRef.current.has(k)) return;
    try {
      const { flashcard } = await createFlashcard({
        question: title,
        answer: content,
        tag: kind === "note" ? "note" : "core",
      });
      setBag((b) => [
        { id: flashcard.id, kind, title: flashcard.question, content: flashcard.answer },
        ...b,
      ]);
      seenRef.current.add(k);
    } catch {
      const local = { id: `${Date.now()}-${Math.random()}`, kind, title, content };
      setBag((b) => [local, ...b]);
      seenRef.current.add(k);
    }
  };

  const clearBag = async () => {
    try {
      const res = await listFlashcards();
      const items = res.flashcards || [];
      await Promise.all(items.map((c) => deleteFlashcard(c.id).catch(() => { })));
    } catch { }
    setBag([]);
    seenRef.current.clear();
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await listFlashcards();
        const items = (res.flashcards || []).map<BagItem>((c) => ({
          id: c.id,
          kind: c.tag === "note" ? "note" : "flashcard",
          title: c.question,
          content: c.answer,
        }));
        setBag(items.sort((a, b) => (a.id > b.id ? -1 : 1)));
        const s = new Set<string>();
        for (const it of items) s.add(keyFor(it.kind, it.title, it.content));
        seenRef.current = s;
      } catch { }
    })();
  }, []);

  // Track the number of user messages to detect when we get a new assistant response
  const lastUserMsgCountRef = useRef<number>(0);
  const pollStartTimeRef = useRef<number>(0);

  // Poll for answer if WebSocket doesn't deliver it (handles race condition)
  const pollForAnswer = async (targetChatId: string, userMsgCount: number) => {
    // Clear any existing timeout
    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current);
      answerTimeoutRef.current = null;
    }

    lastUserMsgCountRef.current = userMsgCount;
    pollStartTimeRef.current = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    const maxWaitTime = 45000; // Max 45 seconds total (fail fast!)
    let consecutiveErrors = 0;

    const doPoll = async () => {
      if (!awaitingAnswerRef.current) return; // Already got answer via WebSocket

      const elapsed = Date.now() - pollStartTimeRef.current;

      // Hard timeout - fail fast with clear error
      if (elapsed > maxWaitTime) {
        console.error("[pollForAnswer] Timeout after", elapsed, "ms");
        clearTimeoutWarnings();
        setAwaitingAnswer(false);
        setChatError("Response timed out after 45 seconds. The server may be overloaded or misconfigured. Please try again.");
        return;
      }

      try {
        const res = await getChatDetail(targetChatId);
        consecutiveErrors = 0; // Reset error counter on success

        if (res?.ok && Array.isArray(res.messages)) {
          // Count user messages to see if we have a new assistant response
          const userMsgs = res.messages.filter((m: ChatMessage) => m.role === "user");
          const assistantMsgs = res.messages.filter((m: ChatMessage) => m.role === "assistant");

          // We expect an assistant message after our user message
          if (assistantMsgs.length >= userMsgs.length && userMsgs.length >= lastUserMsgCountRef.current) {
            const lastAssistant = res.messages[res.messages.length - 1];
            if (lastAssistant?.role === "assistant") {
              // Found the answer! Update state
              clearTimeoutWarnings();
              const norm = normalizePayload(lastAssistant.content);
              setMessages(res.messages.map((m: ChatMessage) =>
                m.role === "assistant" ? { ...m, content: normalizePayload(m.content).md } : m
              ));
              if (norm.flashcards.length) setCards(norm.flashcards);
              if (norm.topic) setTopic(norm.topic);
              else if (norm.md) setTopic((t) => t || deriveTopicFromMarkdown(norm.md));
              setAwaitingAnswer(false);
              setChatError(null);
              setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
              return;
            }
          }
        } else if (!res?.ok) {
          // Backend returned an error response
          console.error("[pollForAnswer] Backend error:", res);
          consecutiveErrors++;
        }
      } catch (e) {
        console.error("[pollForAnswer] Network error:", e);
        consecutiveErrors++;
      }

      // If we have 3+ consecutive errors, fail immediately
      if (consecutiveErrors >= 3) {
        console.error("[pollForAnswer] Too many consecutive errors, giving up");
        clearTimeoutWarnings();
        setAwaitingAnswer(false);
        setChatError("Failed to get response from server. Please check your connection and try again.");
        return;
      }

      // Continue polling
      if (awaitingAnswerRef.current) {
        answerTimeoutRef.current = setTimeout(doPoll, pollInterval);
      }
    };

    // Start polling faster if WebSocket isn't connected, otherwise give WS a chance
    const initialDelay = wsConnectedRef.current ? 2000 : 500;
    answerTimeoutRef.current = setTimeout(doPoll, initialDelay);
  };

  const sendFollowup = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setChatError(null);
    clearTimeoutWarnings();

    // Set up timeout warnings
    timeoutWarningRefs.current.t5 = setTimeout(() => {
      console.warn("[Chat] Still waiting after 5 seconds...");
    }, 5000);
    timeoutWarningRefs.current.t10 = setTimeout(() => {
      console.warn("[Chat] Still waiting after 10 seconds - this is taking longer than expected");
      setSlowWarning(true);
    }, 10000);

    // Count user messages before adding the new one (including the one we're about to add)
    const currentUserMsgCount = (Array.isArray(messages) ? messages.filter(m => m.role === "user").length : 0) + 1;
    setMessages((prev) => ([...(Array.isArray(prev) ? prev : []), { role: "user", content: text, at: Date.now() }]));
    setAwaitingAnswer(true);
    setBusy(true);
    try {
      const r = await chatJSON({ q: text, chatId: chatId || undefined });
      const targetChatId = r?.chatId || chatId;
      if (r?.chatId && r.chatId !== chatId) setChatId(r.chatId);
      // Start polling as a fallback in case WebSocket misses the answer
      if (targetChatId) pollForAnswer(targetChatId, currentUserMsgCount);
    } catch (e) {
      console.error("[sendFollowup] Error:", e);
      clearTimeoutWarnings();
      setAwaitingAnswer(false);
      setChatError("Failed to send message. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
    }
  };

  const latestAssistantContent = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].role === "assistant") return arr[i].content;
    }
    return "";
  }, [messages]);

  useEffect(() => {
    if (latestAssistantContent) {
      const docTitle = topic || deriveTopicFromMarkdown(latestAssistantContent) || "Study Topic";
      const docId = chatId ? `chat:${chatId}` : "chat:current";
      setDocument({
        id: docId,
        title: docTitle,
        text: latestAssistantContent,
      });
    } else {
      setDocument(null);
    }
  }, [chatId, latestAssistantContent, setDocument, topic]);

  useEffect(() => {
    return () => setDocument(null);
  }, [setDocument]);

  const list = Array.isArray(messages) ? messages : [];

  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-20 lg:mt-6 mb-16">
        <div className="flex-1 pr-6">
          <div className="w-full max-w-5xl mx-auto p-4 pt-2 pb-28">
            <div className="space-y-6">
              {list.map((m, i) => {
                const userBubble = "inline-block max-w-[85%] bg-stone-900/70 border border-zinc-800 rounded-2xl px-4 py-3";
                if (m.role === "assistant") {
                  return (
                    <div key={i} className="w-full flex justify-start">
                      <div className="w-full mx-auto rounded-3xl bg-stone-950/90 border border-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur px-6 md:px-8 py-6 md:py-8 max-w-[min(100%,1000px)]">
                        <div className="animate-[fadeIn_300ms_ease-out] leading-7 md:leading-8">
                          <MarkdownView md={m.content} />
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="w-full flex justify-start">
                    <div className={userBubble}>
                      <div className="text-stone-200 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                );
              })}
              {(connecting || awaitingAnswer) && (
                <div className="w-full flex justify-start flex-col gap-2">
                  <LoadingIndicator
                    label={connecting ? "Connecting…" : "Thinking…"}
                    elapsedSeconds={awaitingAnswer ? elapsedSeconds : undefined}
                  />
                  {slowWarning && (
                    <div className="p-3 rounded-xl bg-yellow-900/30 border border-yellow-700/50 text-yellow-200 text-sm">
                      This is taking longer than expected. Please wait...
                    </div>
                  )}
                </div>
              )}
              {chatError && !awaitingAnswer && (
                <div className="w-full flex justify-start">
                  <div className="w-full max-w-4xl rounded-2xl p-4 border border-red-900/50 bg-red-950/30">
                    <div className="flex items-center gap-3 text-red-400">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{chatError}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {latestAssistantContent && !awaitingAnswer && (
              <ActionRow
                disabled={busy}
                onSummarize={() => sendFollowup("Summarize the previous answer into 5–7 concise bullet points with bolded keywords.")}
                onLearnMore={() => sendFollowup("Go deeper into this topic with advanced details, real-world examples, and a short analogy.")}
                onStartQuiz={() => {
                  const t = topic || deriveTopicFromMarkdown(latestAssistantContent) || "General";
                  navigate(`/quiz?topic=${encodeURIComponent(t)}`, { state: { topic: t } });
                }}
                onCreatePodcast={async () => {
                  try {
                    const topicContent = latestAssistantContent || topic || "Generated from chat";
                    const response = await podcastStart({ topic: topicContent });
                    navigate("/tools", { state: { podcastPid: response.pid, podcastTopic: topicContent } });
                  } catch (error) {
                    console.error("Failed to create podcast:", error);
                  }
                }}
              />
            )}
          </div>
        </div>

        <FlashCards items={cards} onAdd={({ kind, title, content }) => addToBag(kind, title, content)} />
      </div>

      <SelectionPopup
        selected={selected}
        popupRef={selPopupRef}
        addNote={(text) => { addToBag("note", `Note: ${text.slice(0, 30)}${text.length > 30 ? "..." : ""}`, text); setSelected(null); }}
        askDoubt={(text) => { const v = text.trim(); if (v) sendFollowup(v); setSelected(null); }}
      />

      <Composer disabled={busy} onSend={sendFollowup} />
      <BagFab count={bag.length} onClick={() => setBagOpen(true)} />
      <BagDrawer open={bagOpen} items={bag} onClose={() => setBagOpen(false)} onClear={clearBag} />
    </div>
  );
}
