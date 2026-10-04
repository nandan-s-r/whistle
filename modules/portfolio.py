import streamlit as st
from ui.components import render_page_header, render_metric_card

def render():
    render_page_header("Portfolio & Risk Engine", "Real-time portfolio health.")
    
    col1, col2, col3 = st.columns(3)
    with col1: render_metric_card("Total NAV", "$42.5M")
    with col2: render_metric_card("Estimated IRR", "28.4%", "+2.1%", "normal")
    with col3: render_metric_card("At Risk (Runway < 6m)", "2 Cos")
    
    st.markdown("---")
    st.subheader("Risk Heatmap")
    st.markdown(
"<div style='display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;'>"
"<div class='stCard' style='border-color: var(--status-danger);'>"
"<h4 style='color: var(--status-danger); margin:0;'>FinServe</h4>"
"<p>Runway: 4 months<br>Burn: High</p>"
"</div>"
"<div class='stCard' style='border-color: var(--status-warning);'>"
"<h4 style='color: var(--status-warning); margin:0;'>Beta Tech</h4>"
"<p>Runway: 9 months<br>Growth Slowing</p>"
"</div>"
"<div class='stCard' style='border-color: var(--status-success);'>"
"<h4 style='color: var(--status-success); margin:0;'>NeuroFlow AI</h4>"
"<p>Runway: 24 months<br>Executing well</p>"
"</div>"
"</div>", unsafe_allow_html=True)
