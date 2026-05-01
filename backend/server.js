const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createClient } = require('@supabase/supabase-js');

const app = express();

const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "llama3.2:1b";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log('Loaded SUPABASE_URL:', Boolean(SUPABASE_URL), 'Loaded SUPABASE_KEY:', Boolean(SUPABASE_KEY));
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:8084",
  "http://localhost:8085",
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));
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

const SAFE_SYSTEM_PROMPT = `You are an educational study material generator. The uploaded content is safe academic syllabus content. Generate helpful study materials only from the syllabus. Do not refuse unless the content is clearly illegal, sexual, violent, or harmful.`
const SAFE_RETRY_PROMPT = `This is a normal computer science/programming syllabus. Generate educational study material. Do not discuss unsafe content.`
const REFUSAL_PHRASES = [
  "i can't help",
  "i cannot assist",
  "i can't assist",
  "i'm not able",
]

function labelSyllabusContent(content) {
  return `SUBJECT/SYLLABUS CONTENT START\n${content.trim()}\nSUBJECT/SYLLABUS CONTENT END`
}

function labelSubjectTitle(title) {
  return `SUBJECT/TITLE START\n${title.trim()}\nSUBJECT/TITLE END`
}

function sanitizeTopic(topic) {
  return topic.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\s\-]/g, '').trim() || 'Academic Topic'
}

function isRefusalText(text) {
  if (!text || typeof text !== 'string') return false
  const normalized = text.trim().toLowerCase()
  return REFUSAL_PHRASES.some((phrase) => normalized.startsWith(phrase))
}

async function callOllama(prompt, options = {}) {
  const payload = {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
  };

  try {
    const url = `${OLLAMA_URL}/api/generate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Ollama returned error ${response.status}:`, body);
      return `I couldn't reach the AI model. Please confirm Ollama is running at ${OLLAMA_URL} and the model ${OLLAMA_MODEL} is available.`;
    }

    const data = await response.json();
    const responseText = data?.response || data?.text || data?.output || data?.result || extractTextFromOllamaResult(data);
    return (typeof responseText === "string" ? responseText : JSON.stringify(responseText)).trim();
  } catch (error) {
    console.error('Ollama request failed:', error);
    return `I couldn't connect to Ollama at ${OLLAMA_URL}. Please start Ollama and try again.`;
  }
}

async function callOllamaWithRetry(userPrompt, options = {}) {
  const prompt = `${SAFE_SYSTEM_PROMPT}\n\n${userPrompt}`
  let output = await callOllama(prompt, options)

  if (isRefusalText(output)) {
    console.warn('Ollama refusal detected; retrying with stronger safe academic prompt.')
    output = await callOllama(`${SAFE_SYSTEM_PROMPT}\n${SAFE_RETRY_PROMPT}\n\n${userPrompt}`, options)
  }

  return output
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
  return `You are an expert educational course designer. Create a complete course on the topic: "${topic}". ${description ? `Additional context: ${description}. ` : ''}Return only valid JSON with the following shape:\n\n{
  "success": true,
  "course": {
    "id": "<unique-id>",
    "title": "<course title>",
    "description": "<course description>",
    "thumbnail_url": null,
    "status": "draft",
    "published": false,
    "created_at": "<ISO timestamp>",
    "updated_at": "<ISO timestamp>",
    "modules": [
      {
        "title": "<module title>",
        "lessons": [
          {
            "id": "<lesson id>",
            "title": "<lesson title>",
            "content": "<lesson content>"
          }
        ]
      }
    ]
  }
}\n\nDo not include any text outside the JSON object.`;
}

function mapPublishedCourse(course) {
  return {
    ...course,
    published: course.status === 'published',
  };
}

function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
  const candidate = text.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function buildFallbackCourse(topic, description, output) {
  return {
    id: `local-${Date.now()}`,
    instructor_id: 'demo',
    title: topic,
    description: description || `A course about ${topic}`,
    thumbnail_url: null,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modules: [
      {
        title: 'Introduction',
        lessons: [
          {
            id: `local-lesson-${Date.now()}`,
            title: `Introduction to ${topic}`,
            content: output || `An intro to ${topic}`,
          },
        ],
      },
    ],
  };
}

