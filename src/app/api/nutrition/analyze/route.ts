import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType, apiKey: clientApiKey } = await request.json()
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured. Please set it in Settings.' }, { status: 500 })
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const prompt = `You are a professional AI nutritionist. Analyze this image of food and estimate the macronutrients.
Return ONLY a valid JSON object with the following structure (no markdown formatting, no code blocks, just raw JSON):
{
  "food_name": "A short, descriptive name of the meal",
  "calories": number (estimated total kcal),
  "protein_g": number (estimated total protein in grams),
  "carbs_g": number (estimated total carbs in grams),
  "fats_g": number (estimated total fats in grams)
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(err)
    }

    const data = await response.json()
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!textContent) {
      throw new Error("Failed to generate nutrition data.")
    }

    // Try parsing the JSON
    const parsed = JSON.parse(textContent)
    
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Nutrition AI analysis error:', error)
    return NextResponse.json(
      { error: `System error: ${error.message || 'Failed to analyze image'}` },
      { status: 500 }
    )
  }
}
