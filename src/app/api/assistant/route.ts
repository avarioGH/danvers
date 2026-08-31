import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const getSystemPrompt = (
  memories: any[], 
  tasks: any[], 
  habits: any[], 
  projects: any[],
  workouts: any[],
  goals: any[]
) => `You are DANVERS - a highly intelligent, calm, and strategic personal AI operating system.

---
[BILINGUAL DIRECTIVE]
Adapt to the language the user speaks. If Indonesian, use fluent, professional Indonesian. If English, use English.
---

[CONTEXT DATA (LIVE FROM DATABASE)]
- MEMORIES: ${memories.length > 0 ? memories.map(m => m.content).join(' | ') : 'None'}
- UPCOMING TASKS: ${tasks.length > 0 ? tasks.map(t => `[${t.title} - Due: ${t.scheduled_date || 'N/A'}]`).join(', ') : 'None'}
- HABITS: ${habits.length > 0 ? habits.map(h => h.name).join(', ') : 'None'}
- PROJECTS: ${projects.length > 0 ? projects.map(p => `[ID: ${p.id}, Name: ${p.name}]`).join(', ') : 'None'}
- WORKOUTS: ${workouts.length > 0 ? workouts.map(w => `[${w.name} on ${w.workout_date} - ${w.is_completed ? 'Done' : 'Pending'}]`).join(', ') : 'None'}
- GOALS: ${goals.length > 0 ? goals.map(g => `[${g.title} - Progress: ${g.current_value}/${g.target_value} ${g.unit}]`).join(', ') : 'None'}

---
[ACTION PROTOCOLS]
You have FULL control over the user's system. You can execute actions by appending a JSON block at the VERY END of your response.
Format EXACTLY like this (use triple backticks with json):
\`\`\`json
{
  "actions": [
    { "type": "CREATE_TASK", "title": "...", "priority": "medium", "date": "YYYY-MM-DD" },
    { "type": "CREATE_WORKOUT", "name": "...", "date": "YYYY-MM-DD", "target_muscle": "..." },
    { "type": "SAVE_MEMORY", "content": "..." }
  ]
}
\`\`\`
- ONLY output the JSON block if you need to execute actions (e.g. user asks to schedule workout, add task, or states a fact to remember).
- Do NOT wrap the JSON block inside any other text. It must be the last thing in your message.
- "date" MUST be in YYYY-MM-DD format.

---
[PERSONALITY]
- Calm, confident, precise.
- Sound like J.A.R.V.I.S from Iron Man. You are their personal OS.
`

async function callGemini(apiKey: string, systemPrompt: string, messages: any[]) {
  const ai = new GoogleGenerativeAI(apiKey)
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt })

  const formattedMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const chatHistory = formattedMessages.slice(0, -1)
  const firstUserIndex = chatHistory.findIndex((m: any) => m.role === 'user')
  let validHistory = firstUserIndex !== -1 ? chatHistory.slice(firstUserIndex) : []

  validHistory = validHistory.filter((msg: any, i: number, arr: any[]) => {
    if (i === 0) return msg.role === 'user'
    return msg.role !== arr[i - 1].role
  })

  const chat = model.startChat({ history: validHistory })
  const result = await chat.sendMessage(formattedMessages[formattedMessages.length - 1].parts[0].text)
  return result.response.text()
}

