import { NextResponse } from 'next/server';

export async function GET() {
  const providers: Record<string, unknown> = {
    local_ollama: {
      endpoint: 'http://127.0.0.1:11434',
      status: 'checking'
    },
    cloud_gemini: {
      status: process.env.GEMINI_API_KEY ? 'configured' : 'missing_key'
    },
    cloud_openai: {
      status: process.env.OPENAI_API_KEY ? 'configured' : 'missing_key'
    }
  };

  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      providers.local_ollama = {
        endpoint: 'http://127.0.0.1:11434',
        status: 'online',
        models: data.models?.map((m: { name: string; size: number }) => ({
          name: m.name,
          sizeBytes: m.size
        }))
      };
    } else {
      providers.local_ollama = {
        endpoint: 'http://127.0.0.1:11434',
        status: 'error',
        statusCode: res.status
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    providers.local_ollama = {
      endpoint: 'http://127.0.0.1:11434',
      status: 'offline',
      error: error.message
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    providers
  });
}
