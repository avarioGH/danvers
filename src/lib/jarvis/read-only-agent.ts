import fs from 'fs';
import path from 'path';
import { ModelGateway } from './model-gateway';
import { PermissionPolicyService } from './permission-policy';
import { TaskStore } from './task-store';
import { JarvisTask } from './types';

export interface ReadOnlyAnalysisReport {
  taskId: string;
  projectRoot: string;
  summary: string;
  structure: string[];
  findings: string[];
  proposedPlan: string[];
  modelUsed: string;
  durationMs: number;
}

export class ReadOnlyCodingAgent {
  /**
   * Executes a safe, read-only analysis of a workspace target and generates an engineering plan.
   */
  public static async analyze(task: JarvisTask, modelName = 'qwen2.5-coder:3b'): Promise<ReadOnlyAnalysisReport> {
    const root = path.resolve(task.scope.workspaceRoot);
    if (!fs.existsSync(root)) {
      throw new Error(`Workspace root '${root}' does not exist.`);
    }

    // Inspect files within workspace limit
    const files: string[] = [];
    const scanDir = (dir: string, depth = 0) => {
      if (depth > 2 || files.length > 50) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
        const full = path.join(dir, entry.name);
        const rel = path.relative(root, full);
        if (entry.isDirectory()) {
          scanDir(full, depth + 1);
        } else {
          files.push(rel);
        }
      }
    };
    scanDir(root);

    // Prompt the local model to analyze the task and project files
    const prompt = `You are Danvers Jarvis, an AI Senior Engineer.
Task: ${task.title}
Description: ${task.description || 'None'}
Workspace Files:
${files.slice(0, 30).map(f => `- ${f}`).join('\n')}

Analyze this task and provide:
1. Architectural impact assessment.
2. Step-by-step implementation plan.
3. List of exact files to modify.
Respond clearly with concise engineering bullets.`;

    await TaskStore.appendLog(task.id, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Analyzing project structure (${files.length} files scanned) using ${modelName}...`
    });

    const modelRes = await ModelGateway.complete(prompt, {
      model: modelName,
      maxTokens: 350,
      timeoutMs: 30000
    });

    await TaskStore.appendLog(task.id, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Analysis completed in ${modelRes.durationMs}ms at ${modelRes.tokensPerSec || 'N/A'} tokens/sec.`
    });

    return {
      taskId: task.id,
      projectRoot: root,
      summary: `Read-only analysis executed by ${modelRes.model}`,
      structure: files.slice(0, 15),
      findings: [
        `Scanned ${files.length} files in workspace.`,
        `Model latency: ${modelRes.durationMs}ms.`
      ],
      proposedPlan: modelRes.content.split('\n').filter(line => line.trim().length > 0),
      modelUsed: modelRes.model,
      durationMs: modelRes.durationMs
    };
  }
}
