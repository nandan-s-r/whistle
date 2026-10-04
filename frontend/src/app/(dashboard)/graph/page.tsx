'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  real_id?: number;
  trust_score?: number;
  notes?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
  color: string;
}

export default function NetworkGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Edit state
  const [editNotes, setEditNotes] = useState('');
  const [editScore, setEditScore] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchGraphData = () => {
    setLoading(true);
    apiFetch('/api/graph-data')
      .then(data => {
        // Position nodes in a circle layout for beautiful static SVG render
        const rawNodes: GraphNode[] = data.nodes;
        const width = 500;
        const height = 400;
        const cx = width / 2;
        const cy = height / 2;
        const r = 160;

        const nodesWithPos = rawNodes.map((node, i) => {
          if (node.id === 'sr_capital') {
            return { ...node, x: cx, y: cy };
          }
          const denominator = rawNodes.length > 1 ? rawNodes.length - 1 : 1;
          const angle = (i / denominator) * 2 * Math.PI;
          return {
            ...node,
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
          };
        });

        setNodes(nodesWithPos);
        setEdges(data.edges);
        
        // Retain selection
        if (selectedNode) {
          const fresh = nodesWithPos.find(n => n.id === selectedNode.id);
          if (fresh) setSelectedNode(fresh);
        } else if (nodesWithPos.length > 0) {
          setSelectedNode(nodesWithPos[0]);
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (selectedNode) {
      setEditNotes(selectedNode.notes || '');
      setEditScore(selectedNode.trust_score || '');
    }
  }, [selectedNode]);

  const handleSaveNode = async () => {
    if (!selectedNode || selectedNode.type !== 'founder' || !selectedNode.real_id) return;
    setSaving(true);
    try {
      await apiFetch(`/api/founders/${selectedNode.real_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          notes: editNotes,
          trust_score: editScore === '' ? null : Number(editScore)
        })
      });
      setToast('Node data saved.');
      setTimeout(() => setToast(''), 3000);
      fetchGraphData();
    } catch (e) {
      console.error(e);
      setToast('Failed to save.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getNodeEdges = (nodeId: string) => {
    return edges.filter(e => e.source === nodeId || e.target === nodeId);
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>VC Network Graph</h1>
        <div className="mono text-muted">MODULE: ENTITY RELATIONSHIP ATLAS • INTERACTIVE NODE MAP</div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          PARSING NODE GRAPH EDGES...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          
          {/* Left Column: Interactive Graph Map */}
          <div className="panel" style={{ height: 'calc(100vh - 120px)', background: 'var(--bg-main)', position: 'relative', overflow: 'hidden' }}>
            <div className="panel-header">Interactive Relation Map</div>
            
            <svg width="100%" height="90%" viewBox="0 0 500 400" style={{ background: 'var(--theme-surface)' }}>
              {/* Draw Edges */}
              {edges.map((edge, i) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                
                return (
                  <g key={i}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={edge.color || 'var(--border-subtle)'}
                      strokeWidth="1"
                    />
                    {/* Tiny edge label */}
                    <text
                      x={((sourceNode.x || 0) + (targetNode.x || 0)) / 2}
                      y={((sourceNode.y || 0) + (targetNode.y || 0)) / 2 - 4}
                      fill="var(--text-muted)"
                      fontSize="6"
                      fontFamily="IBM Plex Mono"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNode(node)}
                  >
                    <circle
                      r={node.size + (isSelected ? 3 : 0)}
                      fill={node.color}
                      stroke={isSelected ? '#ffffff' : 'var(--bg-main)'}
                      strokeWidth={isSelected ? 1.5 : 1}
                    />
                    <text
                      y={node.size + 10}
                      fill={isSelected ? '#ffffff' : 'var(--text-secondary)'}
                      fontSize="8"
                      fontFamily="Inter"
                      fontWeight={isSelected ? 600 : 400}
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right Column: Node Inspector */}
          <div className="col-stack">
            {selectedNode ? (
              <div className="panel panel-elevated" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <div className="panel-header">
                  <span>Relationship Inspector</span>
                  <span className="mono" style={{ textTransform: 'uppercase' }}>TYPE: {selectedNode.type}</span>
                </div>

                <h2 style={{ fontSize: '15px', color: selectedNode.color, marginBottom: '2px' }}>{selectedNode.label}</h2>
                <div className="mono text-muted" style={{ marginBottom: '16px' }}>NODE ID: {selectedNode.id}</div>

                {selectedNode.type === 'founder' && (
                  <div style={{ marginBottom: '20px', background: 'var(--bg-main)', padding: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>TRUST SCORE</label>
                      <input 
                        type="number"
                        value={editScore}
                        onChange={e => setEditScore(e.target.value ? Number(e.target.value) : '')}
                        style={{ width: '100%', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', fontSize: '11px', outline: 'none' }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>NOTES</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        style={{ width: '100%', height: '60px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', fontSize: '11px', outline: 'none', resize: 'none' }}
                      />
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleSaveNode}
                      disabled={saving}
                      style={{ fontSize: '10px', width: '100%' }}
                    >
                      {saving ? 'SAVING...' : 'SAVE NODE DATA'}
                    </button>
                    {toast && <div className="mono text-muted" style={{ fontSize: '9px', marginTop: '8px', color: 'var(--accent-emerald)' }}>{toast}</div>}
                  </div>
                )}

                <div className="panel-header">Active Relation Connections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {getNodeEdges(selectedNode.id).map((edge, i) => {
                    const linkedId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const linkedNode = nodes.find(n => n.id === linkedId);
                    return (
                      <div key={i} className="mono" style={{ background: 'var(--bg-main)', padding: '6px', border: '1px solid var(--border-subtle)', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <span style={{ color: edge.color }}>[{edge.label}]</span> {linkedNode?.label || linkedId}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{linkedNode?.type}</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                SELECT A NODE IN THE MAP TO INSPECT
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
