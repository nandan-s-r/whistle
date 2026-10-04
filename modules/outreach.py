import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("Email & Outreach", "Draft outreach templates via AI.")
    
    st.selectbox("Template Type", ["Cold Outreach", "Warm Intro", "Meeting Follow-up", "Soft Rejection"])
    
    if st.button("Draft Email"):
        with st.spinner("Drafting..."):
            pass
        st.markdown("""
        **Subject**: Great meeting you at Slush!
        
        Hi Founder,
        Loved learning about Acme Corp. I'd love to dig deeper into the GTM motion we discussed.
        """)
