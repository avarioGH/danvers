import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

async function callGemini(apiKey: string, prompt: string) {
  const ai = new GoogleGenerativeAI(apiKey)
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callJuanRouter(apiKey: string, prompt: string) {
  const baseUrl = process.env.JUAN_BASE_URL || 'https://router.juan.web.id/v1'
  const openai = new OpenAI({ apiKey, baseURL: baseUrl })
  
  const response = await openai.chat.completions.create({
    model: 'agnes-2.0-flash', // We can just use the primary fallback
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" }
  })
  
  return response.choices[0].message.content || '{}'
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectId, creatorId, users } = await request.json()
    const geminiKey = process.env.GEMINI_API_KEY
    const juanKey = process.env.JUAN_API_KEY

    if (!geminiKey && !juanKey) {
      return NextResponse.json({ error: 'No AI configured' }, { status: 500 })
    }

    const systemPrompt = `You are an AI Project Manager. The user wants to generate tasks for a project.
Available users for assignment (Array of objects):
${JSON.stringify(users)}

User Prompt: "${prompt}"

Your job is to break down the request into 3-7 actionable tasks.
For each task, decide:
1. title (string)
2. description (string, be clear)
3. priority (string, strictly one of: "low", "medium", "high")
4. assigned_to (string, UUID from the available users list that best fits, or default to ${creatorId} if unsure)
5. scheduled_date (string, format YYYY-MM-DD, pick a reasonable date within the next 14 days)

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with a single root key "tasks", which contains an array of these task objects.
Example:
{
  "tasks": [
    {
      "user_id": "${creatorId}",
      "project_id": "${projectId}",
      "title": "Setup database",
      "description": "Initialize postgres",
      "priority": "high",
      "assigned_to": "uuid-here",
      "scheduled_date": "2026-08-25"
    }
  ]
}`

    let aiResponseText = ''

    try {
      if (!geminiKey) throw new Error('No Gemini')
      aiResponseText = await callGemini(geminiKey, systemPrompt)
    } catch (e) {
      console.warn('Gemini failed for task generation, trying Juan...')
      if (!juanKey) throw new Error('No fallback AI')
      aiResponseText = await callJuanRouter(juanKey, systemPrompt)
    }

    // Clean JSON response (sometimes APIs wrap in ```json)
    aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(aiResponseText)

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('AI returned invalid format')
    }

    // Ensure all required fields are injected
    const finalTasks = parsed.tasks.map((t: any) => ({
      ...t,
      project_id: projectId,
      user_id: creatorId
    }))

    return NextResponse.json(finalTasks)
  } catch (error: any) {
    console.error('Task Gen Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
