import { API_BASE_URL } from "@/lib/api";

const CHAT_URL = `${API_BASE_URL}/api/ai-chat`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LessonContext {
  title?: string;
  content?: string;
  summary?: string;
  courseTitle?: string;
  courseDescription?: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  lessonContext?: LessonContext;
  mode?: 'instructor' | 'student';
  action?: string;
  courseId?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChat({
  messages,
  lessonContext,
  mode,
  action,
  courseId,
  onDelta,
  onDone,
  onError,
  signal,
}: StreamChatOptions) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messages[messages.length - 1]?.content || '',
        conversationHistory: messages,
        courseId: courseId || null,
      }),
      signal,
    });

    if (!resp.ok) {
      let errorMsg = 'AI request failed.';
      try {
        const errData = await resp.json();
        errorMsg = errData.message || errData.error || errorMsg;
        console.error('AI chat failed:', errData);
      } catch (parseErr) {
        console.error('AI chat failed:', resp.status, resp.statusText);
      }
      onError(errorMsg);
      return;
    }

    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const data = await resp.json();
      const answer = data.answer || data.response || '';
      if (!answer) {
        onError('No AI answer returned.');
        return;
      }
      onDelta(answer);
      onDone();
      return;
    }

    if (!resp.body) {
      onError('No response stream received.');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('AI chat failed:', err);
    onError(err?.message || 'Connection error. Please try again.');
  }
}
