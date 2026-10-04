import streamlit as st
from ui.components import render_page_header, render_metric_card
from database.db import get_db
from database.models import Startup

def render():
    render_page_header("Deal Flow Dashboard", "Pipeline analytics and sector allocation.")
    
    with get_db() as db:
        total = db.query(Startup).count()
        intro = db.query(Startup).filter(Startup.pipeline_stage == "Intro Call").count()
        diligence = db.query(Startup).filter(Startup.pipeline_stage == "Due Diligence").count()
        invested = db.query(Startup).filter(Startup.pipeline_stage == "Invested").count()
        
    col1, col2, col3, col4 = st.columns(4)
    with col1: render_metric_card("Total Sourced", total)
    with col2: render_metric_card("Active Intros", intro)
    with col3: render_metric_card("In Diligence", diligence)
    with col4: render_metric_card("Invested", invested)
    
    st.markdown("---")
    st.subheader("Funnel Visualization")
    from utils.chart_utils import create_funnel_chart
    fig = create_funnel_chart(["Sourced", "Intro Call", "Due Diligence", "IC Review", "Invested"], 
                              [total, intro, diligence, diligence//2 if diligence else 0, invested])
    st.plotly_chart(fig, use_container_width=True)
