"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Design System ────────────────────────────────────────────────────────────
const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";
const TiffanyBorder = "rgba(10,186,181,0.25)";
const GlassBg = "rgba(255,255,255,0.05)";
const GlassBorder = "rgba(255,255,255,0.10)";
const GlassBlur = "blur(20px)";

const STATUS_COLORS: Record<string, string> = {
  active: "#0abab5",
  planning: "#e8a020",
  paused: "#6b7280",
  done: "#3dd68c",
};

const PROJECT_COLORS: Record<string, string> = {
  teal: "#0abab5",
  amber: "#e8a020",
  blue: "#4a9eff",
  green: "#3dd68c",
  purple: "#a78bfa",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "planning", label: "Planning" },
  { key: "paused", label: "Paused" },
  { key: "done", label: "Done" },
];

const SEED = [
  {
    id: "1",
    title: "Personal Brand Launch",
    desc: "Launch personal brand across Instagram and YouTube",
    color: "teal",
    status: "active",
    tag: "Growth",
    due: "2026-06-01",
    tasks: [
      { id: "t1", text: "Finalise branding guidelines", done: true },
      { id: "t2", text: "Write 30 days of content", done: false },
      { id: "t3", text: "Record onboarding Loom", done: false },
      { id: "t4", text: "Set up lead magnet", done: false },
    ],
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "2",
    title: "Mission Control v2",
    desc: "Build and launch Mission Control v2 with all new features",
    color: "blue",
    status: "active",
    tag: "Systems",
    due: "2026-04-30",
    tasks: [
      { id: "t1", text: "Leads kanban board", done: true },
      { id: "t2", text: "Content calendar", done: true },
      { id: "t3", text: "AI Studio integration", done: false },
      { id: "t4", text: "Loom transcript webhook", done: false },
    ],
    createdAt: "2026-03-10T00:00:00.000Z",
  },
  {
    id: "3",
    title: "Carly — May Competition",
    desc: "12-week prep for May 2026 bodybuilding competition",
    color: "purple",
    status: "active",
    tag: "Client Prep",
    due: "2026-05-15",
    tasks: [
      { id: "t1", text: "Initial assessment completed", done: true },
      { id: "t2", text: "Macros set", done: true },
      { id: "t3", text: "Training split designed", done: false },
      { id: "t4", text: "Contest prep timeline sent", done: false },
    ],
    createdAt: "2026-02-15T00:00:00.000Z",
  },
  {
    id: "4",
    title: "Communication System Rollout",
    desc: "Replace WhatsApp informal comms with structured system",
    color: "amber",
    status: "planning",
    tag: "Ops",
    due: "2026-04-08",
    tasks: [
      { id: "t1", text: "Document current pain points", done: true },
      { id: "t2", text: "Choose tools (Slack/Discord)", done: false },
      { id: "t3", text: "Write SOPs for client comms", done: false },
    ],
    createdAt: "2026-03-20T00:00:00.000Z",
  },
];

interface Task {
  id: string;
  text: string;
  done: boolean;
}

interface Project {
  id: string;
  title: string;
  desc: string;
  color: string;
  status: string;
  tag: string;
  due: string | null;
  tasks: Task[];
  createdAt: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function GlassModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(20, 20, 40, 0.95)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "28px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Input Styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "white",
  padding: "10px 14px",
  fontSize: "13px",
  fontFamily: "system-ui",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Project Form Modal ──────────────────────────────────────────────────────
interface ProjectFormData {
  title: string;
  desc: string;
  color: string;
  status: string;
  tag: string;
  due: string;
  tasks: Task[];
}

function ProjectFormModal({
  project,
  onSave,
  onClose,
}: {
  project?: Project | null;
  onSave: (data: ProjectFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectFormData>({
    title: project?.title ?? "",
    desc: project?.desc ?? "",
    color: project?.color ?? "teal",
    status: project?.status ?? "active",
    tag: project?.tag ?? "",
    due: project?.due ?? "",
    tasks: project?.tasks ? [...project.tasks] : [],
  });
  const [newTask, setNewTask] = useState("");

  function updateField<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    updateField("tasks", [...form.tasks, { id: `task-${Date.now()}`, text, done: false }]);
    setNewTask("");
  }

  function toggleTask(id: string) {
    updateField("tasks", form.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeTask(id: string) {
    updateField("tasks", form.tasks.filter(t => t.id !== id));
  }

  function handleSubmit() {
    onSave({ ...form, due: form.due || "" });
  }

  const COLORS = ["teal", "amber", "blue", "green", "purple"];
  const STATUSES = ["active", "planning", "paused", "done"];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "white", margin: 0 }}>
          {project ? "Edit Project" : "New Project"}
        </h2>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "18px", padding: "4px" }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Title */}
        <div>
          <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
            Title
          </label>
          <input
            value={form.title}
            onChange={e => updateField("title", e.target.value)}
            placeholder="Project title..."
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
            Description
          </label>
          <textarea
            value={form.desc}
            onChange={e => updateField("desc", e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }}
          />
        </div>

