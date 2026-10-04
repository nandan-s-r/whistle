import streamlit as st
from ui.components import render_page_header

def render():
    render_page_header("WhatsApp Bot Manager", "Manage the Meta WhatsApp Cloud API connection.")
    
    st.success("Webhook Endpoint Active: `http://localhost:8001/webhook`")
    
    st.markdown("### Recent WhatsApp Activity")
    st.markdown(
"<div class='stCard' style='margin-bottom: 10px;'>"
"<p style='margin:0; color: #888;'>Today 10:30 AM</p>"
"<p style='margin: 5px 0;'><strong>Partner:</strong> What's the score on Sarvam AI?</p>"
"<p style='margin: 5px 0; color: var(--accent-primary);'><strong>Antigravity:</strong> Sarvam AI is currently scored at 82/100 (INVEST). Key strength is Team (9/10).</p>"
"</div>", unsafe_allow_html=True)
    
    st.markdown("### Settings")
    st.checkbox("Send Daily Briefing to WhatsApp at 8 AM", value=True)
    st.checkbox("Send Portfolio Risk Alerts instantly", value=True)
