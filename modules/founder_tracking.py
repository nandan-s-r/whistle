import streamlit as st
from ui.components import render_page_header
from database.db import get_db
from database.models import Founder

def render():
    render_page_header("Founder Tracking", "Track founder execution velocity and fit.")
    
    with get_db() as db:
        founders = db.query(Founder).all()
        
    if not founders:
        st.info("No founders in CRM.")
        return
        
    st.markdown("### Founder Execution Matrix")
    # In a real app this would be a Plotly scatter plot: Trust vs Execution
    import plotly.express as px
    import pandas as pd
    
    df = pd.DataFrame([{
        "Name": f.name,
        "Trust": f.trust_score or 5,
        "Execution": f.execution_score or 5,
        "Startup": f.startup.name if f.startup else "Unknown"
    } for f in founders])
    
    fig = px.scatter(df, x="Trust", y="Execution", text="Name", hover_data=["Startup"], color="Execution")
    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="white"))
    st.plotly_chart(fig, use_container_width=True)
