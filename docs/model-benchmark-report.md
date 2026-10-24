# DANVERS JARVIS — Local Model Benchmark Report

## Hardware Environment
- **GPU**: NVIDIA GeForce GTX 1650 (4,096 MiB VRAM)
- **CPU**: Intel Core i5-13400F (16 logical cores)
- **RAM**: 32 GB DDR4
- **Ollama Engine**: v0.40.3 on Windows 11

---

## Benchmark Comparison Matrix

| Metric | `qwen3-coder:latest` (30.5B MoE) | `qwen2.5-coder:3b` (3B Dense) | Speedup / Factor |
|---|---|---|---|
| **Model Size** | 18.5 GB (Q4_K_M) | 1.9 GB (Q4_K_M) | 9.7x lighter |
| **VRAM Fit** | Partial offload (~3.5 GB VRAM + ~15 GB RAM) | **100% fits in GPU VRAM** (~2.8 GB allocated) | Full GPU acceleration |
| **Prompt Eval Latency** | 24,118 ms | **262 ms** | **92x faster** |
| **Eval (Generation) Duration** | 15,708 ms (for 80 tokens) | **1,315 ms** (for 80 tokens) | **11.9x faster** |
| **Generation Speed** | 5.09 tokens/sec | **60.84 tokens/sec** | **11.9x faster** |
| **Total Roundtrip Latency** | 104,883 ms (cold load) | **3,908 ms** | **26.8x faster** |
| **Output Quality / Code Correctness** | 100% correct TypeScript | 100% correct TypeScript with JSDoc | Identical accuracy |

---

## Architectural Routing Recommendation

1. **Local Default (`qwen2.5-coder:3b`)**:
   - Primary engine for real-time interactive tasks, fast code completions, read-only AST parsing, and quick diff reviews.
   - Extremely responsive at **60.8 tokens/second** directly on the local GTX 1650 with sub-second prompt evaluation.
2. **Local Deep MoE (`qwen3-coder:latest`)**:
   - Secondary local fallback for complex logic when internet connectivity is disabled and cloud models cannot be contacted.
3. **Cloud Providers (Gemini / OpenAI)**:
   - Reserved for full-repository structural migrations, complex system refactoring, and multi-file architectural planning.
