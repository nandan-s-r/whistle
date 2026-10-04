import streamlit as st
from database.db import get_db
from database.models import Startup
from ui.components import render_page_header, render_badge
import pandas as pd
from st_aggrid import AgGrid, GridOptionsBuilder

def render():
    render_page_header("Startup CRM", "Full pipeline and relationship management.")
    
    with get_db() as db:
        startups = db.query(Startup).all()
        
    if not startups:
        st.info("No startups in CRM. Add one below.")
    else:
        # Prepare Dataframe for AgGrid
        data = []
        for s in startups:
            data.append({
                "ID": s.id,
                "Name": s.name,
                "Sector": s.sector,
                "Stage": s.stage,
                "Pipeline": s.pipeline_stage,
                "Score": s.ai_score,
                "Partner": s.assigned_partner
            })
        df = pd.DataFrame(data)
        
        gb = GridOptionsBuilder.from_dataframe(df)
        gb.configure_pagination(paginationAutoPageSize=True)
        gb.configure_side_bar()
        gb.configure_selection('single')
        gridOptions = gb.build()
        
        st.markdown("### Pipeline Data")
        grid_response = AgGrid(
            df,
            gridOptions=gridOptions,
            data_return_mode='AS_INPUT', 
            update_mode='MODEL_CHANGED',
            fit_columns_on_grid_load=True,
            theme='alpine'
        )

    with st.expander("+ Add New Startup to Pipeline"):
        with st.form("add_startup"):
            name = st.text_input("Startup Name")
            sector = st.text_input("Sector")
            stage = st.selectbox("Stage", ["Pre-seed", "Seed", "Series A", "Series B"])
            pipeline = st.selectbox("Pipeline Stage", ["Sourced", "Cold Outreach", "Intro Call"])
            if st.form_submit_button("Add to CRM"):
                with get_db() as db:
                    new_startup = Startup(name=name, sector=sector, stage=stage, pipeline_stage=pipeline)
                    db.add(new_startup)
                    db.commit()
                st.success(f"{name} added to CRM!")
                st.rerun()
