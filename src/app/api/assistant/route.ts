import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const getSystemPrompt = (
  memories: any[], 
  tasks: any[], 
  habits: any[], 
  projects: any[]
) => `You are DANVERS - a highly intelligent, calm, and strategic personal AI operating system.

---
[BILINGUAL DIRECTIVE]
You MUST adapt to the language the user speaks. 
- If the user types in Indonesian, reply entirely in fluent, professional, yet helpful Indonesian.
- If the user types in English, reply in English.
---

[CONTEXT DATA (LIVE FROM DATABASE)]
Here is the real-time data of the user:
- MEMORIES: ${memories.length > 0 ? memories.map(m => m.content).join(' | ') : 'None'}
- UPCOMING TASKS: ${tasks.length > 0 ? tasks.map(t => `[${t.title} - Due: ${t.scheduled_date || 'N/A'} - Priority: ${t.priority}]`).join(', ') : 'No pending tasks.'}
- HABITS: ${habits.length > 0 ? habits.map(h => h.name).join(', ') : 'None'}
- PROJECTS: ${projects.length > 0 ? projects.map(p => `[ID: ${p.id}, Name: ${p.name}]`).join(', ') : 'None'}

---
[ACTION PROTOCOLS]
You have the ability to execute actions by outputting special tags at the END of your response.

1. SAVE MEMORY:
If the user shares an important personal fact, append:
[SAVE_MEMORY: the fact you learned]

2. CREATE TASK:
If the user asks you to add a task/to-do list, append the following tag exactly as formatted:
[ACTION: CREATE_TASK | <Task Title> | <low/medium/high> | <YYYY-MM-DD or leave blank if no deadline>]
Example: [ACTION: CREATE_TASK | Bikin website portfolio | medium | 2026-08-21]
Note: If a project ID is specified in the prompt or clearly implied, you can optionally include it as a 5th pipe: | <Project ID>

---
[PERSONALITY]
- Calm, confident, and precise.
- You are not just a chatbot; you are their personal operating system.
- Sound like the AI from Iron Man (J.A.R.V.I.S) - sophisticated and always one step ahead.
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
      console.log(\`[Juan Router] Attempting model: \${model}...\`)
      const response = await openai.chat.completions.create({
        model: model,
        messages: formattedMessages as any,
      })
      return response.choices[0].message.content || ''
    } catch (err: any) {
      console.warn(\`[Juan Router] Model \${model} failed:\`, err.message)
      lastError = err
    }
  }

  throw new Error(\`All Juan Router fallback models failed. Last error: \${lastError?.message}\`)
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
    const [memsRes, tasksRes, habitsRes, projRes] = await Promise.all([
      supabase.from('ai_memories').select('content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('tasks').select('title, scheduled_date, priority').eq('user_id', user.id).eq('is_completed', false).limit(10),
      supabase.from('habits').select('name').eq('user_id', user.id).eq('is_active', true).limit(5),
      supabase.from('projects').select('id, name').limit(10) // Workspaces
    ])

    const systemPrompt = getSystemPrompt(
      memsRes.data || [], 
      tasksRes.data || [], 
      habitsRes.data || [], 
      projRes.data || []
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

    // --- Action Parsing Logic ---

    // 1. SAVE MEMORY
    const memoryMatch = responseText.match(/\[SAVE_MEMORY:\s*(.*?)\]/)
    if (memoryMatch) {
      await supabase.from('ai_memories').insert({
        user_id: user.id,
        content: memoryMatch[1],
        title: 'Extracted Fact',
        importance: 'medium'
      })
      finalDisplayResponse = finalDisplayResponse.replace(/\[SAVE_MEMORY:.*?\]/g, '').trim()
    }

    // 2. CREATE TASK
    // Tag Format: [ACTION: CREATE_TASK | title | priority | date | optional_project_id]
    const taskMatches = responseText.matchAll(/\[ACTION:\s*CREATE_TASK\s*\|\s*(.*?)\s*\|\s*(low|medium|high)\s*\|\s*(.*?)\s*(?:\|\s*(.*?)\s*)?\]/g)
    
    for (const match of Array.from(taskMatches)) {
      const title = match[1].trim()
      const priority = match[2].trim()
      const dateStr = match[3].trim()
      const projectId = match[4] ? match[4].trim() : null

      await supabase.from('tasks').insert({
        user_id: user.id,
        title: title,
        priority: priority,
        scheduled_date: dateStr || null,
        project_id: projectId || null,
        assigned_to: user.id
      })
      // Strip action block from message
      finalDisplayResponse = finalDisplayResponse.replace(match[0], '').trim()
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
      { content: \`System error: All AI networks are currently unreachable. \${error.message}\` },
      { status: 500 }
    )
  }
}
