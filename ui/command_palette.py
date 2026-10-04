import streamlit as st

def render_command_palette():
    """Functional search bar."""
    query = st.text_input("🔍 Search startups, notes, or firm memory... (Press Enter)", key="global_search_input")
    if query:
        st.info(f"Query '{query}' captured! To perform deep semantic searches across your entire VC database, use the 'Research Terminal' module.")
