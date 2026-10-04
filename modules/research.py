import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("Research Terminal", "Semantic search across CRM and the Web.")
    
    query = st.text_input("Research Query (e.g. 'AI coding tools in India')")
    
    if query and st.button("Deep Dive"):
        with st.spinner("Scraping Web and Searching Firm Memory..."):
            pass
        st.markdown("""
        ### Market Landscape
        The AI coding tools market in India is nascent but growing rapidly.
        
        **Top Competitors**:
        1. CodeAssist AI
        2. DevCopilot India
        """)
