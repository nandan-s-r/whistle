import streamlit as st
from ui.components import render_page_header
from utils.chart_utils import create_radar_chart

def render():
    render_page_header("AI Scoring Engine", "100-point multi-dimensional evaluation.")
    
    # Mock scores
    scores = {
        "Team": 9,
        "Market": 8,
        "Product": 7,
        "Traction": 5,
        "Growth": 8,
        "Unit Econ": 6,
        "Moat": 7,
        "GTM": 8,
        "Speed": 9,
        "Terms": 6
    }
    
    col1, col2 = st.columns([1, 1])
    with col1:
        fig = create_radar_chart(scores, title="Total Score: 73/100 (INVEST)")
        st.plotly_chart(fig, use_container_width=True)
    with col2:
        st.markdown("### Rationale")
        st.markdown("**Team (9/10)**: Exceptional founder pedigree.\n**Traction (5/10)**: Early stage, pre-revenue risk.")
