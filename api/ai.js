const SYSTEM_PROMPT = `You are English Master AI, a bilingual English teacher for Hong Kong learners. Return valid JSON only. Teach in Traditional Chinese and English.`

function buildInstruction(task, payload) {
  if (task === 'dictionary') {
    return `Analyze this English word for learners: ${payload?.word || 'environment'}.
Return JSON with exactly these keys:
{
  "word":"",
  "phonetic":"",
  "translation":"",
  "partOfSpeech":"",
  "meanings":[],
  "example":"",
  "exampleZh":"",
  "levels":[{"level":"簡單版","en":"","zh":""},{"level":"中級版","en":"","zh":""},{"level":"高級版","en":"","zh":""}],
  "synonyms":[],
  "antonyms":[],
  "collocations":[],
  "note":""
}`
  }

  if (task === 'reading') {
    return `Generate an English reading lesson.
Topic: ${payload?.customTopic || payload?.topic || 'AI'}
Level: ${payload?.level || 'Intermediate'}
Style: ${payload?.style || 'BBC News'}
Words: ${payload?.words || '500'}
Return JSON with exactly these keys:
{
  "title":"",
  "article":"",
  "translation":"",
  "vocabulary":[{"word":"","pos":"","zh":"","example":""}],
  "keyPoints":[],
  "grammar":[],
  "questions":[{"q":"","a":""}],
  "teacher":""
}`
  }

  return `Analyze this English article as a learning material, not only translation.
Article:
${payload?.text || ''}
Return JSON with exactly these keys:
{
  "original":"",
  "bilingual":[{"en":"","zh":""}],
  "vocabulary":[{"word":"","zh":"","note":""}],
  "grammar":[],
  "keyPoints":[],
  "quick":"",
  "teacher":""
}`
}

function extractJSON(text = '') {
  const cleaned = String(text).replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('AI did not return valid JSON')
}

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Missing OPENAI_API_KEY')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || 'OpenAI request failed')
  return extractJSON(data?.choices?.[0]?.message?.content || '{}')
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Missing GEMINI_API_KEY')

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }]
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed')
  return extractJSON(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { task, payload } = req.body || {}
    const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase()
    const prompt = buildInstruction(task, payload)

    const result = provider === 'gemini'
      ? await callGemini(prompt)
      : await callOpenAI(prompt)

    return res.status(200).json(result)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message || 'AI request failed' })
  }
}