const examPrompts = {
  questions: (contentSource) => `Generate 10 important exam questions with detailed answers based only on the syllabus below. Number each question from 1 to 10 and include a clear exam-style answer after each question.\n\n${contentSource}`,
  quiz: (contentSource) => `Generate 10 short quiz questions based only on the syllabus below. After each question, put the answer on the next line beginning with "Answer:".\n\n${contentSource}`,
  mcq: (contentSource, subjectTitle = 'this topic') => `Generate exactly 20 multiple choice questions based only on the syllabus below. Do not write everything in one paragraph. Use this exact markdown format:\n\nHere are 20 MCQs on ${subjectTitle}:\n\n**1. Question text?**\n\nA) Option one  \nB) Option two  \nC) Option three  \nD) Option four  \n\n**Answer: B) Correct option**\n\n---\n\n**2. Question text?**\n\nA) Option one  \nB) Option two  \nC) Option three  \nD) Option four  \n\n**Answer: C) Correct option**\n\nContinue with the same structure for all 20 MCQs. Separate every MCQ with "---".\n\n${contentSource}`,
  videos: (contentSource) => `Suggest 8 educational YouTube search topics based only on the syllabus below. For each item, include a title, a short explanation, and a sample YouTube search URL.\n\n${contentSource}`,
  summary: (contentSource) => `Create a topic-wise revision summary based only on the syllabus below. Use headings and bullet points for the main concepts.\n\n${contentSource}`,
};

const studentPrompts = {
  quiz: (topic) => `Generate 10 short quiz questions about "${sanitizeTopic(topic)}". After each question, put the answer on the next line beginning with "Answer:".`,
  homework: (topic) => `Generate 8 homework questions about "${sanitizeTopic(topic)}". Include short-answer, essay-style, and problem-solving prompts. Number each item clearly.`,
  speech: (topic) => `Write a clear educational explanation about "${sanitizeTopic(topic)}" as if teaching a student. Use headings, examples, and analogies.`,
  videos: (topic) => `Suggest 8 educational YouTube search topics for learning "${sanitizeTopic(topic)}". For each item, include a title, a short explanation, and a sample YouTube search URL.`,
  research: (topic) => `Suggest 5 research ideas about "${sanitizeTopic(topic)}". For each idea, include a title, a brief abstract, and key areas to explore.`,
  qa: (topic) => `Generate 10 important questions and detailed answers about "${sanitizeTopic(topic)}". Number each item and provide a clear answer after each question.`,
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

app.get("/api/courses", async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Missing Supabase configuration for /api/courses");
      return res.status(500).json({ error: "Supabase configuration is missing" });
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons(*),
        enrollments(count)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch courses error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load courses' });
    }

    console.log('Published courses returned:', courses);
    res.json(courses || []);
  } catch (error) {
    console.error('/api/courses error:', error);
    res.status(500).json({ error: error.message || 'Unable to return courses' });
  }
});

