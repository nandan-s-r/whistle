"use client";

import { apiFetch } from "@/lib/apiClient";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface StartupCore {
  id: number;
  name: string;
  sector: string;
  stage: string;
  location: string;
  website: string;
  description: string;
  pipeline_stage: string;
  ai_score: number;
  investment_verdict: string;
  revenue_arr?: string;
  valuation?: string;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: string;
  priority: string;
}

export default function StartupProfile() {
  const params = useParams();
  const id = params.id;

  const [core, setCore] = useState<StartupCore | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StartupCore>>({});

  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Sarah Jenkins");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Notes state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteType, setNoteType] = useState("manual");

  // Founders state
  const [isAddingFounder, setIsAddingFounder] = useState(false);
  const [editingFounder, setEditingFounder] = useState<any | null>(null);
  const [founderForm, setFounderForm] = useState({ name: "", title: "", email: "", background: "", linkedin: "" });

  useEffect(() => {
    if (!id) return;
    
    const fetchAllData = async () => {
      try {
        const coreData = await apiFetch(`/api/startups/${id}/core`);
        if (coreData) setCore(coreData);

        const taskData = await apiFetch(`/api/startups/${id}/tasks`);
        if (taskData) setTasks(taskData);

        const metricsData = await apiFetch(`/api/startups/${id}/metrics`);
        if (metricsData) setMetrics(metricsData);

        const historyData = await apiFetch(`/api/startups/${id}/history`);
        if (historyData) setHistory(historyData);

        const founderData = await apiFetch(`/api/startups/${id}/founders`);
        if (founderData) setFounders(founderData);
      } catch (e) {
        console.error("Error fetching data", e);
      }
    };

    setLoading(true);
    fetchAllData().finally(() => setLoading(false));
  }, [id]);

  const handleStageChange = async (newStage: string) => {
    if (!core) return;
    setStageUpdating(true);
    setCore({ ...core, pipeline_stage: newStage });
    try {
      await apiFetch(`/api/startups/${id}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      // Refresh history
      const res = await apiFetch(`/api/startups/${id}/history`);
      if (res) setHistory(res);
    } catch (e) {
      console.error(e);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!core) return;
    try {
      await apiFetch(`/api/startups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setCore({ ...core, ...editForm });
      setMetrics((prev: any) => prev ? { ...prev, revenue_arr: editForm.revenue_arr ?? prev.revenue_arr, valuation: editForm.valuation ?? prev.valuation } : prev);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update startup", error);
      alert("Failed to update startup details.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          startup_id: Number(id),
          assignee: newTaskAssignee,
          priority: newTaskPriority,
          status: "Pending"
        }),
      });
      setNewTaskTitle("");
      setIsAddingTask(false);
      const data = await apiFetch(`/api/startups/${id}/tasks`);
      if (data) setTasks(data);
    } catch (err) {
      console.error(err);
      alert("Failed to add task.");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      if (taskId.startsWith("mock")) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        return;
      }
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
      const data = await apiFetch(`/api/startups/${id}/tasks`);
      if (data) setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      await apiFetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup_id: Number(id),
          content: newNoteContent,
          note_type: noteType,
          author: "Sarah Jenkins",
          source: "web"
        }),
      });
      setNewNoteContent("");
      const data = await apiFetch(`/api/startups/${id}/history`);
      if (data) setHistory(data);
    } catch (err) {
      console.error(err);
      alert("Failed to add note.");
    }
  };

  const handleFounderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFounder) {
        await apiFetch(`/api/founders/${editingFounder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(founderForm),
        });
      } else {
        await apiFetch("/api/founders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...founderForm,
            startup_id: Number(id)
          }),
        });
      }
      setIsAddingFounder(false);
      setEditingFounder(null);
      setFounderForm({ name: "", title: "", email: "", background: "", linkedin: "" });
      const data = await apiFetch(`/api/startups/${id}/founders`);
      if (data) setFounders(data);
    } catch (err) {
      console.error(err);
      alert("Failed to save founder information.");
    }
  };

  
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      const res = await apiFetch(`/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup_id: Number(id),
          meeting_type: noteType,
          ai_summary: newNoteContent,
          duration_minutes: 0,
          raw_transcript: "",
          key_concerns: "",
          action_items: [],
          founder_score: 0,
          live_mode_used: false
        })
      });
      // Refresh history
      const historyData = await apiFetch(`/api/startups/${id}/history`);
      if (historyData) setHistory(historyData);
      setNewNoteContent("");
    } catch (e) {
      console.error(e);
      alert("Error adding note");
    }
  };
