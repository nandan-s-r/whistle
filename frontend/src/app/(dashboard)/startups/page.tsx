"use client";

import { apiFetch } from "@/lib/apiClient";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddStartupModal from "@/components/AddStartupModal";

const PIPELINE_STAGES = [
  "Sourced",
  "Screening",
  "Meeting",
  "Diligence",
  "IC Review",
  "Invested",
  "Passed"
];

export default function StartupsDirectory() {
  const [startups, setStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [draggedStartupId, setDraggedStartupId] = useState<number | null>(null);
  const router = useRouter();

  const fetchStartups = () => {
    apiFetch('/api/startups')
      .then(data => {
        setStartups(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStartups();
  }, []);

  const handleDragStart = (id: number) => {
    setDraggedStartupId(id);
  };

  const handleDrop = async (stage: string) => {
    if (!draggedStartupId) return;
    const sId = draggedStartupId;
    setDraggedStartupId(null);
    
    // Optimistic update
    setStartups(prev => prev.map(s => (s.id || s.startup_id) === sId ? { ...s, pipeline_stage: stage } : s));
    
    try {
      await apiFetch(`/api/startups/${sId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_stage: stage })
      });
    } catch (err) {
      console.error(err);
      fetchStartups(); // Revert on failure
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", color: "var(--text-muted)", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)" }}>LOADING STARTUP DATABASE...</div>;
  }

  return (
    <div style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", margin: 0 }}>Startups & Deal Inbox</h1>
          <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ALL PIPELINE ASSETS</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", borderRadius: "4px", overflow: "hidden" }}>
            <button 
              className="mono"
              style={{ padding: "6px 12px", fontSize: "11px", background: viewMode === "kanban" ? "var(--accent-blue)" : "transparent", color: viewMode === "kanban" ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer" }}
              onClick={() => setViewMode("kanban")}
            >
              PIPELINE
            </button>
            <button 
              className="mono"
              style={{ padding: "6px 12px", fontSize: "11px", background: viewMode === "table" ? "var(--accent-blue)" : "transparent", color: viewMode === "table" ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer" }}
              onClick={() => setViewMode("table")}
            >
              TABLE
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Startup</button>
        </div>
      </div>

      {startups.length === 0 ? (
        <div className="panel" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(169,68,37,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontSize: '24px' }}>
              ⚡
            </div>
            <div className="mono" style={{ fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>NO STARTUPS FOUND</div>
            <div className="text-muted" style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
              Your pipeline is empty. Run the sourcing crawler or manually add a startup to begin tracking deals.
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginTop: '8px' }}>+ ADD FIRST STARTUP</button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="panel" style={{ padding: "0", flex: 1, overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>STARTUP</th>
                <th>SECTOR</th>
                <th>STAGE</th>
                <th>PIPELINE STAGE</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {startups.map((s, i) => (
                <tr key={s.id || s.startup_id || i} className="hover-row">
                  <td style={{ fontWeight: "bold" }}>
                    <Link href={`/startups/${s.id || s.startup_id}`} style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
                      {s.name || s.startup_name}
                    </Link>
                  </td>
                  <td className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{s.sector || "Unclassified"}</td>
                  <td className="mono" style={{ fontSize: "11px" }}>{s.stage || "N/A"}</td>
                  <td>
                    <span className="tag" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {s.pipeline_stage || "Sourced"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button 
                      onClick={() => router.push(`/startups/${s.id || s.startup_id}`)}
                      className="btn" 
                      style={{ padding: "4px 8px", fontSize: "10px" }}
                    >
                      View & Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", flex: 1, paddingBottom: "10px" }}>
          {PIPELINE_STAGES.map(stage => {
            const columnStartups = startups.filter(s => (s.pipeline_stage || "Sourced") === stage);
            return (
              <div 
                key={stage} 
                className="panel" 
                style={{ width: "260px", minWidth: "260px", display: "flex", flexDirection: "column", background: "var(--bg-main)", padding: "12px", border: "1px solid var(--border-subtle)" }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  handleDrop(stage);
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid var(--accent-blue)" }}>
                  <span className="mono" style={{ fontSize: "11px", fontWeight: 600 }}>{stage.toUpperCase()}</span>
                  <span className="mono text-muted" style={{ fontSize: "10px", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "8px" }}>{columnStartups.length}</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 }}>
                  {columnStartups.map(s => (
                    <div 
                      key={s.id} 
                      draggable
                      onDragStart={() => handleDragStart(s.id)}
                      onClick={() => router.push(`/startups/${s.id}`)}
                      style={{ 
                        background: "var(--bg-elevated)", 
                        border: "1px solid var(--border-subtle)", 
                        padding: "10px", 
                        cursor: "grab",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        transition: "transform 0.1s ease"
                      }}
                      className="hover-border-blue"
                    >
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{s.name}</div>
                      <div className="mono text-secondary" style={{ fontSize: "10px", marginBottom: "6px" }}>{s.sector || "Unclassified"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono text-muted" style={{ fontSize: "9px" }}>{s.stage || "N/A"}</span>
                        <span className="mono" style={{ fontSize: "9px", color: s.ai_score >= 80 ? "var(--accent-emerald)" : "var(--accent-blue)" }}>
                          AI: {s.ai_score || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddStartupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchStartups();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