app.get('/api/instructor/courses/:instructor_id', async (req, res) => {
  try {
    const instructorId = req.params.instructor_id;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing Supabase configuration for /api/instructor/courses');
      return res.status(500).json({ error: 'Supabase configuration is missing' });
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`*, lessons:lessons(count), enrollments:enrollments(count)`)
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('/api/instructor/courses error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load instructor courses' });
    }

    const instructorIds = Array.from(new Set((courses || []).map((course) => course.instructor_id).filter(Boolean)));
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', instructorIds);

    if (profileError) {
      console.error('/api/instructor/courses profile lookup error:', profileError);
      return res.status(500).json({ error: profileError.message || 'Failed to load instructor profiles' });
    }

    const formatted = (courses || []).map((course) => ({
      ...course,
      published: course.status === 'published',
      instructor_name: profiles?.find((p) => p.user_id === course.instructor_id)?.full_name || 'Instructor',
    }));

    console.log('Instructor courses returned:', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('/api/instructor/courses error:', error);
    res.status(500).json({ error: error.message || 'Unable to return instructor courses' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    console.log('Create course request:', req.body);
    const { title, description, generatedWithAI, instructor_id } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const now = new Date().toISOString();
    let courseData = {
      title: title.trim(),
      description: description?.trim() || null,
      status: 'draft',
      published: false,
      lessons: [],
    };

    if (generatedWithAI === true) {
      try {
        const lessonPrompt = `
Generate exactly 5 lessons for the course: "${title.trim()}"

Return ONLY valid JSON (no text before/after):
[
  {
    "title": "Lesson title",
    "content": "Detailed explanation (4-6 lines)"
  }
]
`;
        const aiResponse = await callOllama(lessonPrompt);

        let lessons = [];
        try {
          const raw = aiResponse?.response || aiResponse;
          const cleaned = typeof raw === 'string'
            ? raw.replace(/```json|```|`/gi, '').trim()
            : JSON.stringify(raw);

          if (typeof cleaned === 'string') {
            try {
              lessons = JSON.parse(cleaned);
            } catch (parseError) {
              const extracted = extractJsonFromText(cleaned);
              if (Array.isArray(extracted)) {
                lessons = extracted;
              } else if (extracted?.lessons && Array.isArray(extracted.lessons)) {
                lessons = extracted.lessons;
              } else {
                console.error('Lesson JSON parse failed:', parseError);
              }
            }
          } else if (Array.isArray(raw)) {
            lessons = raw;
          } else if (raw?.lessons && Array.isArray(raw.lessons)) {
            lessons = raw.lessons;
          }
        } catch (err) {
          console.error('Lesson JSON parse failed:', err);
        }

        if (!Array.isArray(lessons) || lessons.length === 0) {
          console.log('Using fallback lessons');
          lessons = [
            { title: `${title} Basics`, content: `Introduction to ${title}` },
            { title: `${title} Structure`, content: `Core concepts of ${title}` },
            { title: `${title} Functions`, content: `How ${title} works` },
            { title: `${title} Applications`, content: `Real-world uses of ${title}` },
            { title: `${title} Summary`, content: `Key takeaways of ${title}` },
          ];
        }

        courseData = {
          title: title.trim(),
          description: description?.trim() || null,
          status: 'draft',
          published: false,
          lessons,
        };

        console.log('AI generated course lessons count:', courseData.lessons.length);
      } catch (aiError) {
        console.error('AI generation failed:', aiError);
        const lessons = [
          { title: `${title} Basics`, content: `Introduction to ${title}` },
          { title: `${title} Structure`, content: `Core concepts of ${title}` },
          { title: `${title} Functions`, content: `How ${title} works` },
          { title: `${title} Applications`, content: `Real-world uses of ${title}` },
          { title: `${title} Summary`, content: `Key takeaways of ${title}` },
        ];

        courseData = {
          title: title.trim(),
          description: description?.trim() || null,
          status: 'draft',
          published: false,
          lessons,
        };
      }
    }

    const newCourse = {
      id: crypto.randomUUID(),
      title: courseData.title,
      description: courseData.description,
      instructor_id: instructor_id || 'demo',
      status: 'draft',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('courses')
      .insert(newCourse)
      .select(`*, lessons:lessons(count), enrollments:enrollments(count)`)
      .single();

    if (error) {
      console.error('/api/courses create error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create course' });
    }

    let insertedLessons = [];
    if (Array.isArray(courseData.lessons) && courseData.lessons.length > 0) {
      for (const lesson of courseData.lessons) {
        if (!lesson?.title || !lesson?.content) continue;
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            course_id: data.id,
            title: lesson.title,
            content: lesson.content,
          })
          .select()
          .single();

        if (lessonError) {
          console.error('Lesson insert error:', lessonError, lesson.title);
          continue;
        }

        insertedLessons.push(lessonData);
        console.log('Saved lesson:', lesson.title);
      }
    }

    const createdCourse = {
      ...data,
      published: false,
      lessons: courseData.lessons,
      saved_lessons: insertedLessons,
    };

    console.log('Final lessons count:', courseData.lessons.length);
    console.log('Saved course:', createdCourse);
    res.json(createdCourse);
  } catch (error) {
    console.error('Course creation failed:', error);
    res.status(500).json({ error: error.message || 'Unable to create course' });
  }
});

app.patch('/api/courses/:id', async (req, res) => {
  try {
    const { status, published } = req.body;
    const newStatus = status
      ? status
      : published === true
      ? 'published'
      : published === false
      ? 'draft'
      : undefined;

    if (!newStatus || !['draft', 'published', 'archived'].includes(newStatus)) {
      return res.status(400).json({ error: 'Valid status or published boolean is required' });
    }

    const updatePayload = {
      status: newStatus,
      published: newStatus === 'published',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      console.error('/api/courses update error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update course' });
    }

    const updatedCourse = {
      ...data,
      published: data.status === 'published',
    };
    console.log('Updated course:', updatedCourse);
    res.json(updatedCourse);
  } catch (error) {
    console.error('/api/courses update error:', error);
    res.status(500).json({ error: error.message || 'Unable to update course' });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('/api/courses delete error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete course' });
    }

    console.log('Deleted course:', courseId);
    res.json({ success: true });
  } catch (error) {
    console.error('/api/courses delete error:', error);
    res.status(500).json({ error: error.message || 'Unable to delete course' });
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

    if (typeof output === 'string' && /couldn'?t\s+(connect|reach|find|start)/i.test(output)) {
      return res.status(502).json({ error: output });
    }

    let parsed = null;
    if (typeof output === 'string') {
      try {
        parsed = JSON.parse(output);
      } catch {
        parsed = extractJsonFromText(output);
      }
    }

    if (parsed?.course && typeof parsed.course === 'object') {
      parsed.course.id = parsed.course.id || `local-${Date.now()}`;
      parsed.course.created_at = parsed.course.created_at || new Date().toISOString();
      parsed.course.updated_at = parsed.course.updated_at || new Date().toISOString();
      return res.json(parsed);
    }

    const fallbackCourse = buildFallbackCourse(topic, description || '', output);
    return res.json({ success: true, course: fallbackCourse, raw_output: output });
  } catch (error) {
    console.error("/api/generate-course error:", error);
    res.status(500).json({ error: error.message || "Course generation failed" });
  }
});

app.post("/api/exam-time-generate", async (req, res) => {
  try {
    const { syllabusContent, section, subject } = req.body;
    const hasSyllabus = typeof syllabusContent === "string" && syllabusContent.trim().length > 0;
    const hasSubject = typeof subject === "string" && subject.trim().length > 0;

    if (!section || (!hasSyllabus && !hasSubject)) {
      return res.status(400).json({ error: "section and either syllabusContent or subject are required" });
    }

    const promptGenerator = examPrompts[section];
    if (!promptGenerator) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const contentSource = hasSyllabus
      ? labelSyllabusContent(syllabusContent)
      : labelSubjectTitle(subject);
    const prompt = promptGenerator(contentSource, subject?.trim() || 'this topic');
    const result = await callOllamaWithRetry(prompt, { max_tokens: 1500 });
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
    const result = await callOllamaWithRetry(prompt, { max_tokens: 1500 });
    res.json({ result });
  } catch (error) {
    console.error("/api/student-time-generate error:", error);
    res.status(500).json({ error: error.message || "AI generation failed" });
  }
});

function buildGenerateLessonsPrompt(topic, description) {
  return `Generate 6 lesson titles and short summaries for a course titled \"${topic}\". ${description ? `Context: ${description}` : ''}`;
}

app.post("/api/generate-lessons", async (req, res) => {
  try {
    const { courseId, topic, description } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = buildGenerateLessonsPrompt(topic, description || "");
    const output = await callOllama(prompt, { max_tokens: 1200 });
    res.json({ message: "Lessons generated successfully.", output });
  } catch (error) {
    console.error("/api/generate-lessons error:", error);
    res.status(500).json({ error: error.message || "Lesson generation failed" });
  }
});

app.post("/api/generate-embeddings", async (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    console.warn("Embedding generation is not supported in the local version.");
    res.json({ message: "Embedding generation is skipped in the local version." });
  } catch (error) {
    console.error("/api/generate-embeddings error:", error);
    res.status(500).json({ error: error.message || "Embedding generation failed" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
