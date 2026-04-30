import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Attempt to generate an embedding for the user query */
async function getQueryEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 768,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

/** Retrieve relevant chunks using vector similarity or full-text search fallback */
async function retrieveChunks(
  supabase: any,
  query: string,
  courseId: string | null,
  apiKey: string
): Promise<{ chunk_text: string; metadata: any; source: string }[]> {
  // Try vector similarity first
  const embedding = await getQueryEmbedding(query, apiKey);

  if (embedding) {
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: `[${embedding.join(",")}]`,
      filter_course_id: courseId,
      match_threshold: 0.3,
      match_count: 5,
    });

    if (!error && data && data.length > 0) {
      console.log(`RAG: Retrieved ${data.length} chunks via vector similarity`);
      return data.map((d: any) => ({
        chunk_text: d.chunk_text,
        metadata: d.metadata,
        source: "vector",
      }));
    }
  }

  // Fallback to full-text search
  const { data, error } = await supabase.rpc("search_document_chunks", {
    query_text: query,
    filter_course_id: courseId,
    match_count: 5,
  });

  if (!error && data && data.length > 0) {
    console.log(`RAG: Retrieved ${data.length} chunks via full-text search`);
    return data.map((d: any) => ({
      chunk_text: d.chunk_text,
      metadata: d.metadata,
      source: "fts",
    }));
  }

  console.log("RAG: No relevant chunks found");
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, lessonContext, mode, action, courseId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured. The AI service is unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RAG Retrieval ──
    let ragContext = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Extract the user query for retrieval
      const lastUserMessage = [...(messages || [])].reverse().find((m: any) => m.role === "user");
      const queryText = lastUserMessage?.content || action || lessonContext?.title || "";

      if (queryText) {
        const chunks = await retrieveChunks(supabase, queryText, courseId || null, LOVABLE_API_KEY);
        if (chunks.length > 0) {
          const chunkTexts = chunks.map((c, i) => {
            const source = c.metadata?.lesson_title
              ? `[Source: ${c.metadata.lesson_title}]`
              : "";
            return `--- Retrieved Chunk ${i + 1} ${source} ---\n${c.chunk_text}`;
          });
          ragContext = `\n\nRETRIEVED CONTENT (use this to ground your answers):\n${chunkTexts.join("\n\n")}`;
        }
      }
    }

    // ── Build context from direct lesson props ──
    const contextParts: string[] = [];
    if (lessonContext?.courseTitle) contextParts.push(`Course: "${lessonContext.courseTitle}"`);
    if (lessonContext?.courseDescription) contextParts.push(`Course Description: ${lessonContext.courseDescription}`);
    if (lessonContext?.title) contextParts.push(`Current Lesson: "${lessonContext.title}"`);
    if (lessonContext?.content) contextParts.push(`Lesson Content:\n${lessonContext.content}`);
    if (lessonContext?.summary) contextParts.push(`Lesson Summary: ${lessonContext.summary}`);

    const directContext = contextParts.length > 0
      ? `\n\nDIRECT CONTEXT:\n${contextParts.join("\n")}`
      : "";

    // ── System prompt by mode ──
    const resolvedMode = mode || "student";
    let systemPrompt: string;

    if (resolvedMode === "instructor") {
      systemPrompt = `You are an expert AI course creation assistant helping an instructor build educational content.${directContext}${ragContext}

Your capabilities:
- Generate complete lesson content with clear structure
- Expand or simplify existing content
- Add real-world examples and analogies
- Create step-by-step explanations
- Generate quiz questions (MCQ with answers and explanations)
- Summarize content into concise notes
- Convert content into different formats (notes, outlines, study guides)

IMPORTANT: When retrieved content is provided above, use it to inform and ground your responses. Reference specific lessons when relevant.
When generating content, use markdown formatting. Be thorough, educational, and engaging.
If retrieved content is insufficient for the question, say so clearly instead of making up information.`;
    } else {
      systemPrompt = `You are a friendly, patient AI learning copilot helping a student understand course material.${directContext}${ragContext}

Your capabilities:
- Explain concepts in simpler terms
- Provide relevant examples to aid understanding
- Create practice quizzes when requested
- Answer questions about the material
- Give study tips and summaries
- Break down complex topics step by step

IMPORTANT: Answer primarily from the retrieved content and lesson context provided above. When citing information, mention which lesson it comes from.
If the retrieved content doesn't cover the student's question, clearly state that and offer your best general knowledge with a disclaimer.
Be encouraging, adapt to the student's level, and use markdown formatting.`;
    }

    // ── Handle quick actions ──
    let actionMessages = messages || [];
    if (action && !messages?.length) {
      const actionPrompts: Record<string, string> = {
        "generate-lesson": "Generate a complete, detailed lesson with clear sections, examples, and a summary. Use markdown with headers, bullet points, and code blocks where appropriate.",
        "expand-content": "Take the existing lesson content and expand it significantly. Add more detail, examples, explanations, and depth to each section.",
        "simplify": "Rewrite the existing lesson content in simpler, more accessible language. Use shorter sentences, everyday analogies, and avoid jargon.",
        "add-examples": "Add 3-5 detailed real-world examples that illustrate the key concepts in this lesson. Make them practical and relatable.",
        "step-by-step": "Create a clear step-by-step explanation of the main concepts in this lesson. Number each step and explain it thoroughly.",
        "generate-quiz": "Generate 5 multiple-choice quiz questions based on this lesson. For each question, provide 4 options, mark the correct answer, and include a brief explanation.",
        "summarize": "Create a concise summary of this lesson covering all key points. Use bullet points for easy scanning.",
        "convert-notes": "Convert this lesson content into a clean study notes format with key terms, definitions, important points, and quick review questions.",
        "explain-beginner": "Explain this lesson as if teaching a complete beginner. Start from the basics, use simple analogies, and build up gradually.",
      };
      const prompt = actionPrompts[action] || action;
      actionMessages = [{ role: "user", content: prompt }];
    }

    console.log(`AI Copilot [${resolvedMode}] action=${action || "chat"} rag_chunks=${ragContext ? "yes" : "no"} lesson="${lessonContext?.title || "none"}"`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...actionMessages.slice(-20),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Copilot error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