const handleDeleteFounder = async (founderId: number) => {
    if (!confirm("Are you sure you want to delete this founder?")) return;
    try {
      await apiFetch(`/api/founders/${founderId}`, {
        method: "DELETE"
      });
      const data = await apiFetch(`/api/startups/${id}/founders`);
      if (data) setFounders(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", color: "var(--text-muted)" }}>
        SYNCING SECURE QUANTUM TELEMETRY DATA...
      </div>
    );
  }

  if (!core) {
    return (
      <div style={{ padding: "40px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", color: "var(--accent-red)" }}>
        [ERR] STARTUP TARGET WITH ID {id} NOT FOUND IN ACTIVE MEMORY POOL.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)", backgroundColor: "var(--bg-main)", overflow: "hidden" }}>
      
      {/* ── TOP BAR: CANONICAL PROFILE HEADER ── */}
      <header className="panel-elevated" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "4px", backgroundColor: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px", border: "1px solid var(--border-subtle)" }}>
            {core.name ? core.name.substring(0, 2).toUpperCase() : "??"}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{core.name}</h1>
            <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }} className="mono">
              <span>{core.sector || "Unclassified"}</span>
              <span>•</span>
              <span>{core.stage || "Sourced"}</span>
              <span>•</span>
              <span>{core.location || "N/A HQ"}</span>
              {core.website && (
                <>
                  <span>•</span>
                  <a href={core.website.startsWith("http") ? core.website : `https://${core.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>
                    {core.website}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "4px" }}>PIPELINE STAGE</div>
            <select
              value={core.pipeline_stage || "Sourced"}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={stageUpdating}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="Sourced">Sourced</option>
              <option value="Screening">Screening</option>
              <option value="Partner Review">Partner Review</option>
              <option value="IC Review">IC Review</option>
              <option value="Term Sheet">Term Sheet</option>
              <option value="Closed">Closed</option>
              <option value="Passed">Passed</option>
            </select>
          </div>

          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="mono" style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "4px" }}>AI COGNITIVE SCORE</div>
            <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: core.ai_score >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
              {core.ai_score || "N/A"}
            </div>
            <button 
              onClick={() => {
                setEditForm({
                  name: core.name || "",
                  sector: core.sector || "",
                  stage: core.stage || "",
                  location: core.location || "",
                  website: core.website || "",
                  description: core.description || "",
                  revenue_arr: metrics?.revenue_arr || "",
                  valuation: metrics?.valuation || ""
                });
                setIsEditing(true);
              }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer",
                fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
              }}
            >
              EDIT PROFILE
            </button>
          </div>
        </div>
      </header>

      {/* Edit Modal */}
      {isEditing && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="panel" style={{ width: "450px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "16px", margin: 0 }} className="mono">Edit Startup Profile</h2>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                Name
                <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  Sector
                  <input type="text" value={editForm.sector || ""} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  Stage
                  <input type="text" value={editForm.stage || ""} onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  Location
                  <input type="text" value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  Website
                  <input type="text" value={editForm.website || ""} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  ARR
                  <input type="text" value={editForm.revenue_arr || ""} onChange={(e) => setEditForm({ ...editForm, revenue_arr: e.target.value })} placeholder="E.g., $1.5M" style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                  Valuation
                  <input type="text" value={editForm.valuation || ""} onChange={(e) => setEditForm({ ...editForm, valuation: e.target.value })} placeholder="E.g., $15M" style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                Description / Thesis
                <textarea rows={3} value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsEditing(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border-subtle)", color: "white", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "var(--accent-blue)", border: "none", color: "white", cursor: "pointer", fontWeight: "bold" }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NEXT ACTIONS OPERATIONAL TERMINAL ── */}
      <div style={{ padding: "16px 24px 0 24px" }}>
        <div className="panel" style={{ borderLeft: "3px solid var(--accent-amber)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "16px", overflowX: "auto" }}>
          <div className="mono" style={{ fontWeight: "bold", color: "var(--accent-amber)", fontSize: "11px", whiteSpace: "nowrap" }}>
            ⚠️ URGENT PROTOCOLS:
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, overflowX: "auto" }}>
            {tasks && tasks.length > 0 ? (
              tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>{t.title}</span>
                  <span className="mono text-muted">({t.assignee})</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: "9px",
                      padding: "1px 4px",
                      background: t.priority === "High" ? "rgba(239, 68, 68, 0.15)" : "rgba(169,68,37,0.15)",
                      color: t.priority === "High" ? "var(--accent-red)" : "var(--accent-blue)",
                    }}
                  >
                    {t.priority.toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleCompleteTask(t.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-red)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "0 2px",
                      fontWeight: "bold"
                    }}
                    title="Complete Protocol"
                  >
                    ✓
                  </button>
                </div>
              ))
            ) : (
              <span className="mono text-muted" style={{ fontSize: "11px" }}>All deal pipelines clear. No blocking tasks.</span>
            )}
          </div>
          <button
            onClick={() => setIsAddingTask(true)}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "var(--font-mono, monospace)"
            }}
          >
            + ADD PROTOCOL
          </button>
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="panel" style={{ width: "350px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "14px", margin: 0 }} className="mono">INITIATE URGENT PROTOCOL</h2>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                PROTOCOL NAME / TITLE
                <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                ASSIGNEE
                <input type="text" value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                PRIORITY
                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsAddingTask(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border-subtle)", color: "white", cursor: "pointer", fontSize: "11px" }} className="mono">Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "var(--accent-amber)", border: "none", color: "black", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }} className="mono">Deploy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE ASYMMETRIC GRID ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "16px 24px 24px 24px", gap: "20px" }}>
        
        {/* Left Column: Tabbed deep context detail workspace */}
        <div style={{ flex: 1.8, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-elevated)", borderRadius: "6px", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
          
          {/* Tabs row */}
          <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border-subtle)", padding: "12px 24px 0 24px", backgroundColor: "var(--bg-surface)", overflowX: "auto" }}>
            {["overview", "founders", "diligence", "notes", "truth engine"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  paddingBottom: "10px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Deep Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {activeTab === "overview" && (
              <>
                <div className="panel">
                  <div className="panel-header" style={{ color: "var(--accent-violet)" }}>
                    Automated Investment Thesis Summary
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {core?.description || "No deal description available."}
                  </p>
                  <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>ALGORITHMIC INVESTMENT VERDICT:</span>
                    <span className="mono" style={{ fontSize: "11px", fontWeight: "bold", color: core?.investment_verdict === "INVEST" ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                      {core?.investment_verdict || "HOLD / REVIEW"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  <div className="panel" style={{ textAlign: "center", padding: "16px" }}>
                    <div className="mono text-muted" style={{ fontSize: "9px", marginBottom: "4px" }}>ARR RUN RATE</div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{core?.revenue_arr || "N/A"}</div>
                  </div>
                  <div className="panel" style={{ textAlign: "center", padding: "16px" }}>
                    <div className="mono text-muted" style={{ fontSize: "9px", marginBottom: "4px" }}>GROWTH RATE</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-emerald)" }}>{metrics?.revenue_growth_pct || "N/A"}</div>
                  </div>
                  <div className="panel" style={{ textAlign: "center", padding: "16px" }}>
                    <div className="mono text-muted" style={{ fontSize: "9px", marginBottom: "4px" }}>TARGET VALUATION</div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{core?.valuation || "N/A"}</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "founders" && (
                <div className="panel">
                  <div className="panel-header" style={{ color: "var(--accent-blue)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Founder Intelligence Profiles</span>
                    <button
                      onClick={() => {
                        setEditingFounder(null);
                        setFounderForm({ name: "", title: "", email: "", background: "", linkedin: "" });
                        setIsAddingFounder(true);
                      }}
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono, monospace)"
                      }}
                    >
                      + ADD FOUNDER
                    </button>
                  </div>
                  {founders && founders.length > 0 ? (
                    founders.map((f) => (
                      <div key={f.id} style={{ marginBottom: "16px", borderLeft: "2px solid var(--border-subtle)", paddingLeft: "16px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>
                            {f.name} <span style={{ fontSize: "11px", fontWeight: "normal", color: "var(--text-muted)" }}>— {f.title}</span>
                          </span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => {
                                setEditingFounder(f);
                                setFounderForm({
                                  name: f.name || "",
                                  title: f.title || "",
                                  email: f.email || "",
                                  background: f.background || "",
                                  linkedin: f.linkedin || ""
                                });
                                setIsAddingFounder(true);
                              }}
                              style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", fontSize: "10px" }}
                              className="mono"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDeleteFounder(f.id)}
                              style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: "10px" }}
                              className="mono"
                            >
                              DELETE
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
                          {f.background || "No background portfolio analysis mapped."}
                        </p>
                        <div style={{ display: "flex", gap: "20px", marginTop: "8px", fontSize: "10px" }} className="mono">
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>TRUST SCORE:</span>{" "}
                            <span style={{ color: "var(--accent-emerald)", fontWeight: "bold" }}>{f.trust_score || "85"}/100</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>RESPONSIVENESS:</span>{" "}
                            <span style={{ color: "var(--accent-blue)", fontWeight: "bold" }}>{f.responsiveness_score || "90"}/100</span>
                          </div>
                          {f.email && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>EMAIL:</span>{" "}
                              <span style={{ color: "white" }}>{f.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", padding: "10px 0" }}>No founders mapped.</div>
                  )}
                </div>
            )}

            {activeTab === "diligence" && (
              <div className="panel" style={{ textAlign: "center", padding: "40px", border: "1px dashed var(--border-subtle)", borderRadius: "4px" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "4px" }}>Diligence Data Room</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Upload pitch decks, financials, and legal docs to trigger automatic AI due diligence.
                </div>
                <button className="btn btn-primary" style={{marginTop: "12px"}}>UPLOAD DOC</button>
              </div>
            )}

            {activeTab === "notes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="panel" style={{ padding: "12px" }}>
                  <textarea 
                    placeholder="Log a new CRM note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    style={{ width: "100%", background: "transparent", border: "none", color: "white", outline: "none", fontSize: "13px", minHeight: "60px", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <select 
                      className="mono"
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      style={{ background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", padding: "4px 8px", fontSize: "10px", borderRadius: "4px" }}
                    >
                      <option value="manual">Manual Note</option>
                      <option value="call">Call Log</option>
                      <option value="email">Email Sync</option>
                    </select>
                    <button onClick={handleAddNote} className="btn btn-primary" style={{ padding: "4px 12px", fontSize: "10px" }} disabled={!newNoteContent.trim()}>SAVE NOTE</button>
                  </div>
                </div>

                {history && history.length > 0 ? (
                  history
                    .map((m) => (
                      <div key={m.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: m.type === "meeting" ? "2px solid var(--accent-emerald)" : "2px solid var(--accent-violet)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontWeight: "bold", color: m.type === "meeting" ? "var(--accent-emerald)" : "var(--accent-violet)" }}>{m.title || m.type.toUpperCase()}</span>
                          <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {m.date ? new Date(m.date).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                          {m.summary || m.content || "No automated summary for this stream."}
                        </p>
                        {m.transcript && (
                          <details style={{ marginTop: "6px" }}>
                            <summary style={{ cursor: "pointer", fontSize: "10px", color: "var(--accent-blue)", fontWeight: "bold" }}>
                              Expand Transcript Streams
                            </summary>
                            <pre className="mono" style={{ fontSize: "10px", background: "var(--bg-main)", padding: "10px", border: "1px solid var(--border-subtle)", borderRadius: "4px", marginTop: "6px", whiteSpace: "pre-wrap", overflowX: "auto", lineHeight: 1.5 }}>
                              {m.transcript}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                    No CRM history recorded yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === "truth engine" && (
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {!metrics?.truth_data ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "16px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "24px", background: "rgba(169,68,37,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)", fontSize: "24px" }}>
                      👁️
                    </div>
                    <div className="mono" style={{ fontSize: "14px", color: "var(--text-primary)", letterSpacing: "0.05em" }}>DEAL TRUTH ENGINE</div>
                    <div className="text-muted" style={{ fontSize: "12px", textAlign: "center", maxWidth: "350px" }}>
                      Run an AI audit cross-referencing founder claims, pitch decks, meeting transcripts, and public data to generate a verification scorecard.
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: "8px" }} disabled={stageUpdating} onClick={async () => {
                      setStageUpdating(true);
                      try {
                        const res = await apiFetch("/api/truth-engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startup_id: Number(id) }) });
                        setMetrics({ ...metrics, truth_data: res });
                      } catch (e) {
                        console.error(e);
                        alert("Error running truth engine");
                      }
                      setStageUpdating(false);
                    }}>
                      {stageUpdating ? "RUNNING AUDIT..." : "RUN VERIFICATION AUDIT"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="panel-header" style={{ color: "var(--accent-blue)" }}>
                      AI Due Diligence Scorecard
                      <span className="mono" style={{ float: "right", fontSize: "12px", color: "var(--accent-emerald)" }}>CONFIDENCE: {metrics.truth_data.confidence_score}/100</span>
                    </div>
                    
                    <div>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--accent-emerald)", marginBottom: "8px" }}>✓ VERIFIED CLAIMS</div>
                      <ul style={{ fontSize: "13px", color: "var(--text-primary)", paddingLeft: "20px", margin: 0 }}>
                        {metrics.truth_data.verified_claims?.map((c: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{c}</li>)}
                      </ul>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--accent-amber)", marginBottom: "8px" }}>⚠ UNSUPPORTED CLAIMS</div>
                      <ul style={{ fontSize: "13px", color: "var(--text-primary)", paddingLeft: "20px", margin: 0 }}>
                        {metrics.truth_data.unsupported_claims?.map((c: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{c}</li>)}
                      </ul>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--accent-red)", marginBottom: "8px" }}>✗ CONTRADICTIONS</div>
                      <ul style={{ fontSize: "13px", color: "var(--text-primary)", paddingLeft: "20px", margin: 0 }}>
                        {metrics.truth_data.contradictions?.map((c: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{c}</li>)}
                      </ul>
                    </div>

                    <div style={{ marginTop: "16px", padding: "16px", background: "var(--bg-main)", borderRadius: "6px" }}>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--accent-violet)", marginBottom: "8px" }}>? RECOMMENDED INVESTOR QUESTIONS</div>
                      <ul style={{ fontSize: "13px", color: "var(--text-primary)", paddingLeft: "20px", margin: 0 }}>
                        {metrics.truth_data.investor_questions?.map((c: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{c}</li>)}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
</div>
        </div>

        {/* Right Column: Intelligent Activity Feed (Audit Log) + Notes logging */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-elevated)", borderRadius: "6px", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
          
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-blue)", display: "inline-block" }}></span>
              CRM PROTOCOL PROTOCOL NOTES
            </h3>
            
            <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Log a new CRM note, founder feedback or meeting summary..."
                rows={3}
                required
                style={{
                  width: "100%",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-subtle)",
                  color: "white",
                  padding: "8px",
                  fontSize: "11px",
                  resize: "none",
                  outline: "none",
                  fontFamily: "Inter, sans-serif"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-subtle)",
                    color: "white",
                    fontSize: "10px",
                    padding: "4px 8px"
                  }}
                >
                  <option value="manual">Manual Note</option>
                  <option value="whatsapp">WhatsApp Log</option>
                  <option value="call">Call Log</option>
                  <option value="meeting">Meeting Summary</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ padding: "4px 12px", fontSize: "10px" }}>
                  SAVE CRM NOTE
                </button>
              </div>
            </form>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {history && history.filter((h) => h.type !== "meeting").length > 0 ? (
                history
                  .filter((h) => h.type !== "meeting")
                  .map((h, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            marginTop: "4px",
                            backgroundColor: h.type === "event" ? "var(--accent-amber)" : h.type === "note" ? "var(--accent-violet)" : "var(--accent-blue)",
                          }}
                        />
                        <div style={{ width: "1px", flex: 1, backgroundColor: "var(--border-subtle)", marginTop: "6px" }} />
                      </div>
                      <div style={{ paddingBottom: "8px" }}>
                        <div className="mono text-muted" style={{ fontSize: "9px" }}>
                          {h.date ? new Date(h.date).toLocaleString() : "N/A"}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)", marginTop: "2px" }}>
                          {h.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4 }}>
                          {h.summary}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", paddingTop: "20px" }}>
                  No historical telemetry audits found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Founder Modal */}
      {isAddingFounder && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="panel" style={{ width: "400px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "14px", margin: 0 }} className="mono">
              {editingFounder ? "UPDATE FOUNDER INTELLIGENCE" : "ENROLL NEW FOUNDER"}
            </h2>
            <form onSubmit={handleFounderSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                FULL NAME
                <input type="text" value={founderForm.name} onChange={(e) => setFounderForm({ ...founderForm, name: e.target.value })} required style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                ROLE / TITLE
                <input type="text" value={founderForm.title} onChange={(e) => setFounderForm({ ...founderForm, title: e.target.value })} placeholder="CEO & Founder" style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                EMAIL ADDRESS
                <input type="email" value={founderForm.email} onChange={(e) => setFounderForm({ ...founderForm, email: e.target.value })} style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                LINKEDIN PROFILE
                <input type="text" value={founderForm.linkedin} onChange={(e) => setFounderForm({ ...founderForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }} className="mono text-muted">
                BACKGROUND / PEDIGREE
                <textarea rows={3} value={founderForm.background} onChange={(e) => setFounderForm({ ...founderForm, background: e.target.value })} placeholder="E.g., Stanford CS, Ex-Google PM..." style={{ padding: "8px", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", color: "white", resize: "none" }} />
              </label>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" onClick={() => { setIsAddingFounder(false); setEditingFounder(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border-subtle)", color: "white", cursor: "pointer", fontSize: "11px" }} className="mono">Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "var(--accent-blue)", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }} className="mono">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