        {/* Color + Status row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
              Color
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateField("color", c)}
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: PROJECT_COLORS[c],
                    border: form.color === c ? `2px solid white` : "2px solid transparent",
                    cursor: "pointer",
                    outline: form.color === c ? `2px solid ${PROJECT_COLORS[c]}` : "none",
                    outlineOffset: "2px",
                    transition: "all 0.15s",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
              Status
            </label>
            <select
              value={form.status}
              onChange={e => updateField("status", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {STATUSES.map(s => (
                <option key={s} value={s} style={{ background: "#1a1a2e" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tag + Due row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
              Tag
            </label>
            <input
              value={form.tag}
              onChange={e => updateField("tag", e.target.value)}
              placeholder="e.g. Growth, Ops..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
              Due Date
            </label>
            <input
              type="date"
              value={form.due}
              onChange={e => updateField("due", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tasks */}
        <div>
          <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
            Tasks ({form.tasks.length})
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {form.tasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  style={{ accentColor: Tiffany, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{
                  flex: 1, fontFamily: "system-ui", fontSize: "13px",
                  color: task.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
                  textDecoration: task.done ? "line-through" : "none",
                }}>
                  {task.text}
                </span>
                <button
                  onClick={() => removeTask(task.id)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.20)", cursor: "pointer", fontSize: "12px", padding: "2px 4px", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
                placeholder="Add a task..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={addTask}
                style={{
                  background: TiffanySoft, border: `1px solid ${TiffanyBorder}`,
                  borderRadius: "12px", color: Tiffany, padding: "8px 14px",
                  fontSize: "12px", fontFamily: "system-ui", fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim()}
          style={{
            background: form.title.trim() ? Tiffany : "rgba(10,186,181,0.20)",
            border: "none",
            borderRadius: "14px",
            color: form.title.trim() ? "#000" : "rgba(255,255,255,0.35)",
            padding: "13px",
            fontSize: "14px",
            fontFamily: "system-ui",
            fontWeight: 700,
            cursor: form.title.trim() ? "pointer" : "not-allowed",
            width: "100%",
            marginTop: "4px",
          }}
        >
          {project ? "Save Changes" : "Create Project"}
        </button>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
      } else {
        // Seed Redis if empty
        for (const p of SEED) {
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
        }
        setProjects(SEED);
      }
    } catch {
      setProjects(SEED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function saveProject(formData: ProjectFormData) {
    const payload = {
      ...formData,
      due: formData.due || null,
    };

    if (editingProject) {
      // Update existing
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated: Project = await res.json();
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      // Create new
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created: Project = await res.json();
      setProjects(prev => [...prev, created]);
    }

    setShowModal(false);
    setEditingProject(null);
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  async function toggleTask(projectId: string, taskId: string) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = {
      ...project,
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    };
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const saved: Project = await res.json();
    setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setShowModal(true);
  }

  function openNew() {
    setEditingProject(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProject(null);
  }

  const filtered = filter === "all"
    ? projects
    : projects.filter(p => p.status === filter);

  const statusCount = (s: string) => projects.filter(p => p.status === s).length;

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: "system-ui",
    fontSize: "11px",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.10em",
    marginBottom: "16px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "rgba(10,10,20,1)", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "4px" }}>
              Mission Control
            </div>
            <h1 style={{ fontFamily: "system-ui", fontSize: "32px", fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.01em" }}>
              Projects
            </h1>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} total · {statusCount("active")} active
            </p>
          </div>
          <button
            onClick={openNew}
            style={{
              background: Tiffany,
              border: "none",
              borderRadius: "14px",
              color: "#000",
              padding: "11px 22px",
              fontSize: "13px",
              fontFamily: "system-ui",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              boxShadow: `0 4px 20px ${Tiffany}40`,
            }}
          >
            + New Project
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
          {FILTER_OPTIONS.map(opt => {
            const count = opt.key === "all" ? projects.length : statusCount(opt.key);
            const isActive = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                style={{
                  background: isActive ? TiffanySoft : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isActive ? TiffanyBorder : "rgba(255,255,255,0.10)"}`,
                  borderRadius: "999px",
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontFamily: "system-ui",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? Tiffany : "rgba(255,255,255,0.50)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
                <span style={{
                  background: isActive ? Tiffany : "rgba(255,255,255,0.08)",
                  color: isActive ? "#000" : "rgba(255,255,255,0.35)",
                  borderRadius: "999px",
                  padding: "1px 7px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.30)" }}>Loading projects...</p>
          </div>
        )}

        {/* Project grid */}
        {!loading && (
          <>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "20px" }}>
                <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>
                  No projects yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {filtered.map(project => {
                  const accentColor = PROJECT_COLORS[project.color] ?? Tiffany;
                  const statusColor = STATUS_COLORS[project.status] ?? Tiffany;
                  const doneTasks = project.tasks.filter(t => t.done).length;
                  const totalTasks = project.tasks.length;
                  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                  const isOverdue = project.due && new Date(project.due) < new Date() && project.status !== "done";

                  return (
                    <div
                      key={project.id}
                      style={{
                        background: GlassBg,
                        backdropFilter: GlassBlur,
                        border: `1px solid ${GlassBorder}`,
                        borderTop: `3px solid ${accentColor}`,
                        borderRadius: "18px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        transition: "transform 0.15s, box-shadow 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px rgba(0,0,0,0.4)`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "none";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      }}
                    >
                      {/* Top row: tag + status + actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {project.tag && (
                            <span style={{
                              background: `${accentColor}26`,
                              color: accentColor,
                              border: `1px solid ${accentColor}50`,
                              borderRadius: "999px",
                              padding: "2px 10px",
                              fontSize: "11px",
                              fontFamily: "system-ui",
                              fontWeight: 600,
                            }}>
                              {project.tag}
                            </span>
                          )}
                          <span style={{
                            background: `${statusColor}26`,
                            color: statusColor,
                            border: `1px solid ${statusColor}50`,
                            borderRadius: "999px",
                            padding: "2px 10px",
                            fontSize: "11px",
                            fontFamily: "system-ui",
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}>
                            {project.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            onClick={() => openEdit(project)}
                            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "12px", padding: "4px 6px", borderRadius: "6px" }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = Tiffany}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)"}
                            title="Edit project"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteProject(project.id)}
                            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.20)", cursor: "pointer", fontSize: "12px", padding: "4px 6px", borderRadius: "6px" }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#f87171"}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.20)"}
                            title="Delete project"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 style={{
                          fontFamily: "system-ui", fontSize: "17px", fontWeight: 700,
                          color: "rgba(255,255,255,0.92)", margin: "0 0 6px", lineHeight: 1.3,
                        }}>
                          {project.title}
                        </h3>
                        {project.desc && (
                          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)", margin: 0, lineHeight: 1.5 }}>
                            {project.desc}
                          </p>
                        )}
                      </div>

                      {/* Due date */}
                      {project.due && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px" }}>📅</span>
                          <span style={{
                            fontFamily: "system-ui",
                            fontSize: "11px",
                            color: isOverdue ? "#f87171" : "rgba(255,255,255,0.40)",
                            fontWeight: isOverdue ? 600 : 400,
                          }}>
                            {new Date(project.due + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            {isOverdue && " · Overdue"}
                          </span>
                        </div>
                      )}

                      {/* Progress bar */}
                      {totalTasks > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)" }}>
                              Tasks
                            </span>
                            <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", fontWeight: 600 }}>
                              {doneTasks}/{totalTasks} · {progressPct}%
                            </span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "999px", height: "5px", overflow: "hidden" }}>
                            <div style={{
                              width: `${progressPct}%`,
                              height: "100%",
                              background: project.status === "done" ? "#3dd68c" : accentColor,
                              borderRadius: "999px",
                              transition: "width 0.35s ease",
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Task list */}
                      {totalTasks > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {project.tasks.slice(0, 4).map(task => (
                            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button
                                onClick={() => toggleTask(project.id, task.id)}
                                style={{
                                  width: "16px", height: "16px", borderRadius: "50%",
                                  background: task.done ? accentColor : "transparent",
                                  border: `1.5px solid ${task.done ? accentColor : "rgba(255,255,255,0.25)"}`,
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s",
                                  padding: 0,
                                }}
                              >
                                {task.done && (
                                  <span style={{ color: "#000", fontSize: "9px", lineHeight: 1, fontWeight: 700 }}>✓</span>
                                )}
                              </button>
                              <span style={{
                                fontFamily: "system-ui", fontSize: "12px",
                                color: task.done ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.65)",
                                textDecoration: task.done ? "line-through" : "none",
                                flex: 1,
                              }}>
                                {task.text}
                              </span>
                            </div>
                          ))}
                          {totalTasks > 4 && (
                            <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", paddingLeft: "24px" }}>
                              +{totalTasks - 4} more tasks
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.20)", marginTop: "auto", paddingTop: "4px" }}>
                        Created {new Date(project.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <GlassModal onClose={closeModal}>
          <ProjectFormModal
            project={editingProject}
            onSave={saveProject}
            onClose={closeModal}
          />
        </GlassModal>
      )}
    </div>
  );
}
