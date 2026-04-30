import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text, dimensions: 768 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

interface ChunkResult {
  id: string;
  course_id: string;
  lesson_id: string;
  chunk_text: string;
  metadata: Record<string, unknown>;
  score: number;
  source: "vector" | "fts";
}

async function hybridSearch(
  supabase: ReturnType<typeof createClient>,
  query: string,
  courseId: string | null,
  apiKey: string
): Promise<ChunkResult[]> {
  const resultsMap = new Map<string, ChunkResult>();

  const embedding = await getEmbedding(query, apiKey);
  if (embedding) {
    const { data } = await supabase.rpc("match_document_chunks", {
      query_embedding: `[${embedding.join(",")}]`,
      filter_course_id: courseId,
      match_threshold: 0.2,
      match_count: 10,
    });
    if (data) {
      for (const d of data) {
        resultsMap.set(d.id, {
          id: d.id, course_id: d.course_id, lesson_id: d.lesson_id,
          chunk_text: d.chunk_text, metadata: d.metadata || {},
          score: d.similarity * 0.7, source: "vector",
        });
      }
    }
  }

  const { data: ftsData } = await supabase.rpc("search_document_chunks", {
    query_text: query, filter_course_id: courseId, match_count: 10,
  });
  if (ftsData) {
    for (const d of ftsData) {
      const existing = resultsMap.get(d.id);
      if (existing) {
        existing.score += (d.rank || 0) * 0.3;
      } else {
        resultsMap.set(d.id, {
          id: d.id, course_id: d.course_id, lesson_id: d.lesson_id,
          chunk_text: d.chunk_text, metadata: d.metadata || {},
          score: (d.rank || 0) * 0.3, source: "fts",
        });
      }
    }
  }

  return Array.from(resultsMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, courseId, messages, stream } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Hybrid retrieval
    const chunks = await hybridSearch(supabase, query, courseId || null, LOVABLE_API_KEY);
    const isGrounded = chunks.length > 0;

    // Fetch lesson/course metadata for sources
    let sources: any[] = [];
    let lessonMap = new Map();
    let courseMap = new Map();

    if (isGrounded) {
      const lessonIds = [...new Set(chunks.map((c) => c.lesson_id))];
      const { data: lessons } = await supabase.from("lessons").select("id, title, course_id").in("id", lessonIds);
      lessonMap = new Map((lessons || []).map((l: any) => [l.id, l]));
      const courseIds = [...new Set((lessons || []).map((l: any) => l.course_id))];
      const { data: courses } = await supabase.from("courses").select("id, title").in("id", courseIds);
      courseMap = new Map((courses || []).map((c: any) => [c.id, c.title]));

      sources = chunks.map((c) => {
        const lesson = lessonMap.get(c.lesson_id);
        return {
          lesson_id: c.lesson_id, course_id: c.course_id,
          title: (c.metadata as any)?.lesson_title || lesson?.title || "Unknown Lesson",
          course: lesson ? courseMap.get(lesson.course_id) : "Unknown Course",
          score: Math.round(c.score * 100) / 100,
        };
      });
    }

    // Build system prompt
    let systemPrompt: string;
    if (isGrounded) {
      const contextBlocks = chunks.map((c, i) => {
        const lesson = lessonMap.get(c.lesson_id);
        const title = (c.metadata as any)?.lesson_title || lesson?.title || "Unknown";
        return `--- Chunk ${i + 1} [Lesson: ${title}] ---\n${c.chunk_text}`;
      });
      systemPrompt = `You are an expert AI assistant for an educational platform. Answer the user's question using the retrieved course content below. Be thorough, clear, and helpful.

Rules:
- Answer based primarily on retrieved content
- Provide clear explanations with examples where possible
- Mention which lesson the information comes from
- If retrieved content is insufficient for a complete answer, supplement with your knowledge but note this
- Use markdown formatting

RETRIEVED CONTENT:
${contextBlocks.join("\n\n")}`;
    } else {
      systemPrompt = `You are an expert AI assistant for an educational platform called AI Course Developer. You help users learn, explain concepts, and create educational content.

Rules:
- Provide thorough, accurate, educational answers
- Use examples and analogies
- Structure responses with markdown
- If the user asks about specific course content you don't have, suggest they create a course on the topic`;
    }

    // Build messages array with conversation history
    const llmMessages: any[] = [{ role: "system", content: systemPrompt }];
    if (messages && Array.isArray(messages)) {
      // Include last 10 messages for memory
      const recentMessages = messages.slice(-10);
      for (const m of recentMessages) {
        llmMessages.push({ role: m.role, content: m.content });
      }
    }
    llmMessages.push({ role: "user", content: query });

    const suggestedQueries = [
      `Explain "${query}" in simpler terms`,
      `Give real-world examples of "${query}"`,
      `Create a quiz about "${query}"`,
      `Turn this into a course outline`,
    ];

    // STREAMING MODE
    if (stream) {
      console.log("Starting streaming LLM request, model: google/gemini-2.5-flash");

      let llmRes: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          llmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: llmMessages,
              stream: true,
            }),
          });
          if (llmRes.ok) break;
          const errBody = await llmRes.text();
          console.error(`LLM attempt ${attempt + 1} failed (${llmRes.status}):`, errBody);
          llmRes = null;
        } catch (fetchErr) {
          console.error(`LLM fetch attempt ${attempt + 1} error:`, fetchErr);
          llmRes = null;
        }
      }

      if (!llmRes || !llmRes.ok) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send metadata first, then stream LLM tokens
      const encoder = new TextEncoder();
      const metaObj = {
        answer_mode: isGrounded ? "grounded" : "general",
        sources,
        suggested_queries: suggestedQueries,
      };
      const readable = new ReadableStream({
        async start(controller) {
          // Send metadata event first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ meta: metaObj })}\n\n`));

          // Pipe LLM stream
          const reader = llmRes.body!.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              controller.enqueue(encoder.encode(text));
            }
          } catch (e) {
            console.error("Stream error:", e);
          }
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // NON-STREAMING (legacy support)
    const llmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: llmMessages }),
    });

    let answer = "Unable to generate an answer at this time.";
    if (llmRes.ok) {
      const llmData = await llmRes.json();
      answer = llmData.choices?.[0]?.message?.content || answer;
    }

    return new Response(
      JSON.stringify({
        answer,
        answer_mode: isGrounded ? "grounded" : "general",
        sources,
        related_lessons: [],
        suggested_queries: suggestedQueries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
