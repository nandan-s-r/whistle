import streamlit as st
from ui.components import render_page_header, render_glass_card
from database.db import get_db
from database.models import SourcingLead

def render():
    render_page_header("Deal Sourcing Engine", "Automated startup discovery.")
    
    with get_db() as db:
        leads = db.query(SourcingLead).order_by(SourcingLead.signal_score.desc()).all()
        
    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown("### Top Startups to Watch")
        if not leads:
            st.info("No leads discovered yet. Background job runs daily.")
            if st.button("Run Discovery Now"):
                st.success("Crawling ProductHunt, YC, and GitHub...")
        else:
            for lead in leads:
                render_glass_card(f"<h4>{lead.company_name} <span class='status-badge badge-success'>Score: {lead.signal_score}</span></h4><p>{lead.description}</p>")
                
    with col2:
        st.markdown("### Signal Sources")
        st.markdown("- GitHub Trending (Infra)\n- LinkedIn Jobs (Hiring Velocity)\n- YC S24 Batch\n- TechCrunch India")

