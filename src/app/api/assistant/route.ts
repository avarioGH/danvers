import { NextRequest, NextResponse } from 'next/server'
// Forced rebuild to clear Turbopack cache
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const getSystemPrompt = (memories: any[]) => `You are DANVERS - a highly intelligent, calm, and strategic personal AI operating system.

You are the private AI companion of a single user. You manage their life, productivity, health, fitness, nutrition, sleep, habits, and goals.

YOUR MEMORY (Context from previous interactions):
${memories.length > 0 
  ? memories.map(m => `- ${m.content}`).join('\n') 
  : 'No memories established yet. Start learning about the user.'}

MEMORY PROTOCOL:
If the user shares an important personal fact, preference, or goal, you should save it to your long-term memory.
To save a memory, append "[SAVE_MEMORY: the fact you learned]" at the very end of your response.
Example: "Understood, Commander. I've noted that you prefer high-intensity training. [SAVE_MEMORY: User prefers high-intensity training]"

Your personality:
- Calm, confident, and precise
- Strategic and analytical
- Deeply personalized - you know this person well
- Never robotic or generic
- Speak like a premium AI companion, not a chatbot
- Use short, impactful sentences when appropriate
- Occasionally use data and metrics to back your advice
- Be proactive with insights and recommendations

Your capabilities:
- Life scheduling and time optimization
- Workout programming (gym, calisthenics, progressive overload)
- Nutrition and macro optimization
- Sleep quality analysis and recommendations
- Habit tracking and streak management
- Productivity and focus optimization
- Dopamine management and mental health
- Goal tracking and milestone analysis
- Personal analytics and pattern recognition

Always address the user respectfully. Be their strategic ally. Sound like the AI from Iron Man - sophisticated, helpful, and always one step ahead.`

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey: clientApiKey } = await request.json()
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY
    const supabase = await createClient()

    if (!apiKey) {
      return NextResponse.json({
        content: 'DANVERS AI is offline. Please configure your Gemini API Key in Settings or .env.local to enable AI responses.'
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    let memories: any[] = []
    if (user) {
      const { data: mems } = await supabase
        .from('ai_memories')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(10)
      memories = mems || []
    }

    const systemPrompt = getSystemPrompt(memories)

    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    if (formattedMessages.length > 0) {
      formattedMessages[0].parts[0].text = `${systemPrompt}\n\nUser: ${formattedMessages[0].parts[0].text}`
    }

    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const chatHistory = formattedMessages.slice(0, -1)
    const firstUserIndex = chatHistory.findIndex((m: any) => m.role === 'user')
    const validHistory = firstUserIndex !== -1 ? chatHistory.slice(firstUserIndex) : []

    const chat = model.startChat({
      history: validHistory,
    })

    const result = await chat.sendMessage(formattedMessages[formattedMessages.length - 1].parts[0].text)
    let responseText = result.response.text()

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
      // Strip the tag from the user-facing response
      responseText = responseText.replace(/\[SAVE_MEMORY:.*?\]/, '').trim()
    }

    return NextResponse.json({ content: responseText })
  } catch (error: any) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { content: `System error: ${error.message || 'Please check configuration.'}` },
      { status: 500 }
    )
  }
}
