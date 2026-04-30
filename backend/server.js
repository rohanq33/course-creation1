require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");

const app = express();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama2";
const OLLAMA_TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE) || 0.7;
const OLLAMA_MAX_TOKENS = Number(process.env.OLLAMA_MAX_TOKENS) || 1024;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const users = [];

function extractTextFromOllamaResult(result) {
  if (!result) return "";
  const content = result.content ?? result.text ?? result.output;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.content) return item.content;
        return "";
      })
      .join("");
  }
  if (typeof content === "object" && content !== null) {
    return content.content || "";
  }
  return "";
}

async function callOllama(prompt, options = {}) {
  const payload = {
    prompt,
    temperature: options.temperature ?? OLLAMA_TEMPERATURE,
    max_tokens: options.max_tokens ?? OLLAMA_MAX_TOKENS,
  };

  try {
    const response = await fetch(`${OLLAMA_URL}/v1/models/${OLLAMA_MODEL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Ollama returned error ${response.status}:`, body);
      return `I couldn't reach the AI model. Please confirm Ollama is running at ${OLLAMA_URL}.`;
    }

    const data = await response.json();
    const result = Array.isArray(data.results) ? data.results[0] : data;
    const text = extractTextFromOllamaResult(result);
    return text.trim();
  } catch (error) {
    console.error('Ollama request failed:', error);
    return `I couldn't connect to Ollama at ${OLLAMA_URL}. Please start Ollama and try again.`;
  }
}

function buildChatPrompt(message, conversationHistory = []) {
  let prompt = `You are an expert educational AI assistant for the AI Course Developer app. Help the user with clear, accurate, and friendly answers.\n\n`;

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    prompt += "Conversation history:\n";
    const recent = conversationHistory.slice(-10);
    for (const item of recent) {
      const role = item.role === "assistant" ? "Assistant" : "User";
      prompt += `${role}: ${item.content}\n`;
    }
    prompt += "\n";
  }

  prompt += `User: ${message}\nAssistant:`;
  return prompt;
}

function buildCoursePrompt(topic, description) {
  return `Create a complete course on the topic: "${topic}".\n${description ? `Additional context: ${description}\n` : ""}Generate a course outline with at least 5 lessons. Return the result in a clear markdown format with sections for course title, course description, lesson titles, and lesson summaries.`;
}

const examPrompts = {
  questions: (syllabus) => `Based on the following syllabus, generate 10 important exam questions with detailed answers. Format each question clearly and include the answer below it.\n\nSyllabus:\n${syllabus}`,
  quiz: (syllabus) => `Based on the following syllabus, generate 8 short quiz questions. For each question, provide the answer on the next line. Separate questions clearly.\n\nSyllabus:\n${syllabus}`,
  mcq: (syllabus) => `Based on the following syllabus, create 20 multiple choice questions. For each question, provide four answer options labeled A, B, C, D and indicate the correct answer clearly.\n\nSyllabus:\n${syllabus}`,
  videos: (syllabus) => `Based on the following syllabus, suggest 8 relevant educational video topics. For each item, include a title, summary, and a sample YouTube search URL.\n\nSyllabus:\n${syllabus}`,
  summary: (syllabus) => `Based on the following syllabus, create a concise revision summary with headings and bullet points for the main concepts.\n\nSyllabus:\n${syllabus}`,
};

const studentPrompts = {
  quiz: (topic) => `Generate 10 quiz questions about "${topic}". Format each as a numbered question followed by the answer on the next line. Separate with "---" between questions.`,
  homework: (topic) => `Generate 8 homework questions about "${topic}". Include short-answer and essay-style prompts. Number each item clearly.`,
  speech: (topic) => `Write an engaging study explanation about "${topic}". Use clear headings, examples, and analogies. Keep it about 500 words.`,
  videos: (topic) => `Suggest 8 educational video topics for learning "${topic}". For each item include a title, the subtopic it covers, and a sample YouTube search URL.`,
  research: (topic) => `Suggest 5 research paper ideas about "${topic}". For each, include a title, brief abstract, and key topics to explore.`,
  qa: (topic) => `Generate 10 important questions and answers about "${topic}". Format each as a question followed by a detailed answer.`,
};

app.get("/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  users.push({ email, password });
  res.json({ message: "Signup successful" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }
  if (user.password !== password) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET || "secretkey", { expiresIn: "1h" });
  res.json({ message: "Login successful", token, user: { email } });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.json({ message: "If this email exists, we have sent password reset instructions." });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: "Email, token, and password are required" });
  }
  const user = users.find((u) => u.email === email);
  if (user) {
    user.password = password;
  }
  return res.json({ message: "Password reset successful." });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    return res.json({ user: payload });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = buildChatPrompt(message, conversationHistory || []);
    const answer = await callOllama(prompt);
    res.json({ answer });
  } catch (error) {
    console.error("/api/ai-chat error:", error);
    res.status(500).json({ error: error.message || "AI chat failed" });
  }
});

app.post("/api/ai-search", async (req, res) => {
  try {
    const { query, messages } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    const prompt = buildChatPrompt(query, messages || []);
    const answer = await callOllama(prompt);
    res.json({ answer, sources: [], related_lessons: [], suggested_queries: [] });
  } catch (error) {
    console.error("/api/ai-search error:", error);
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

app.post("/api/generate-course", async (req, res) => {
  try {
    const { topic, description } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = buildCoursePrompt(topic, description || "");
    const output = await callOllama(prompt, { max_tokens: 1500 });
    res.json({ output });
  } catch (error) {
    console.error("/api/generate-course error:", error);
    res.status(500).json({ error: error.message || "Course generation failed" });
  }
});

app.post("/api/exam-time-generate", async (req, res) => {
  try {
    const { syllabusContent, section } = req.body;
    if (!syllabusContent || typeof syllabusContent !== "string" || !section) {
      return res.status(400).json({ error: "syllabusContent and section are required" });
    }

    const promptGenerator = examPrompts[section];
    if (!promptGenerator) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const prompt = promptGenerator(syllabusContent);
    const result = await callOllama(prompt, { max_tokens: 1500 });
    res.json({ result });
  } catch (error) {
    console.error("/api/exam-time-generate error:", error);
    res.status(500).json({ error: error.message || "AI generation failed" });
  }
});

app.post("/api/student-time-generate", async (req, res) => {
  try {
    const { topic, resourceType } = req.body;
    if (!topic || typeof topic !== "string" || !resourceType) {
      return res.status(400).json({ error: "topic and resourceType are required" });
    }

    const promptGenerator = studentPrompts[resourceType];
    if (!promptGenerator) {
      return res.status(400).json({ error: "Invalid resourceType" });
    }

    const prompt = promptGenerator(topic);
    const result = await callOllama(prompt, { max_tokens: 1500 });
    res.json({ result });
  } catch (error) {
    console.error("/api/student-time-generate error:", error);
    res.status(500).json({ error: error.message || "AI generation failed" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
