import streamlit as st
from ui.components import render_page_header
import networkx as nx
import plotly.graph_objects as go

def render():
    render_page_header("VC Network Graph", "Interactive ecosystem mapping.")
    
    # Mock Graph
    G = nx.Graph()
    G.add_edge("Nikhil", "Sarvam AI", label="FOUNDED")
    G.add_edge("Peak XV", "Sarvam AI", label="INVESTED_IN")
    G.add_edge("Sarvam AI", "GenAI", label="SECTOR")
    
    pos = nx.spring_layout(G)
    
    edge_x = []
    edge_y = []
    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])
        
    edge_trace = go.Scatter(x=edge_x, y=edge_y, line=dict(width=1, color='#475569'), hoverinfo='none', mode='lines')

    node_x = []
    node_y = []
    node_text = []
    
    for node in G.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        node_text.append(node)

    node_trace = go.Scatter(x=node_x, y=node_y, mode='markers+text', hoverinfo='text', text=node_text,
                            textposition="bottom center", marker=dict(size=20, color="#6366f1"))

    fig = go.Figure(data=[edge_trace, node_trace], layout=go.Layout(showlegend=False, hovermode='closest',
                                                                  margin=dict(b=0,l=0,r=0,t=0), paper_bgcolor="rgba(0,0,0,0)",
                                                                  plot_bgcolor="rgba(0,0,0,0)", xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                                                  yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)))
    st.plotly_chart(fig, use_container_width=True)
