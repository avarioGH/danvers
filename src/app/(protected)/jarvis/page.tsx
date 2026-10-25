'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal, ShieldAlert, Cpu, ListTodo, FolderGit2,
  Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Clock, ArrowUpRight, Check, X, Server, Layers, GitBranch,
  FileCode2, CheckCircle, Ban, Filter, Search, ChevronRight,
  Maximize2, Minimize2, PanelLeftClose, PanelLeft, PanelRightClose,
  PanelRight, FileText, Activity, AlertCircle, Copy, Laptop,
  HelpCircle, Eye, GitCommit, UserCheck, ShieldCheck, FolderPlus,
  Trash2, ChevronDown, File, Menu, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// Custom Refactored Modular Components
import { WorkerStatusBadge, getWorkerState } from '@/components/jarvis/WorkerStatusBadge';
import { SidebarNavigation } from '@/components/jarvis/SidebarNavigation';
import { DirectiveComposer } from '@/components/jarvis/DirectiveComposer';
import { TaskLifecycle } from '@/components/jarvis/TaskLifecycle';
import { ExecutionLogPanel } from '@/components/jarvis/ExecutionLogPanel';
import { ProjectContextInspector } from '@/components/jarvis/ProjectContextInspector';
import { ResponsiveNavigationDrawer } from '@/components/jarvis/ResponsiveNavigationDrawer';
import { Task, Project, WorkerTelemetry, ProviderStatus, FileTreeItem } from '@/lib/jarvis/types';

