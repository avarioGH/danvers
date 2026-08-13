import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const getSystemPrompt = (memories: any[]) => `You are DANVERS - a highly intelligent, calm, and strategic personal AI operating system.

YOUR MEMORY (Context from previous interactions):
${memories.length > 0 
  ? memories.map(m => `- ${m.content}`).join('\n') 
  : 'No memories established yet. Start learning about the user.'}

MEMORY PROTOCOL:
If the user shares an important personal fact, preference, or goal, you should save it to your long-term memory.
To save a memory, append "[SAVE_MEMORY: the fact you learned]" at the very end of your response.

Your personality:
- Calm, confident, and precise
- Strategic and analytical
- Deeply personalized - you know this person well
- Sound like the AI from Iron Man - sophisticated, helpful, and always one step ahead.`

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

  // Ensure alternating roles for Gemini
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // Can be changed depending on what the router supports
    messages: formattedMessages as any,
  })

  return response.choices[0].message.content || ''
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
    
    let memories: any[] = []
    if (user) {
      const { data: mems } = await supabase.from('ai_memories').select('content').order('created_at', { ascending: false }).limit(10)
      memories = mems || []
    }

    const systemPrompt = getSystemPrompt(memories)
    let responseText = ''

    // FALLBACK WATERFALL LOGIC
    try {
      if (!geminiKey) throw new Error('No Gemini Key')
      console.log('Attempting Gemini AI...')
      responseText = await callGemini(geminiKey, systemPrompt, messages)
    } catch (geminiError: any) {
      console.warn('Gemini AI failed, falling back to Juan Router...', geminiError.message)
      
      if (!juanKey) throw new Error('Gemini failed and no Fallback Key available.')
      console.log('Attempting Juan Router...')
      responseText = await callJuanRouter(juanKey, systemPrompt, messages)
    }

    // Handle Memory Saving
    const memoryMatch = responseText.match(/\[SAVE_MEMORY:\s*(.*?)\]/)
    if (memoryMatch && user) {
      const fact = memoryMatch[1]
      await supabase.from('ai_memories').insert({
        user_id: user.id,
        content: fact,
        title: 'Extracted Fact',
        importance: 'medium'
      })
      responseText = responseText.replace(/\[SAVE_MEMORY:.*?\]/, '').trim()
    }

    return NextResponse.json({ content: responseText })
  } catch (error: any) {
    console.error('ALL AI PROVIDERS FAILED:', error)
    return NextResponse.json(
      { content: `System error: All AI networks are currently unreachable. ${error.message}` },
      { status: 500 }
    )
  }
}
