const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Student Time Generate: Received request')
    const { topic, resourceType } = await req.json()
    console.log('Student Time Generate: Payload received', { topic, resourceType })

    if (!topic || !resourceType) {
      console.log('Student Time Generate: Missing required fields')
      return new Response(JSON.stringify({ error: 'topic and resourceType are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!LOVABLE_API_KEY) {
      console.error('Student Time Generate: LOVABLE_API_KEY not set')
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompts: Record<string, string> = {
      quiz: `Generate 10 quiz questions about "${topic}". Format each as "**Q#.** question" followed by the answer on a new line starting with "Answer: ". Separate with "---".`,
      homework: `Generate 8 homework/assignment-style questions about "${topic}". Include a mix of short answer, essay, and problem-solving questions. Number them clearly.`,
      speech: `Write a clear, engaging study explanation about "${topic}" as if explaining to a student. Use analogies, examples, and clear structure with headings. Keep it around 500 words.`,
      videos: `Suggest 8 educational YouTube video recommendations for learning about "${topic}". For each provide:\n- **Title**: descriptive title\n- **Topic**: specific subtopic covered\n- **Search URL**: YouTube search URL like https://www.youtube.com/results?search_query=encoded+topic`,
      research: `For the topic "${topic}", suggest 5 research paper ideas with:\n- **Title**: paper title\n- **Abstract**: 2-3 sentence abstract\n- **Methodology**: suggested approach\n- **Key Areas**: relevant subtopics to explore`,
      qa: `Generate 10 important theory questions and detailed answers about "${topic}". Format each as "**Q#: question**" followed by a thorough answer.`,
    }

    const prompt = prompts[resourceType]
    if (!prompt) {
      console.log('Student Time Generate: Invalid resourceType', resourceType)
      return new Response(JSON.stringify({ error: 'Invalid resourceType' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Student Time Generate: Calling AI API for resourceType', resourceType)
    const aiRes = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert academic tutor. Generate well-structured, accurate educational content.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('Student Time Generate: AI API error', err)
      throw new Error(`AI API error: ${err}`)
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || 'No content generated.'
    console.log('Student Time Generate: Content generated successfully, length:', content.length)

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Student Time Generate: Error', e.message)
    return new Response(JSON.stringify({ error: 'AI generation failed', details: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
