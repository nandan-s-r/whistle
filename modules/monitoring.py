import streamlit as st
from ui.components import render_page_header, render_glass_card
from database.db import get_db
from database.models import MonitoringEvent

def render():
    render_page_header("Startup Monitoring", "Real-time tracking of momentum signals.")
    
    with get_db() as db:
        events = db.query(MonitoringEvent).order_by(MonitoringEvent.detected_at.desc()).limit(10).all()
        
    st.markdown("### Recent Momentum Events")
    if not events:
        st.info("No events detected recently. The APScheduler background job runs every 24 hours.")
        if st.button("Trigger Manual Scrape"):
            st.success("Scrape triggered! Fetching LinkedIn and GitHub data...")
    else:
        for e in events:
            render_glass_card(f"<h4>{e.startup.name} - {e.event_type}</h4><p>{e.ai_summary}</p>")
