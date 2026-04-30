import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { courseId, topic, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    console.log("Generating lessons for course:", courseId, "topic:", topic);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prompt = `Create a course outline for: "${topic}"
${description ? `Additional context: ${description}` : ""}

Generate 5 lessons with the following JSON structure:
{
  "lessons": [
    {
      "title": "Lesson title",
      "content": "Detailed lesson content in markdown format (at least 3 paragraphs)",
      "summary": "Brief 1-2 sentence summary"
    }
  ]
}

Make the content educational, well-structured, and engaging. Include practical examples where appropriate.
Return ONLY valid JSON, no additional text.`;

    console.log("Calling AI API...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert course creator. Generate educational content in JSON format." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Clean up the response
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    console.log("AI response received, parsing...");
    
    const parsed = JSON.parse(content);
    const lessons = parsed.lessons || [];

    // Insert lessons and trigger embedding generation
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const { data: insertedLesson, error } = await supabase.from("lessons").insert({
        course_id: courseId,
        title: lesson.title,
        content: lesson.content,
        summary: lesson.summary,
        order_index: i,
      }).select("id").single();
      if (error) {
        console.error("Lesson insert error:", error);
        continue;
      }
      // Generate embeddings for this lesson (fire-and-forget)
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({
            courseId,
            lessonId: insertedLesson.id,
            lessonTitle: lesson.title,
            lessonContent: lesson.content,
            lessonSummary: lesson.summary,
            courseTitle: topic,
            courseDescription: description,
          }),
        });
      } catch (embErr) {
        console.warn("Embedding generation skipped for lesson:", embErr);
      }
    }

    console.log("Lessons generated successfully:", lessons.length);

    return new Response(JSON.stringify({ success: true, lessonCount: lessons.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate lessons error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
