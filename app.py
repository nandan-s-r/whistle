import streamlit as st
import os
from database.schema import init_db
from ui.sidebar import render_sidebar
from ui.command_palette import render_command_palette
from utils.helpers import load_css, inject_custom_fonts

# Must be the first command
st.set_page_config(page_title="SR Capital Firm", page_icon="⚡", layout="wide", initial_sidebar_state="expanded")

# Initialize DB
init_db()

# Load UI
st.markdown(inject_custom_fonts(), unsafe_allow_html=True)
st.markdown(load_css("ui/styles.css"), unsafe_allow_html=True)

# Main Routing
selected_page = render_sidebar()

# Command Palette at the top of every page
render_command_palette()

# Imports mapped to pages
if selected_page == "Daily Briefing":
    from modules.briefing import render
elif selected_page == "Pipeline Dashboard":
    from modules.deal_flow import render
elif selected_page == "Startup CRM":
    from modules.crm import render
elif selected_page == "Startup Deal Flow": # Not explicitly asked for distinct file but Deal Flow covers Pipeline
    from modules.deal_flow import render
elif selected_page == "Pitch Deck Analyzer":
    from modules.deck_analysis import render
elif selected_page == "AI Scoring Engine":
    from modules.scoring import render
elif selected_page == "AI Specialized Agents":
    from modules.deck_analysis import render # Mocking agents inside deck analysis for now
elif selected_page == "IC Memo Generator":
    from modules.ic_memo import render
elif selected_page == "AI Deal Sourcing":
    from modules.sourcing import render
elif selected_page == "Live Meeting Copilot":
    from modules.live_copilot import render
elif selected_page == "Meeting Intelligence":
    from modules.meeting_intel import render
elif selected_page == "WhatsApp Bot Manager":
    from modules.whatsapp_bot import render
elif selected_page == "Email & Outreach":
    from modules.outreach import render
elif selected_page == "Founder Tracking":
    from modules.founder_tracking import render
elif selected_page == "Portfolio Monitoring":
    from modules.monitoring import render
elif selected_page == "Risk Engine":
    from modules.portfolio import render # Portfolio handles risk
elif selected_page == "VC Network Graph":
    from modules.knowledge_graph import render
elif selected_page == "Comparables Engine":
    from modules.comparables import render
elif selected_page == "AI VC Copilot":
    from modules.copilot import render
elif selected_page == "Voice Interface":
    from modules.voice_interface import render
elif selected_page == "Research Terminal":
    from modules.research import render
elif selected_page == "Tasks & Workflow":
    from modules.tasks import render
else:
    from modules.briefing import render

render()
