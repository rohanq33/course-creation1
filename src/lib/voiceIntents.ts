const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export type IntentType =
  | "conversation"
  | "create_course"
  | "add_lesson"
  | "generate_quiz"
  | "summarize"
  | "search"
  | "navigate"
  | "dismiss"
  | "general_query";

export interface VoiceIntent {
  type: IntentType;
  topic?: string;
  target?: string;
  originalQuery: string;
}

/* ── pattern groups ── */

const DISMISS_PATTERNS = [
  /\b(thanks?\s*buddy|thank\s*you\s*buddy|close|goodbye|bye\s*buddy|nevermind|never\s*mind)\b/i,
];

const NAVIGATE_MAP: [RegExp, string, string][] = [
  [/\b(go\s*to|open|show)\s+(home|landing|main)\b/i, "/", "Taking you home."],
  [/\b(go\s*to|open|show)\s+(dashboard|instructor)\b/i, "/instructor", "Opening your dashboard."],
  [/\b(go\s*to|open|show)\s+(ai\s*(?:assistant|search)|search)\b/i, "/search", "Opening the AI assistant."],
  [/\b(go\s*to|open|show)\s+(student)\b/i, "/student", "Opening student dashboard."],
];

const COURSE_PATTERNS = [
  /(?:create|generate|build|make|start)\s+(?:a\s+)?(?:new\s+)?course\s+(?:on|in|about|for)\s+(.+)/i,
  /(?:create|generate|build|make|start)\s+(?:a\s+)?(?:new\s+)?(.+?)\s+course/i,
  /(?:create|generate|build|make|start)\s+(?:a\s+)?course\s+(.+)/i,
];

const LESSON_PATTERNS = [
  /(?:add|create|generate|make)\s+(?:a\s+)?(?:new\s+)?lesson\s+(?:on|about|for)\s+(.+)/i,
  /(?:add|create|generate|make)\s+(?:a\s+)?(?:new\s+)?(.+?)\s+lesson/i,
];

const QUIZ_PATTERNS = [
  /(?:generate|create|make|add)\s+(?:a\s+)?quiz\b/i,
];

const SUMMARIZE_PATTERNS = [
  /(?:summarize|summary|sum\s*up)\s+(?:this\s+)?(?:lesson|course|content)?/i,
];

const SEARCH_PATTERNS = [
  /(?:search|find|look\s*up)\s+(?:for\s+)?(.+)/i,
];

const CONVERSATION_PATTERNS: [RegExp, (q: string) => string][] = [
  [/^(hi|hello|hey|howdy|sup|yo)[\s!?.]*$/i, () => {
    const greets = ["Hi! How can I help?", "Hey! What do you need?", "Hello! I'm here for you."];
    return greets[Math.floor(Math.random() * greets.length)];
  }],
  [/\bhow\s+are\s+you\b/i, () => "I'm doing great and ready to help!"],
  [/\bwhat\s+(?:can\s+you|do\s+you)\s+do\b/i, () =>
    "I can create courses, add lessons, generate quizzes, answer questions, and navigate the app. Just ask!"],
  [/\bwhat\s+(?:day|date)\s+(?:is\s+)?(?:it\s+)?(?:today)?\b/i, () => {
    const d = new Date();
    return `Today is ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`;
  }],
  [/\bwhat\s+time\s+is\s+it\b/i, () => {
    return `It's ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
  }],
  [/\bwho\s+(?:are\s+you|made\s+you)\b/i, () => "I'm Buddy, your AI course assistant!"],
];

/* ── main detect function ── */

export function detectIntent(query: string): VoiceIntent {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // Dismiss
  if (DISMISS_PATTERNS.some(p => p.test(lower))) {
    return { type: "dismiss", originalQuery: trimmed };
  }

  // Navigation
  for (const [pattern, target, _msg] of NAVIGATE_MAP) {
    if (pattern.test(lower)) {
      return { type: "navigate", target, topic: _msg, originalQuery: trimmed };
    }
  }

  // Conversation (instant local answers)
  for (const [pattern, respFn] of CONVERSATION_PATTERNS) {
    if (pattern.test(lower)) {
      return { type: "conversation", topic: respFn(trimmed), originalQuery: trimmed };
    }
  }

  // Course creation
  for (const pattern of COURSE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const topic = cleanTopic(match[1]);
      if (topic) return { type: "create_course", topic, originalQuery: trimmed };
    }
  }

  // Lesson creation
  for (const pattern of LESSON_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const topic = cleanTopic(match[1]);
      if (topic) return { type: "add_lesson", topic, originalQuery: trimmed };
    }
  }

  // Quiz generation
  if (QUIZ_PATTERNS.some(p => p.test(lower))) {
    return { type: "generate_quiz", originalQuery: trimmed };
  }

  // Summarize
  if (SUMMARIZE_PATTERNS.some(p => p.test(lower))) {
    return { type: "summarize", originalQuery: trimmed };
  }

  // Search
  for (const pattern of SEARCH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return { type: "search", topic: cleanTopic(match[1]), originalQuery: trimmed };
    }
  }

  return { type: "general_query", originalQuery: trimmed };
}

function cleanTopic(raw: string): string {
  return raw.replace(/\s*(please|now|quickly|for me|buddy)\s*/gi, "").trim();
}

/* ── action executors ── */

export interface ActionResult {
  success: boolean;
  message: string;
  navigateTo?: string;
}

async function postAi(endpoint: string, body: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { response: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

export async function executeCreateCourse(topic: string): Promise<ActionResult> {
  try {
    const response = await postAi("/api/generate-course", {
      topic,
      description: `Course about ${topic}, generated via voice command.`,
    });

    if (response?.course) {
      return {
        success: true,
        message: `I created a course outline for ${topic}.`,
      };
    }

    const output = response.output || response.answer || response.response || response.result || "Course created.";
    return {
      success: true,
      message: `I created a course outline for ${topic}. ${output}`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to create course." };
  }
}

export async function executeAddLesson(topic: string): Promise<ActionResult> {
  try {
    const response = await postAi("/api/ai-chat", {
      message: `Create a lesson outline titled "${topic}" with clear objectives and examples.`,
    });
    return {
      success: true,
      message: response.answer || response.output || response.response || `Generated lesson outline for ${topic}.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to add lesson." };
  }
}

export async function executeGenerateQuiz(): Promise<ActionResult> {
  try {
    const response = await postAi("/api/ai-chat", {
      message: "Generate a short 5-question quiz with answers for the most recent topic discussed.",
    });
    return {
      success: true,
      message: response.answer || response.output || response.response || "Generated quiz content.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to generate quiz." };
  }
}
