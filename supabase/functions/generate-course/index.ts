import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Demo user ID for unauthenticated access
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, description } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    console.log("Generating course for topic:", topic);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate course with AI
    const prompt = `Create a complete course for: "${topic}"
${description ? `Additional context: ${description}` : ""}

Generate a course with 5 lessons. Return JSON:
{
  "title": "Course title",
  "description": "Course description (2-3 sentences)",
  "lessons": [
    {
      "title": "Lesson title",
      "content": "Detailed content in markdown (3+ paragraphs with examples)",
      "summary": "Brief summary"
    }
  ]
}
Return ONLY valid JSON.`;

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
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    console.log("AI response received, parsing...");
    
    const parsed = JSON.parse(content);

    // Create course with demo user ID
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .insert({
        instructor_id: DEMO_USER_ID,
        title: parsed.title || topic,
        description: parsed.description || description,
        status: "draft",
      })
      .select()
      .single();

    if (courseError) {
      console.error("Course creation error:", courseError);
      throw courseError;
    }

    console.log("Course created:", course.id);

    // Create lessons and generate embeddings
    const lessons = parsed.lessons || [];
    for (let i = 0; i < lessons.length; i++) {
      const { data: insertedLesson, error: lessonError } = await supabaseAdmin.from("lessons").insert({
        course_id: course.id,
        title: lessons[i].title,
        content: lessons[i].content,
        summary: lessons[i].summary,
        order_index: i,
      }).select("id").single();
      if (lessonError) {
        console.error("Lesson creation error:", lessonError);
        continue;
      }
      // Generate embeddings (fire-and-forget)
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            courseId: course.id,
            lessonId: insertedLesson.id,
            lessonTitle: lessons[i].title,
            lessonContent: lessons[i].content,
            lessonSummary: lessons[i].summary,
            courseTitle: parsed.title || topic,
            courseDescription: parsed.description || description,
          }),
        });
      } catch (embErr) {
        console.warn("Embedding generation skipped:", embErr);
      }
    }

    console.log("All lessons created successfully");

    return new Response(JSON.stringify({ success: true, courseId: course.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate course error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
