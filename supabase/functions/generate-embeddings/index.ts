import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100; // overlap between chunks

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) return [];
  const cleaned = text.trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);
    // Try to break at sentence or paragraph boundary
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastPeriod = slice.lastIndexOf(". ");
      const lastNewline = slice.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.3) {
        end = start + breakPoint + 1;
      }
    }
    chunks.push(cleaned.slice(start, end).trim());
    start = end - overlap;
    if (start >= cleaned.length) break;
  }
  return chunks.filter(c => c.length > 20);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
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

    if (!response.ok) {
      console.warn("Embeddings API returned", response.status, "- will store chunk without embedding");
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.warn("Embedding generation failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId, lessonId, lessonTitle, lessonContent, lessonSummary, courseTitle, courseDescription } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Generating embeddings for lesson: ${lessonId} in course: ${courseId}`);

    // Delete existing chunks for this lesson
    await supabase.from("document_chunks").delete().eq("lesson_id", lessonId);

    // Build chunks from lesson content
    const contentParts: string[] = [];

    // Add course-level context as first chunk
    if (courseTitle || courseDescription) {
      contentParts.push(
        `Course: ${courseTitle || "Untitled"}. ${courseDescription || ""}`
      );
    }

    // Add lesson title + summary as a chunk
    if (lessonTitle) {
      const titleChunk = `Lesson: ${lessonTitle}${lessonSummary ? `. Summary: ${lessonSummary}` : ""}`;
      contentParts.push(titleChunk);
    }

    // Chunk the main lesson content
    if (lessonContent) {
      const bodyChunks = chunkText(lessonContent);
      contentParts.push(...bodyChunks);
    }

    if (contentParts.length === 0) {
      return new Response(JSON.stringify({ success: true, chunksCreated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let chunksCreated = 0;
    let embeddingsGenerated = 0;

    for (let i = 0; i < contentParts.length; i++) {
      const chunkText = contentParts[i];
      const embedding = await generateEmbedding(chunkText, LOVABLE_API_KEY);

      const metadata = {
        lesson_title: lessonTitle || "",
        course_title: courseTitle || "",
        chunk_type: i === 0 && courseTitle ? "course_context" : i === (courseTitle ? 1 : 0) && lessonTitle ? "lesson_header" : "lesson_body",
      };

      const insertData: any = {
        course_id: courseId,
        lesson_id: lessonId,
        chunk_index: i,
        chunk_text: chunkText,
        metadata,
      };

      if (embedding) {
        // Format as pgvector string
        insertData.embedding = `[${embedding.join(",")}]`;
        embeddingsGenerated++;
      }

      const { error } = await supabase.from("document_chunks").insert(insertData);
      if (error) {
        console.error(`Chunk ${i} insert error:`, error);
      } else {
        chunksCreated++;
      }
    }

    console.log(`Created ${chunksCreated} chunks, ${embeddingsGenerated} with embeddings`);

    return new Response(JSON.stringify({
      success: true,
      chunksCreated,
      embeddingsGenerated,
      hasVectorSearch: embeddingsGenerated > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate embeddings error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
