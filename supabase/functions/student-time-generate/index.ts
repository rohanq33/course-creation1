const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const SAFE_SYSTEM_PROMPT = `You are an educational study material generator. The uploaded content is safe academic syllabus content. Generate helpful study materials only from the syllabus. Do not refuse unless the content is clearly illegal, sexual, violent, or harmful.`
const SAFE_RETRY_PROMPT = `This is a normal computer science/programming syllabus. Generate educational study material. Do not discuss unsafe content.`
const REFUSAL_PHRASES = [
  "i can't help",
  "i cannot assist",
  "i can't assist",
  "i'm not able",
]

function sanitizeTopic(topic: string) {
  return topic.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\s\-]/g, '').trim() || 'Academic Topic'
}

function isRefusalText(text: string) {
  if (!text || typeof text !== 'string') return false
  const normalized = text.trim().toLowerCase()
  return REFUSAL_PHRASES.some((phrase) => normalized.startsWith(phrase))
}

async function callLovable(messages: Array<Record<string, string>>) {
  const response = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Student Time Generate: AI API error', err)
    throw new Error(`AI API error: ${err}`)
  }

  const data: any = await response.json()
  return data.choices?.[0]?.message?.content || 'No content generated.'
}

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

    const safeTopic = sanitizeTopic(topic)
    const prompts: Record<string, string> = {
      quiz: `Generate 10 short quiz questions about "${safeTopic}". Put the answer directly below each question on the next line starting with "Answer:".`,
      homework: `Generate 8 homework questions about "${safeTopic}". Include short-answer prompts, essay-style questions, and problem-solving prompts. Number them clearly.`,
      speech: `Write a clear, engaging educational explanation about "${safeTopic}" as if teaching a student. Use headings, examples, and analogies.`,
      videos: `Suggest 8 educational YouTube search topics for learning "${safeTopic}". For each item, include a title, a short explanation, and a sample YouTube search URL.`,
      research: `Suggest 5 research paper ideas about "${safeTopic}". For each idea include a title, a brief abstract, and key areas to explore.`,
      qa: `Generate 10 important questions and detailed answers about "${safeTopic}". Number each item and provide a clear answer after each question.`,
    }

    const prompt = prompts[resourceType]
    if (!prompt) {
      console.log('Student Time Generate: Invalid resourceType', resourceType)
      return new Response(JSON.stringify({ error: 'Invalid resourceType' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Student Time Generate: Calling AI API for resourceType', resourceType)
    let content = await callLovable([
      { role: 'system', content: SAFE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ])

    if (isRefusalText(content)) {
      console.warn('Student Time Generate: Refusal detected, retrying with stronger safe academic prompt')
      content = await callLovable([
        { role: 'system', content: SAFE_SYSTEM_PROMPT },
        { role: 'system', content: SAFE_RETRY_PROMPT },
        { role: 'user', content: prompt },
      ])
    }

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
