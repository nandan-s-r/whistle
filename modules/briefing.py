import streamlit as st
from ui.components import render_page_header, render_glass_card

def render():
    render_page_header("Partner Briefing", "Your morning intelligence briefing.")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("🚨 Portfolio Alerts")
        render_glass_card(
"<h4 style='color: var(--status-danger); margin:0;'>FinServe • Burn Acceleration</h4>"
"<p style='margin-top: 5px;'>Runway dropped to 4 months. Immediate check-in required.</p>"
        )
        
        st.subheader("🔥 Top Sourcing Signals")
        render_glass_card(
"<h4 style='color: var(--status-success); margin:0;'>NeuroFlow AI • High GitHub Velocity</h4>"
"<p style='margin-top: 5px;'>1k+ stars in 3 days. Sourced via HackerNews scraper.</p>"
        )
        
    with col2:
        st.subheader("📅 Schedule")
        st.markdown("- **10:00 AM**: Acme Corp (Pitch)\n- **2:00 PM**: IC Review\n- **4:00 PM**: Zepto Check-in")
        
        st.subheader("☑️ Urgent Tasks")
        st.markdown("- [ ] Send Term Sheet to BetaTech\n- [ ] Review Market landscape for EdTech")
