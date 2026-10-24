import { performance } from 'perf_hooks';

async function runBenchmark(modelName, prompt) {
  const start = performance.now();
  
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt: prompt,
      stream: false,
      options: {
        num_predict: 80,
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP Error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const end = performance.now();
  const totalDurationMs = Math.round(end - start);

  const evalDurationMs = data.eval_duration ? Math.round(data.eval_duration / 1e6) : undefined;
  const promptEvalDurationMs = data.prompt_eval_duration ? Math.round(data.prompt_eval_duration / 1e6) : undefined;
  const evalCount = data.eval_count;
  const tokensPerSec = (evalCount && evalDurationMs && evalDurationMs > 0)
    ? Number(((evalCount / evalDurationMs) * 1000).toFixed(2))
    : undefined;

  return {
    model: modelName,
    prompt,
    totalDurationMs,
    evalDurationMs,
    promptEvalDurationMs,
    evalCount,
    tokensPerSec,
    response: data.response
  };
}

async function main() {
  const model = process.argv[2] || 'qwen3-coder:latest';
  console.log(`Starting benchmark on model: ${model}...`);

  const prompt = 'Write a TypeScript function isEven(n: number): boolean with a brief docstring.';
  try {
    const res = await runBenchmark(model, prompt);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  }
}

main();