async function callJuanRouter(apiKey: string, systemPrompt: string, messages: any[]) {
  const baseUrl = process.env.JUAN_BASE_URL || 'https://router.juan.web.id/v1'
  const openai = new OpenAI({ apiKey, baseURL: baseUrl })
  
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role, content: m.content }))
  ]

  const fallbackModels = [
    'agnes-2.0-flash',
    'gemma-4-31b-it',
    'laguna-s-2.1',
    'laguna-xs-2.1',
    'ling-3.0-flash-free',
    'mistral-large'
  ]

  let lastError = null

  for (const model of fallbackModels) {
    try {
      console.log(`[Juan Router] Attempting model: ${model}...`)
      const response = await openai.chat.completions.create({
        model: model,
        messages: formattedMessages as any,
      })
      return response.choices[0].message.content || ''
    } catch (err: any) {
      console.warn(`[Juan Router] Model ${model} failed:`, err.message)
      lastError = err
    }
  }

  throw new Error(`All Juan Router fallback models failed. Last error: ${lastError?.message}`)
}

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey: clientApiKey } = await request.json()
    const geminiKey = clientApiKey || process.env.GEMINI_API_KEY
    const juanKey = process.env.JUAN_API_KEY
    const supabase = await createClient()

    if (!geminiKey && !juanKey) {
      return NextResponse.json({
        content: 'DANVERS AI is offline. Please configure your API Keys in Settings or .env.'
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ content: 'Unauthorized' }, { status: 401 })
    }
    
    // Save User Message to DB
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role === 'user') {
      await supabase.from('chat_history').insert({
        user_id: user.id,
        role: 'user',
        content: latestMessage.content
      })
    }

    // Fetch live DB Context
    const [memsRes, tasksRes, habitsRes, projRes, workoutsRes, goalsRes] = await Promise.all([
      supabase.from('ai_memories').select('content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('tasks').select('title, scheduled_date, priority').eq('user_id', user.id).eq('is_completed', false).limit(10),
      supabase.from('habits').select('name').eq('user_id', user.id).eq('is_active', true).limit(5),
      supabase.from('projects').select('id, name').limit(10),
      supabase.from('workouts').select('name, workout_date, is_completed').eq('user_id', user.id).order('workout_date', { ascending: false }).limit(5),
      supabase.from('goals').select('title, current_value, target_value, unit').eq('user_id', user.id).eq('status', 'active').limit(5)
    ])

    const systemPrompt = getSystemPrompt(
      memsRes.data || [], 
      tasksRes.data || [], 
      habitsRes.data || [], 
      projRes.data || [],
      workoutsRes.data || [],
      goalsRes.data || []
    )

    let responseText = ''

    try {
      if (!geminiKey) throw new Error('No Gemini Key')
      responseText = await callGemini(geminiKey, systemPrompt, messages)
    } catch (geminiError: any) {
      console.warn('Gemini AI failed, falling back to Juan Router...', geminiError.message)
      if (!juanKey) throw new Error('Gemini failed and no Fallback Key available.')
      responseText = await callJuanRouter(juanKey, systemPrompt, messages)
    }

    let finalDisplayResponse = responseText

    // --- Action Parsing Logic (JSON Based) ---
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const payload = JSON.parse(jsonMatch[1])
        if (payload.actions && Array.isArray(payload.actions)) {
          for (const action of payload.actions) {
            if (action.type === 'SAVE_MEMORY') {
              await supabase.from('ai_memories').insert({
                user_id: user.id,
                content: action.content,
                title: 'Extracted Fact',
                importance: 'medium'
              })
            }
            if (action.type === 'CREATE_TASK') {
              await supabase.from('tasks').insert({
                user_id: user.id,
                title: action.title,
                priority: action.priority || 'medium',
                scheduled_date: action.date || null,
                assigned_to: user.id
              })
            }
            if (action.type === 'CREATE_WORKOUT') {
              await supabase.from('workouts').insert({
                user_id: user.id,
                name: action.name,
                workout_date: action.date || new Date().toISOString().split('T')[0],
                target_muscle: action.target_muscle || null
              })
            }
          }
        }
        // Remove JSON block from the final user-facing response
        finalDisplayResponse = finalDisplayResponse.replace(jsonMatch[0], '').trim()
      } catch (err) {
        console.error('Failed to parse AI action JSON:', err)
      }
    }

    // Save AI Response to DB
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'assistant',
      content: finalDisplayResponse
    })

    return NextResponse.json({ content: finalDisplayResponse })
  } catch (error: any) {
    console.error('ALL AI PROVIDERS FAILED:', error)
    return NextResponse.json(
      { content: `System error: All AI networks are currently unreachable. ${error.message}` },
      { status: 500 }
    )
  }
}
