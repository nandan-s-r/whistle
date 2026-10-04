import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("LP Reporting", "Auto-generate quarterly updates.")
    
    if st.button("Generate Q3 Update"):
        with st.spinner("Aggregating portfolio metrics..."):
            pass
        st.success("Report Generated!")
        st.markdown("### Executive Summary\nThe fund deployed $10M this quarter across 4 deals. TVPI is 1.4x.")
