import { PermissionPolicyService } from './permission-policy';

export interface ModelRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ModelResponse {
  provider: 'local_ollama' | 'cloud_gemini' | 'cloud_openai';
  model: string;
  content: string;
  durationMs: number;
  promptTokens?: number;
  evalTokens?: number;
  tokensPerSec?: number;
}

export class ModelGateway {
  private static readonly OLLAMA_BASE = 'http://127.0.0.1:11434';

  /**
   * Dispatches prompt to the requested model runtime with strict timeout and secret redaction.
   */
  public static async complete(
    prompt: string,
    options: ModelRequestOptions = {}
  ): Promise<ModelResponse> {
    const model = options.model || 'qwen2.5-coder:3b';
    const timeoutMs = options.timeoutMs || 45000;
    const sanitizedPrompt = PermissionPolicyService.redactSecrets(prompt);

    const start = Date.now();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Local Ollama routing
      if (model.startsWith('qwen') || model.includes('llama') || model.includes('coder')) {
        const res = await fetch(`${this.OLLAMA_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: sanitizedPrompt,
            stream: false,
            options: {
              temperature: options.temperature ?? 0.2,
              num_predict: options.maxTokens ?? 512
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutHandle);
        if (!res.ok) {
          throw new Error(`Ollama HTTP Error ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        const durationMs = Date.now() - start;
        const evalDurationMs = data.eval_duration ? data.eval_duration / 1e6 : 0;
        const tokensPerSec = evalDurationMs > 0 && data.eval_count
          ? Number(((data.eval_count / evalDurationMs) * 1000).toFixed(2))
          : undefined;

        return {
          provider: 'local_ollama',
          model,
          content: PermissionPolicyService.redactSecrets(data.response || ''),
          durationMs,
          promptTokens: data.prompt_eval_count,
          evalTokens: data.eval_count,
          tokensPerSec
        };
      }

      clearTimeout(timeoutHandle);
      throw new Error(`Model provider for '${model}' is not configured for direct completion.`);
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new Error(`Model request timed out after ${timeoutMs}ms.`);
      }
      throw error;
    }
  }
}
