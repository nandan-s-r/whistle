import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("IC Memo Generator", "Auto-generate Sequoia-style IC Memos.")
    
    st.selectbox("Select Startup", ["Acme Corp", "Beta Tech", "NeuroFlow AI"])
    
    if st.button("Generate Memo"):
        with st.spinner("Drafting memo..."):
            st.markdown("""
            ## Executive Summary
            - Strong team
            - Large market
            - Early traction
            
            ## Investment Thesis
            Acme Corp is poised to disrupt the legacy enterprise software market.
            """)
            st.download_button("Download PDF", "mock", file_name="memo.pdf")
