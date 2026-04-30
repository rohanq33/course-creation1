import { API_BASE_URL } from "@/lib/api";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  answer_mode?: "grounded" | "general" | null;
  sources?: any[];
  suggested_queries?: string[];
  course_id?: string | null;
  created_at: string;
}

export interface StreamMeta {
  answer_mode: "grounded" | "general";
  sources: any[];
  suggested_queries: string[];
}

const STORAGE_KEY = "ai_course_buddy_chat_messages";
const CHAT_URL = `${API_BASE_URL}/api/ai-chat`;

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch (error) {
    console.error("Failed to load stored chat messages:", error);
    return [];
  }
}

function saveStoredMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save chat messages:", error);
  }
}

export async function saveMessage(msg: Omit<ChatMessage, "id" | "created_at">) {
  const stored = loadStoredMessages();
  const message: ChatMessage = {
    ...msg,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  stored.push(message);
  saveStoredMessages(stored);
  return message;
}

export async function loadConversations(): Promise<{ conversation_id: string; preview: string; created_at: string }[]> {
  const messages = loadStoredMessages();
  const conversations = new Map<string, { preview: string; created_at: string }>();

  for (const message of messages) {
    if (message.role !== "user") continue;
    const existing = conversations.get(message.conversation_id);
    if (!existing || existing.created_at < message.created_at) {
      conversations.set(message.conversation_id, {
        preview: message.content.slice(0, 80),
        created_at: message.created_at,
      });
    }
  }

  return Array.from(conversations.entries())
    .map(([conversation_id, data]) => ({ conversation_id, ...data }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function loadConversation(conversationId: string): Promise<ChatMessage[]> {
  const messages = loadStoredMessages();
  return messages
    .filter((message) => message.conversation_id === conversationId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export async function deleteConversation(conversationId: string) {
  const messages = loadStoredMessages();
  saveStoredMessages(messages.filter((message) => message.conversation_id !== conversationId));
}

export interface StreamChatParams {
  query: string;
  messages: { role: string; content: string }[];
  courseId?: string;
  onMeta: (meta: StreamMeta) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChatSearch({
  query, messages, courseId, onMeta, onDelta, onDone, onError, signal,
}: StreamChatParams) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: query,
        conversationHistory: messages,
        courseId: courseId || null,
      }),
      signal,
    });

    if (!resp.ok) {
      let msg = "AI request failed.";
      try {
        const e = await resp.json();
        msg = e.message || e.error || msg;
        console.error("AI chat failed:", e);
      } catch (parseErr) {
        console.error("AI chat failed:", resp.status, resp.statusText);
      }
      onError(msg);
      return;
    }

    const contentType = (resp.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      const answer = data.answer || data.response || data.output || "";
      if (!answer) {
        onError("AI returned empty response.");
        return;
      }
      onDelta(answer);
      onDone();
      return;
    }

    if (!resp.body) {
      onError("No response stream.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let metaParsed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.meta && !metaParsed) {
            const meta = typeof parsed.meta === "string" ? JSON.parse(parsed.meta) : parsed.meta;
            onMeta(meta);
            metaParsed = true;
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.meta && !metaParsed) {
            const meta = typeof parsed.meta === "string" ? JSON.parse(parsed.meta) : parsed.meta;
            onMeta(meta);
            metaParsed = true;
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {}
      }
    }

    onDone();
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    console.error("AI chat failed:", err);
    onError(err?.message || "Connection error.");
  }
}
