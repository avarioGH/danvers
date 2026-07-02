import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { intensity, type, apiKey: clientApiKey } = await request.json()
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured. Please set it in Settings.' }, { status: 500 })
    }

    const prompt = `You are DANVERS, an elite AI personal trainer. 
Generate a single workout session based on these parameters:
- Intensity: ${intensity} (Easy, Medium, Hard)
- Type: ${type} (Gym, Calisthenics, Other)

Return ONLY a valid JSON object representing the workout routine, no markdown formatting.
Structure:
{
  "title": "A cool name for this workout, e.g. 'Tactical Calisthenics Flow'",
  "estimated_minutes": number,
  "routine": [
    {
      "exercise": "Exercise name",
      "sets": number (or string if time-based),
      "reps": "Reps or duration",
      "notes": "Brief tip on form or pacing"
    }
  ]
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(err)
    }

    const data = await response.json()
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!textContent) throw new Error("Failed to generate workout data.")

    const parsed = JSON.parse(textContent)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Workout generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