export default function JarvisAgentWorkspace() {
  // Navigation & Panel States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'workspace' | 'files' | 'tasks' | 'approvals' | 'workers' | 'projects' | 'ops'>('workspace');
  const [opsData, setOpsData] = useState<any>(null);
  const [loadingOps, setLoadingOps] = useState(false);

  // Backend Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<WorkerTelemetry[]>([]);
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Active Task & Selection
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Task Creation Form Inputs
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveDescription, setDirectiveDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState<Task['type']>('code_read');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('pc_worker_local');
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5-coder:3b');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Action States
  const [analyzingTaskId, setAnalyzingTaskId] = useState<string | null>(null);
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(null);

  // Filter & Search in Tasks List
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // File Explorer State
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Workspace Modal / Registration
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Fetch telemetry & state from backend
  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const [resTasks, resProjects, resModels, resWorkers] = await Promise.all([
        fetch('/api/jarvis/tasks'),
        fetch('/api/jarvis/projects'),
        fetch('/api/jarvis/models'),
        fetch('/api/jarvis/workers')
      ]);

      if (resTasks.ok) {
        const d = await resTasks.json();
        const incomingTasks: Task[] = d.tasks || [];
        setTasks(incomingTasks);
        if (!selectedTaskId && incomingTasks.length > 0) {
          setSelectedTaskId(incomingTasks[0].id);
        }
      }

      if (resProjects.ok) {
        const d = await resProjects.json();
        const incomingProjects: Project[] = d.projects || [];
        setProjects(incomingProjects);
        if (incomingProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(incomingProjects[0].rootPath);
        }
      }

      if (resModels.ok) {
        const d = await resModels.json();
        setProviders(d.providers || null);
      }

      if (resWorkers.ok) {
        const d = await resWorkers.json();
        setWorkers(d.workers || []);
      }

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to sync Jarvis workspace data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 7000);
    return () => clearInterval(interval);
  }, []);

  // Fetch file explorer tree when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingFiles(true);
    fetch(`/api/jarvis/files?root=${encodeURIComponent(selectedProjectId)}`)
      .then(res => res.json())
      .then(data => {
        setFileTree(data.items || []);
        setLoadingFiles(false);
      })
      .catch(err => {
        console.error('Failed to load file tree:', err);
        setLoadingFiles(false);
      });
  }, [selectedProjectId]);

  // Fetch file content when file is selected
  const handleSelectFile = (relPath: string) => {
    setSelectedFilePath(relPath);
    setFileContent(null);
    fetch(`/api/jarvis/files?root=${encodeURIComponent(selectedProjectId)}&file=${encodeURIComponent(relPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.content !== undefined) {
          setFileContent(data.content);
        } else {
          setFileContent(`[Error reading file: ${data.error || 'Unknown error'}]`);
        }
      })
      .catch(err => setFileContent(`[Fetch error: ${err.message}]`));
  };

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || tasks[0] || null;
  }, [tasks, selectedTaskId]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.rootPath === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const pendingApprovals = useMemo(() => {
    return tasks.filter(t => t.status === 'awaiting_approval' && t.approvalRequest?.status === 'pending');
  }, [tasks]);

  // Identify Windows Local Worker and compute status
  const windowsWorker = useMemo(() => {
    return workers.find(w => w.name.toLowerCase().includes('windows')) || null;
  }, [workers]);

  const windowsWorkerState = useMemo(() => {
    return getWorkerState(windowsWorker?.status, windowsWorker?.lastHeartbeat, 60000);
  }, [windowsWorker]);

  const onlineWorkersCount = useMemo(() => {
    return workers.filter(w => {
      const state = getWorkerState(w.status, w.lastHeartbeat, 60000);
      return state.state === 'online';
    }).length;
  }, [workers]);

  const localOllamaOnline = Boolean(providers?.local_ollama?.reachable);

  // Submit directive
  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveTitle.trim() || !selectedProjectId) return;

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch('/api/jarvis/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: directiveTitle.trim(),
          description: directiveDescription.trim(),
          type: selectedTaskType,
          permissionLevel: selectedTaskType === 'security_audit' ? 1 : selectedTaskType === 'code_edit' ? 2 : 1,
          workerId: selectedWorkerId,
          scope: {
            workspaceRoot: selectedProjectId,
            allowedPaths: selectedFilePath ? [selectedFilePath] : [],
            readOnly: selectedTaskType === 'code_read' || selectedTaskType === 'security_audit'
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit directive.');
      }

      const created = await res.json();
      setDirectiveTitle('');
      setDirectiveDescription('');
      setSubmitFeedback({ type: 'success', text: 'Directive registered to persistent queue.' });

      await fetchTelemetry();
      if (created.task?.id) {
        setSelectedTaskId(created.task.id);
      }
    } catch (err: unknown) {
      setSubmitFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run analysis / execution
  const handleTriggerAnalysis = async (taskId: string) => {
    setAnalyzingTaskId(taskId);
    try {
      const res = await fetch(`/api/jarvis/tasks/${taskId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(`Analysis Directive Failed: ${err.error}`);
      } else {
        await fetchTelemetry();
      }
    } catch (err: unknown) {
      alert(`Network error: ${(err as Error).message}`);
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  // Resolve approval
  const handleResolveApproval = async (taskId: string, approved: boolean) => {
    setResolvingApprovalId(taskId);
    try {
      const res = await fetch(`/api/jarvis/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_approval',
          approved,
          reason: approved ? 'Authorized by Operator via Workspace UI' : 'Rejected by Operator via Workspace UI'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Approval Authorization Failed: ${err.error}`);
      } else {
        await fetchTelemetry();
      }
    } catch (err: unknown) {
      alert(`Network error: ${(err as Error).message}`);
    } finally {
      setResolvingApprovalId(null);
    }
  };

  // Register New Workspace
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    try {
      const res = await fetch('/api/jarvis/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          rootPath: newProjectPath.trim(),
          description: newProjectDesc.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to add project: ${err.error}`);
        return;
      }

      const d = await res.json();
      setShowAddProjectModal(false);
      setNewProjectName('');
      setNewProjectPath('');
      setNewProjectDesc('');
      await fetchTelemetry();
      setSelectedProjectId(d.workspace.rootPath);
    } catch (err) {
      alert(`Network error: ${(err as Error).message}`);
    }
  };

  // Delete Custom Workspace
  const handleDeleteProject = async (id: string) => {
    if (!confirm('Remove workspace from Jarvis? (Files on disk will remain untouched)')) return;
    try {
      const res = await fetch(`/api/jarvis/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTelemetry();
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesStatus = taskFilterStatus === 'all' || t.status === taskFilterStatus;
      const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tasks, taskFilterStatus, searchQuery]);

  // Recursive tree component
  const renderTree = (items: FileTreeItem[]) => {
    return (
      <div className="space-y-0.5 font-mono text-xs">
        {items.map(item => (
          <div key={item.relativePath}>
            {item.isDirectory ? (
              <details className="group">
                <summary className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-neutral-800/40 cursor-pointer text-neutral-300">
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-open:rotate-90 transition-transform" />
                  <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate">{item.name}</span>
                </summary>
                <div className="pl-4 border-l border-neutral-800/60 ml-2">
                  {item.children && renderTree(item.children)}
                </div>
              </details>
            ) : (
              <button
                onClick={() => handleSelectFile(item.relativePath)}
                className={`w-full flex items-center justify-between py-1 px-2 rounded text-left transition ${
                  selectedFilePath === item.relativePath
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileCode2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="text-[10px] text-neutral-600 shrink-0">
                  {item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)}k` : ''}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-neutral-200 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* MOBILE TOP BAR (visible on < md) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#090d18]/95 border-b border-neutral-800/80 px-3 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>
          <span className="font-semibold text-xs tracking-wider text-neutral-100 flex items-center gap-1.5">
            DANVERS JARVIS
            <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              v1.0
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="px-2 py-1 rounded text-[11px] font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> OS
          </Link>
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`p-1.5 rounded-lg transition ${
              inspectorOpen
                ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/50'
                : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
            }`}
            title="Toggle Inspector"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      <ResponsiveNavigationDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        tasksCount={tasks.length}
        pendingApprovalsCount={pendingApprovals.length}
        workersCount={workers.length}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />

      {/* =========================================================================
          COLUMN A: LEFT SIDEBAR (DESKTOP)
          ========================================================================= */}
      <aside
        className={`hidden md:flex ${
          sidebarOpen ? 'w-64 min-w-[16rem]' : 'w-16 min-w-[4rem]'
        } flex-col justify-between border-r border-neutral-800/80 bg-[#090d18]/95 transition-all duration-300 ease-in-out z-20 backdrop-blur-md`}
      >
        <SidebarNavigation
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          tasksCount={tasks.length}
          pendingApprovalsCount={pendingApprovals.length}
          workersCount={workers.length}
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          activeProject={activeProject}
          onOpenAddProjectModal={() => setShowAddProjectModal(true)}
        />

        {/* Bottom System Telemetry Indicator with Freshness State */}
        <div className="p-3 border-t border-neutral-800/80 bg-[#060912]">
          {sidebarOpen ? (
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Windows Local:
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    windowsWorkerState.state === 'online'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                      : windowsWorkerState.state === 'stale'
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700/50'
                  }`}
                  title={windowsWorker?.lastHeartbeat ? `Heartbeat: ${new Date(windowsWorker.lastHeartbeat).toLocaleTimeString()}` : 'No heartbeat yet'}
                >
                  {windowsWorkerState.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-400" /> Contabo VPS:
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  ONLINE ({onlineWorkersCount} active)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Worker Telemetry Online">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          COLUMN B: MAIN WORKSPACE (DIRECTIVE COMPOSER, TASK PIPELINE, LOGS)
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#07090e] pt-12 md:pt-0">
        {/* Top Breadcrumb & Status Bar */}
        <header className="hidden md:flex h-12 border-b border-neutral-800/80 bg-[#090d18]/80 px-4 items-center justify-between shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 truncate">
              <span>Workspace</span>
              <span className="text-neutral-600">/</span>
              <span className="text-neutral-200 font-semibold">{activeProject?.name || 'Workspace Root'}</span>
            </span>
            {selectedFilePath && (
              <>
                <span className="text-neutral-600">/</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/50 text-cyan-300 border border-cyan-800/50 truncate">
                  {selectedFilePath}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Status Badges in Topbar */}
            <div className="hidden lg:flex items-center gap-2">
              <WorkerStatusBadge
                name="Windows Local"
                lastHeartbeat={windowsWorker?.lastHeartbeat}
                status={windowsWorker?.status}
                isWindows={true}
                compact={true}
              />
              <span className="text-neutral-700">|</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-300 border border-blue-800/40">
                VPS • Online
              </span>
            </div>

            <button
              onClick={fetchTelemetry}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800/80 transition text-neutral-300 disabled:opacity-50"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition"
              title={inspectorOpen ? 'Hide Right Inspector' : 'Open Right Inspector'}
            >
              {inspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Central Dynamic Content Switcher */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {activeNav === 'workspace' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Directive Submission Form */}
              <DirectiveComposer
                directiveTitle={directiveTitle}
                setDirectiveTitle={setDirectiveTitle}
                directiveDescription={directiveDescription}
                setDirectiveDescription={setDirectiveDescription}
                selectedTaskType={selectedTaskType}
                setSelectedTaskType={setSelectedTaskType}
                selectedWorkerId={selectedWorkerId}
                setSelectedWorkerId={setSelectedWorkerId}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                providers={providers}
                activeProjectName={activeProject?.name}
                selectedFilePath={selectedFilePath}
                onSubmit={handleCreateDirective}
                isSubmitting={isSubmitting}
                workerOnline={windowsWorkerState.state === 'online'}
                modelOnline={localOllamaOnline}
                isWindowsWorkspace={Boolean(activeProject?.rootPath && /^[a-zA-Z]:\\/.test(activeProject.rootPath))}
              />

              {submitFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs border flex items-center justify-between ${
                    submitFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}
                >
                  <span>{submitFeedback.text}</span>
                  <button
                    onClick={() => setSubmitFeedback(null)}
                    className="text-neutral-400 hover:text-neutral-200 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Directive Conversation / Inspection Stream */}
              {selectedTask ? (
                <div className="space-y-4">
                  {/* Task Header & Execution Lifecycle Timeline */}
                  <div className="bg-[#0b101c] border border-neutral-800/90 rounded-xl p-4 shadow-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              selectedTask.status === 'succeeded'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                : selectedTask.status === 'awaiting_approval'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60 animate-pulse'
                                : selectedTask.status === 'running'
                                ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                                : selectedTask.status === 'failed'
                                ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {selectedTask.status}
                          </span>
                          <span className="text-xs font-mono text-neutral-500">{selectedTask.id}</span>
                          <span className="text-xs text-neutral-600">•</span>
                          <span className="text-xs text-neutral-400 font-mono">
                            {new Date(selectedTask.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-100">{selectedTask.title}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {(selectedTask.status === 'queued' || selectedTask.status === 'assigned') && (
                          <button
                            onClick={() => handleTriggerAnalysis(selectedTask.id)}
                            disabled={analyzingTaskId === selectedTask.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-600/40 hover:bg-cyan-600/30 transition disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>
                              {analyzingTaskId === selectedTask.id ? 'Running Execution...' : 'Run Agent Execution'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Lifecycle Progress Bar */}
                    <TaskLifecycle task={selectedTask} />
                  </div>

                  {/* Pending Operator Approval Box if Blocked */}
                  {selectedTask.status === 'awaiting_approval' && selectedTask.approvalRequest && (
                    <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Action Blocked: Level 3 Operator Signoff Required</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {selectedTask.approvalRequest.id}
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/90 font-mono">
                        {selectedTask.approvalRequest.description}
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleResolveApproval(selectedTask.id, false)}
                          disabled={resolvingApprovalId === selectedTask.id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900/60 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Reject Directive
                        </button>
                        <button
                          onClick={() => handleResolveApproval(selectedTask.id, true)}
                          disabled={resolvingApprovalId === selectedTask.id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Authorize Execution
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Execution Logs & Diff Viewer Component */}
                  <ExecutionLogPanel task={selectedTask} />
                </div>
              ) : (
                <div className="bg-[#0b101c] border border-neutral-800/80 rounded-xl p-12 text-center text-neutral-500 text-xs">
                  No active directive selected. Choose a task from the Directives list or submit a new directive.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILE EXPLORER */}
          {activeNav === 'files' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-2">
                  <span className="text-xs font-mono font-semibold text-neutral-300 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-cyan-400" />
                    Project Tree
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {loadingFiles ? 'Scanning...' : `${fileTree.length} roots`}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingFiles ? (
                    <div className="text-neutral-500 text-xs text-center py-8 font-mono">
                      Scanning directory...
                    </div>
                  ) : fileTree.length > 0 ? (
                    renderTree(fileTree)
                  ) : (
                    <div className="text-neutral-500 text-xs text-center py-8 font-mono">
                      No files found in workspace root.
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 bg-[#0b101c] border border-neutral-800 rounded-xl p-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-2">
                  <span className="text-xs font-mono text-neutral-300 flex items-center gap-1.5 truncate">
                    <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedFilePath || 'Select a file to inspect'}</span>
                  </span>
                  {fileContent && (
                    <button
                      onClick={() => navigator.clipboard.writeText(fileContent)}
                      className="p-1 rounded text-neutral-400 hover:text-white"
                      title="Copy file content"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 bg-[#050811] border border-neutral-900 rounded-lg p-3 font-mono text-xs overflow-auto text-neutral-300">
                  {fileContent ? (
                    <pre className="whitespace-pre-wrap">{fileContent}</pre>
                  ) : (
                    <div className="text-neutral-600 text-center py-12">
                      Click any file in the tree to read its contents.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECTIVES & QUEUE */}
          {activeNav === 'tasks' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-neutral-100">Directives Pipeline</span>
                  <span className="text-xs font-mono text-neutral-500">({tasks.length} total)</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#070b13] border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <select
                    value={taskFilterStatus}
                    onChange={e => setTaskFilterStatus(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#070b13] border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="all">All States</option>
                    <option value="queued">Queued</option>
                    <option value="running">Running</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800/80">
                {filteredTasks.length === 0 ? (
                  <div className="p-12 text-center text-neutral-500 text-xs font-mono">
                    No directives found matching current filter.
                  </div>
                ) : (
                  filteredTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setActiveNav('workspace');
                      }}
                      className={`p-4 flex items-center justify-between hover:bg-neutral-800/30 transition cursor-pointer ${
                        selectedTaskId === t.id ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              t.status === 'succeeded'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : t.status === 'awaiting_approval'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                                : t.status === 'running'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                : t.status === 'failed'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs font-mono text-neutral-500">{t.id}</span>
                          <span className="text-xs text-neutral-600">•</span>
                          <span className="text-xs text-neutral-400 font-mono">
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-neutral-200">{t.title}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-neutral-500 px-2 py-1 rounded bg-[#070b13] border border-neutral-800">
                          {t.workerId || 'pc_worker_local'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OPERATOR APPROVALS */}
          {activeNav === 'approvals' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <ShieldAlert className="w-5 h-5" />
                  <h2 className="text-sm font-bold">Operator Authorization Queue</h2>
                </div>
                <p className="text-xs text-neutral-400">
                  Level 3 directives (e.g. branch promotions, production executions) require explicit operator review and cryptographic diff verification before committing.
                </p>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-12 text-center text-neutral-500 text-xs font-mono">
                  No actions currently pending operator authorization.
                </div>
              ) : (
                pendingApprovals.map(t => (
                  <div key={t.id} className="bg-[#0b101c] border border-amber-900/50 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                          SENSITIVE LEVEL 3 DIRECTIVE
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{t.approvalRequest?.action || t.title}</h3>
                        <p className="text-xs text-neutral-400">{t.approvalRequest?.description}</p>
                      </div>
                      <span className="text-xs font-mono text-neutral-500">{t.id}</span>
                    </div>

                    <div className="p-3 bg-[#070b13] rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300">
                      Target Entity: <span className="text-amber-400">{t.approvalRequest?.target || t.scope.workspaceRoot}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleResolveApproval(t.id, false)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900/60 transition"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleResolveApproval(t.id, true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60 transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Authorize Execution
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: WORKERS TELEMETRY */}
          {activeNav === 'workers' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-neutral-100">Registered Worker Daemons</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {onlineWorkersCount} active daemon(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map(w => {
                  const state = getWorkerState(w.status, w.lastHeartbeat, 60000);
                  return (
                    <div key={w.id} className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-neutral-200">{w.name}</div>
                          <div className="text-[10px] text-neutral-500">{w.id}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            state.state === 'online'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : state.state === 'stale'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}
                        >
                          {state.label}
                        </span>
                      </div>

                      <div className="text-[11px] space-y-1 text-neutral-400 border-t border-neutral-800/60 pt-2">
                        <div className="flex justify-between">
                          <span>Last Heartbeat:</span>
                          <span className="text-neutral-300">
                            {w.lastHeartbeat ? new Date(w.lastHeartbeat).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Lease:</span>
                          <span className="text-cyan-400">{w.currentTaskId || 'Idle'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {w.capabilities.map((cap: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-[#070b13] border border-neutral-800 rounded text-[9px] text-neutral-400">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: PROJECTS & SANDBOXES */}
          {activeNav === 'projects' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-neutral-100">Registered Sandbox Workspaces</span>
                </div>
                <button
                  onClick={() => setShowAddProjectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-mono hover:bg-cyan-600/30 transition"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-cyan-400 flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {p.git?.branch || 'main'}
                        </span>
                        {p.custom && (
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition"
                            title="Remove project registration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-mono text-neutral-400">{p.rootPath}</p>
                    <p className="text-xs text-neutral-500">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: JARVIS OPERATIONS & SECURITY AGENT */}
          {activeNav === 'ops' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    JARVIS Operations & Security Operations
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Continuous monitoring of VPS host resources, connected worker daemons, and non-destructive security audits.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    setLoadingOps(true);
                    try {
                      const res = await fetch('/api/jarvis/ops');
                      if (res.ok) {
                        const d = await res.json();
                        setOpsData(d);
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setLoadingOps(false);
                    }
                  }}
                  disabled={loadingOps}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold tracking-wide transition shadow-lg shadow-cyan-950/40 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOps ? 'animate-spin' : ''}`} />
                  {loadingOps ? 'Scanning Infrastructure...' : 'Run Diagnostics'}
                </button>
              </div>

              {/* Host Infrastructure Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Host Infrastructure</div>
                  <div className="text-sm font-bold text-neutral-100">{opsData?.host?.hostname || '194.233.85.181 (VPS)'}</div>
                  <div className="text-xs text-neutral-400 font-mono">Platform: {opsData?.host?.platform || 'linux'} (4 vCPU)</div>
                </div>

                <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Host Memory Utilization</div>
                  <div className="text-sm font-bold text-neutral-100">{opsData?.host?.memUsagePercent ? `${opsData.host.memUsagePercent}%` : 'Normal'}</div>
                  <div className="text-xs text-neutral-400 font-mono">Free RAM: {opsData?.host?.freeMemGb ? `${opsData.host.freeMemGb} GB` : 'Healthy'}</div>
                </div>

                <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Connected Worker Nodes</div>
                  <div className="text-sm font-bold text-cyan-400">{opsData?.workersCount || workers.length} Node(s) Monitored</div>
                  <div className="text-xs text-neutral-400 font-mono">Status: Continuous Heartbeat</div>
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-medium">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Security & Health Findings ({opsData?.findings?.length || 0})
                </h3>

                {(!opsData || !opsData.findings || opsData.findings.length === 0) ? (
                  <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-8 text-center text-neutral-500 font-mono text-xs">
                    Click &apos;Run Diagnostics&apos; above to initiate live asset telemetry check.
                  </div>
                ) : (
                  opsData.findings.map((f: any) => (
                    <div key={f.id} className="bg-[#0b101c] border border-neutral-800 rounded-xl p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            f.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                            f.severity === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            f.severity === 'medium' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                            'bg-cyan-950 text-cyan-400 border border-cyan-800'
                          }`}>
                            {f.severity}
                          </span>
                          <span className="text-xs font-bold text-white">{f.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">{f.asset}</span>
                      </div>

                      <div className="p-3 bg-[#070b13] rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300">
                        <span className="text-neutral-500 block mb-1">EVIDENCE:</span>
                        {f.evidence}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Impact:</span>
                          <p className="text-neutral-300">{f.impact}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Recommendation:</span>
                          <p className="text-neutral-300">{f.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          COLUMN C: RIGHT-SIDE CONTEXTUAL INSPECTOR
          ========================================================================= */}
      {inspectorOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setInspectorOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] md:static md:w-80 md:min-w-[20rem] border-l border-neutral-800/80 bg-[#0a0e19] flex flex-col justify-between overflow-y-auto z-50 md:z-20 backdrop-blur-md shadow-2xl md:shadow-none">
            <ProjectContextInspector
              activeProject={activeProject}
              selectedTask={selectedTask}
              workers={workers}
              selectedModel={selectedModel}
              onClose={() => setInspectorOpen(false)}
              onSelectFile={handleSelectFile}
            />
          </aside>
        </>
      )}

      {/* MODAL: REGISTER NEW PROJECT WORKSPACE */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b101c] border border-neutral-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-cyan-400" /> Register Local Project Folder
              </h3>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">PROJECT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP Kayu"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070b13] border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">CANONICAL FOLDER PATH</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. D:\Projects\ERP-Kayu"
                  value={newProjectPath}
                  onChange={e => setNewProjectPath(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070b13] border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">DESCRIPTION (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Core manufacturing inventory module"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070b13] border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-1.5 text-neutral-400 hover:text-neutral-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition"
                >
                  Register Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
