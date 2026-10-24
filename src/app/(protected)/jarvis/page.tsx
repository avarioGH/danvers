'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldAlert, Cpu, ListTodo, FolderGit2, 
  Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, 
  Clock, ArrowUpRight, Check, X, Server
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  permissionLevel: number;
  scope: { workspaceRoot: string; allowedPaths: string[] };
  createdAt: string;
  approvalRequest?: {
    id: string;
    action: string;
    target: string;
    description: string;
    status: string;
  };
}

interface Project {
  id: string;
  name: string;
  rootPath: string;
  git: { branch: string; clean: boolean };
}

interface ProviderStatus {
  local_ollama?: {
    status: string;
    reachable: boolean;
    models?: Array<{ name: string; sizeBytes: number }>;
  };
  cloud_gemini?: { status: string; configured: boolean };
  cloud_openai?: { status: string; configured: boolean };
}

export default function JarvisEngineeringDashboard() {
  const [activeTab, setActiveTab] = useState<'command' | 'tasks' | 'approvals' | 'models' | 'projects'>('command');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingTaskId, setAnalyzingTaskId] = useState<string | null>(null);

  // Command inputs
  const [commandTitle, setCommandTitle] = useState('');
  const [commandDesc, setCommandDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen2.5-coder:3b');
  const [taskType, setTaskType] = useState<'code_read' | 'code_edit' | 'security_audit'>('code_read');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [resTasks, resProjects, resModels] = await Promise.all([
        fetch('/api/jarvis/tasks'),
        fetch('/api/jarvis/projects'),
        fetch('/api/jarvis/models')
      ]);

      if (resTasks.ok) {
        const d = await resTasks.json();
        setTasks(d.tasks || []);
      }
      if (resProjects.ok) {
        const d = await resProjects.json();
        setProjects(d.projects || []);
        if (d.projects?.length > 0 && !selectedProject) {
          setSelectedProject(d.projects[0].rootPath);
        }
      }
      if (resModels.ok) {
        const d = await resModels.json();
        setProviders(d.providers || null);
      }
    } catch (e) {
      console.error('Error fetching Jarvis data:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandTitle.trim() || !selectedProject) return;

    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/jarvis/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: commandTitle,
          description: commandDesc,
          type: taskType,
          permissionLevel: taskType === 'security_audit' ? 1 : 2,
          scope: {
            workspaceRoot: selectedProject,
            allowedPaths: []
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit task');
      }

      setCommandTitle('');
      setCommandDesc('');
      setFeedbackMsg({ type: 'success', text: 'Task successfully registered to persistent queue.' });
      fetchDashboardData();
    } catch (err: unknown) {
      setFeedbackMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (taskId: string) => {
    setAnalyzingTaskId(taskId);
    try {
      const res = await fetch(`/api/jarvis/tasks/${taskId}/analyze`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Analysis failed: ${err.error}`);
      } else {
        fetchDashboardData();
      }
    } catch (err: unknown) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  const handleResolveApproval = async (taskId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/jarvis/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_approval',
          approved,
          reason: approved ? 'Operator approved from Command Center' : 'Operator rejected from Command Center'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      } else {
        fetchDashboardData();
      }
    } catch (err: unknown) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const pendingApprovals = tasks.filter(t => t.status === 'awaiting_approval' && t.approvalRequest?.status === 'pending');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              DANVERS JARVIS <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">v1.0.0</span>
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Personal Autonomous AI Engineering & System Control Node
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-neutral-300">PC Worker:</span>
            <span className="text-emerald-400 font-medium">ONLINE (Windows 11)</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto flex gap-2 pt-6 pb-6 overflow-x-auto">
        {[
          { key: 'command', label: 'Command Center', icon: Terminal },
          { key: 'tasks', label: `Task Queue (${tasks.length})`, icon: ListTodo },
          { key: 'approvals', label: `Approval Center (${pendingApprovals.length})`, icon: ShieldAlert, badge: pendingApprovals.length > 0 },
          { key: 'models', label: 'Models & Providers', icon: Cpu },
          { key: 'projects', label: 'Projects & Workspaces', icon: FolderGit2 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition shrink-0 ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* 1. COMMAND CENTER TAB */}
        {activeTab === 'command' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Submission Box */}
            <div className="lg:col-span-2 bg-neutral-900/40 border border-neutral-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> Dispatch Engineering Directive
              </h2>

              {feedbackMsg && (
                <div className={`p-3 rounded-lg text-sm mb-4 border ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'
                }`}>
                  {feedbackMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Directive / Task Goal</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit API routes for input sanitization and create plan"
                    value={commandTitle}
                    onChange={e => setCommandTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Context & Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific constraints, instructions or relevant subsystems..."
                    value={commandDesc}
                    onChange={e => setCommandDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Target Project</label>
                    <select
                      value={selectedProject}
                      onChange={e => setSelectedProject(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.rootPath}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Execution Mode</label>
                    <select
                      value={taskType}
                      onChange={e => setTaskType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="code_read">Level 1: Read-Only Analysis</option>
                      <option value="code_edit">Level 2: Controlled Code Edit</option>
                      <option value="security_audit">Level 1: Security Audit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Inference Engine</label>
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="qwen2.5-coder:3b">Local: Qwen 2.5 Coder 3B (GPU ~60 t/s)</option>
                      <option value="qwen3-coder:latest">Local: Qwen 3 Coder 30.5B MoE</option>
                      <option value="gemini-1.5-pro">Cloud: Gemini 1.5 Pro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" /> Submit to Queue
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Status Sidebar */}
            <div className="space-y-6">
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Model Engine Status</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800/60">
                    <span className="text-neutral-300">Local Ollama</span>
                    <span className={`px-2 py-0.5 rounded font-medium ${providers?.local_ollama?.reachable ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                      {providers?.local_ollama?.reachable ? 'Online (GTX 1650)' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800/60">
                    <span className="text-neutral-300">Fast Coding Model</span>
                    <span className="text-cyan-400 font-mono">qwen2.5-coder:3b</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-neutral-300">Cloud Gemini API</span>
                    <span className="text-neutral-400 font-mono">
                      {providers?.cloud_gemini?.configured ? 'Active' : 'Missing Key'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Boundary Notice */}
              <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Autonomy Level 1 Enforced
                </h3>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Direct arbitrary shell execution is disabled. The agent operates exclusively in safe read-only analysis or controlled workspace edits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. TASK QUEUE TAB */}
        {activeTab === 'tasks' && (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">Execution Queue & History</h2>
              <span className="text-xs text-neutral-400">{tasks.length} total tasks registered</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-sm">
                No tasks submitted yet. Submit a task from the Command Center.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {tasks.map(t => (
                  <div key={t.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-neutral-900/30 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${
                          t.status === 'succeeded' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.status === 'awaiting_approval' ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse' :
                          t.status === 'running' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          t.status === 'failed' ? 'bg-red-950 text-red-400 border border-red-800' :
                          'bg-neutral-800 text-neutral-300'
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-xs font-mono text-neutral-500">{t.id}</span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-neutral-400">{new Date(t.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="text-sm font-medium text-neutral-200">{t.title}</h4>
                      <p className="text-xs text-neutral-400 line-clamp-1">{t.description || 'No description provided.'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {(t.status === 'queued' || t.status === 'assigned') && (
                        <button
                          onClick={() => handleRunAnalysis(t.id)}
                          disabled={analyzingTaskId === t.id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-cyan-600/20 text-cyan-400 border border-cyan-600/40 hover:bg-cyan-600/30 transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {analyzingTaskId === t.id ? 'Running Analysis...' : 'Run Agent Analysis'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. APPROVAL CENTER TAB */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> Pending Authorizations
              </h2>
              <p className="text-xs text-neutral-400">
                Sensitive operations (Level 3) halt task execution until an operator explicitly authorizes the request.
              </p>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-xl p-12 text-center text-neutral-500 text-sm">
                No sensitive operations currently awaiting approval.
              </div>
            ) : (
              pendingApprovals.map(t => {
                const req = t.approvalRequest!;
                return (
                  <div key={req.id} className="bg-neutral-900/60 border border-amber-900/40 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                          LEVEL 3 SENSITIVE ACTION
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{req.action}</h3>
                        <p className="text-xs text-neutral-400">{req.description}</p>
                      </div>
                      <span className="text-xs font-mono text-neutral-500">{req.id}</span>
                    </div>

                    <div className="bg-neutral-950 p-3 rounded border border-neutral-800 font-mono text-xs text-neutral-300">
                      Target Entity: <span className="text-amber-400">{req.target}</span>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleResolveApproval(t.id, false)}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900 transition"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleResolveApproval(t.id, true)}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Authorize Execution
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 4. MODELS & PROVIDERS TAB */}
        {activeTab === 'models' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> Local Ollama Engine
              </h3>
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-400">Endpoint</span>
                  <span className="font-mono text-neutral-200">http://127.0.0.1:11434</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-400">Status</span>
                  <span className="text-emerald-400 font-medium">Connected & Active</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-400">Hardware Acceleration</span>
                  <span className="text-cyan-400 font-medium">NVIDIA GTX 1650 (CUDA 13.3)</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-medium text-neutral-300 mb-2">Available Models:</h4>
                <div className="space-y-1.5">
                  {providers?.local_ollama?.models?.map(m => (
                    <div key={m.name} className="flex justify-between items-center p-2 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono">
                      <span className="text-neutral-200">{m.name}</span>
                      <span className="text-neutral-500">{(m.sizeBytes / 1e9).toFixed(1)} GB</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" /> Cloud AI Providers
              </h3>
              <div className="text-xs space-y-3">
                <div className="p-3 rounded bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-neutral-200">Google Gemini</div>
                    <div className="text-neutral-500 text-[10px]">Architectural planning & deep reasoning</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${providers?.cloud_gemini?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'}`}>
                    {providers?.cloud_gemini?.configured ? 'Configured' : 'Unconfigured'}
                  </span>
                </div>

                <div className="p-3 rounded bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-neutral-200">OpenAI</div>
                    <div className="text-neutral-500 text-[10px]">Fallback cloud coding model</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${providers?.cloud_openai?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'}`}>
                    {providers?.cloud_openai?.configured ? 'Configured' : 'Unconfigured'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-cyan-400" /> Registered Project Sandboxes
            </h2>
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.id} className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-cyan-400">
                      Branch: {p.git?.branch || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">{p.rootPath}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
