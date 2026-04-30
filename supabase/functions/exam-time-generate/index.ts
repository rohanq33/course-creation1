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
    console.log('Exam Time Generate: Received request')
    const { syllabusContent, section } = await req.json()
    console.log('Exam Time Generate: Payload received', { syllabusContentLength: syllabusContent?.length, section })

    if (!syllabusContent || !section) {
      console.log('Exam Time Generate: Missing required fields')
      return new Response(JSON.stringify({ error: 'syllabusContent and section are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!LOVABLE_API_KEY) {
      console.error('Exam Time Generate: LOVABLE_API_KEY not set')
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompts: Record<string, string> = {
      questions: `Based on the following syllabus topics, generate 10 important exam questions with detailed answers. Format each as "**Q#: question**" followed by the answer.\n\nSyllabus:\n${syllabusContent}`,
      quiz: `Based on the following syllabus, generate 8 short quiz questions. For each question, provide the answer on a new line starting with "Answer: ". Separate questions with "---".\n\nSyllabus:\n${syllabusContent}`,
      mcq: `Based on the following syllabus, generate 20 multiple choice questions. For each, format as:\n**Q#.** question\nA) option\nB) option\nC) option\nD) option\n**Correct: X**\n\nSyllabus:\n${syllabusContent}`,
      videos: `Based on the following syllabus topics, suggest 8 relevant educational YouTube video recommendations. For each, provide:\n- **Title**: descriptive title\n- **Topic**: which syllabus topic it covers\n- **Search URL**: a YouTube search URL like https://www.youtube.com/results?search_query=encoded+topic\n\nSyllabus:\n${syllabusContent}`,
      summary: `Based on the following syllabus, create a concise topic-wise revision summary. Use clear headings and bullet points for key concepts.\n\nSyllabus:\n${syllabusContent}`,
    }

    const prompt = prompts[section]
    if (!prompt) {
      console.log('Exam Time Generate: Invalid section', section)
      return new Response(JSON.stringify({ error: 'Invalid section' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Exam Time Generate: Calling AI API for section', section)
    const aiRes = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert academic exam preparation assistant. Generate well-structured, accurate study materials.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('Exam Time Generate: AI API error', err)
      throw new Error(`AI API error: ${err}`)
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || 'No content generated.'
    console.log('Exam Time Generate: Content generated successfully, length:', content.length)

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Exam Time Generate: Error', e.message)
    return new Response(JSON.stringify({ error: 'AI generation failed', details: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
