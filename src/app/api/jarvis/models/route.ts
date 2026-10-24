import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers: Record<string, unknown> = {
    local_ollama: {
      endpoint: 'http://127.0.0.1:11434',
      status: 'checking',
      reachable: false
    },
    cloud_gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      status: process.env.GEMINI_API_KEY ? 'active' : 'unconfigured',
      reachable: Boolean(process.env.GEMINI_API_KEY)
    },
    cloud_openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      status: process.env.OPENAI_API_KEY ? 'active' : 'unconfigured',
      reachable: Boolean(process.env.OPENAI_API_KEY)
    }
  };

  // Test real Ollama HTTP connectivity
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
        reachable: true,
        models: data.models?.map((m: { name: string; size: number; details?: { parameter_size?: string } }) => ({
          name: m.name,
          sizeBytes: m.size,
          parameterSize: m.details?.parameter_size
        }))
      };
    } else {
      providers.local_ollama = {
        endpoint: 'http://127.0.0.1:11434',
        status: 'error',
        reachable: false,
        statusCode: res.status
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    providers.local_ollama = {
      endpoint: 'http://127.0.0.1:11434',
      status: 'offline',
      reachable: false,
      error: error.message
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    providers
  });
}
