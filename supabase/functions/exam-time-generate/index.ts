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

function labelSyllabusContent(content: string) {
  return `SUBJECT/SYLLABUS CONTENT START\n${content.trim()}\nSUBJECT/SYLLABUS CONTENT END`
}

function labelSubjectTitle(title: string) {
  return `SUBJECT/TITLE START\n${title.trim()}\nSUBJECT/TITLE END`
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
    console.error('Exam Time Generate: AI API error', err)
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
    console.log('Exam Time Generate: Received request')
    const { syllabusContent, section, subject } = await req.json()
    console.log('Exam Time Generate: Payload received', { syllabusContentLength: syllabusContent?.length, section, subjectLength: subject?.length })

    const hasSyllabus = typeof syllabusContent === 'string' && syllabusContent.trim().length > 0
    const hasSubject = typeof subject === 'string' && subject.trim().length > 0
    if (!section || (!hasSyllabus && !hasSubject)) {
      console.log('Exam Time Generate: Missing required fields')
      return new Response(JSON.stringify({ error: 'section and either syllabusContent or subject are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!LOVABLE_API_KEY) {
      console.error('Exam Time Generate: LOVABLE_API_KEY not set')
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentSource = hasSyllabus
      ? labelSyllabusContent(syllabusContent)
      : labelSubjectTitle(subject)
    const prompts: Record<string, string> = {
      questions: `Generate 10 important exam questions with detailed answers based only on the syllabus below. Number each question from 1 to 10 and provide a clear exam-style answer after each question.`,
      quiz: `Generate 10 short quiz questions based only on the syllabus below. After each question, put the answer on the next line beginning with "Answer:".`,
      mcq: `Generate exactly 20 multiple choice questions based only on the syllabus below. Do not write everything in one paragraph. Use this exact markdown format:\n\nHere are 20 MCQs on ${subject?.trim() || 'this topic'}:\n\n**1. Question text?**\n\nA) Option one  \nB) Option two  \nC) Option three  \nD) Option four  \n\n**Answer: B) Correct option**\n\n---\n\n**2. Question text?**\n\nA) Option one  \nB) Option two  \nC) Option three  \nD) Option four  \n\n**Answer: C) Correct option**\n\nContinue with the same structure for all 20 MCQs. Separate every MCQ with "---".`,
      summary: `Create a topic-wise revision summary based only on the syllabus below. Use headings and bullet points for the main concepts.`,
      videos: `Suggest 8 educational YouTube search topics based only on the syllabus below. For each, include a title, a short explanation, and a sample YouTube search URL.`,
    }

    const promptTemplate = prompts[section]
    if (!promptTemplate) {
      console.log('Exam Time Generate: Invalid section', section)
      return new Response(JSON.stringify({ error: 'Invalid section' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userPrompt = `${promptTemplate}\n\n${contentSource}`
    const messages = [
      { role: 'system', content: SAFE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    console.log('Exam Time Generate: Calling AI API for section', section)
    let content = await callLovable(messages)

    if (isRefusalText(content)) {
      console.warn('Exam Time Generate: Refusal detected, retrying with stronger safe academic prompt')
      content = await callLovable([
        { role: 'system', content: SAFE_SYSTEM_PROMPT },
        { role: 'system', content: SAFE_RETRY_PROMPT },
        { role: 'user', content: userPrompt },
      ])
    }

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
