import streamlit as st

def render_sidebar():
    with st.sidebar:
        st.markdown("""
        <div style='display: flex; align-items: center; margin-bottom: 30px;'>
            <div style='background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); width: 24px; height: 24px; border-radius: 6px; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;'>S</div>
            <h3 style='margin: 0; font-weight: 700; letter-spacing: 0.05em;'>SR CAPITAL FIRM</h3>
        </div>
        """, unsafe_allow_html=True)
        
        # Command Palette Mock
        st.markdown("""
        <div style='background: #111; border: 1px solid #222; padding: 8px 12px; border-radius: 6px; color: #888; font-size: 0.85em; margin-bottom: 20px; display: flex; justify-content: space-between;'>
            <span>Search...</span>
            <span style='background: #222; padding: 2px 6px; border-radius: 4px;'>⌘K</span>
        </div>
        """, unsafe_allow_html=True)

        pages = {
            "COMMAND CENTER": [
                "Daily Briefing",
                "Pipeline Dashboard",
                "Startup CRM",
                "Startup Deal Flow"
            ],
            "INTELLIGENCE": [
                "Pitch Deck Analyzer",
                "AI Scoring Engine",
                "AI Specialized Agents",
                "IC Memo Generator",
                "AI Deal Sourcing"
            ],
            "OPS & MEETINGS": [
                "Live Meeting Copilot",
                "Meeting Intelligence",
                "WhatsApp Bot Manager",
                "Email & Outreach"
            ],
            "PORTFOLIO & RISKS": [
                "Founder Tracking",
                "Portfolio Monitoring",
                "Risk Engine",
                "VC Network Graph",
                "Comparables Engine"
            ],
            "ASSISTANT": [
                "AI VC Copilot",
                "Voice Interface",
                "Research Terminal",
                "Tasks & Workflow"
            ]
        }

        selected_page = "Daily Briefing"
        
        for category, items in pages.items():
            st.markdown(f"<p style='color: #666; font-size: 0.75em; font-weight: 600; margin-top: 20px; margin-bottom: 5px;'>{category}</p>", unsafe_allow_html=True)
            for item in items:
                # Use a button styled to look like a sidebar link
                if st.button(item, use_container_width=True, key=f"nav_{item}"):
                    st.session_state['current_page'] = item

        # Bottom Profile
        st.markdown("""
        <div style='margin-top: 40px; border-top: 1px solid #2d3038; padding-top: 20px; padding-bottom: 20px; display: flex; align-items: center;'>
            <div style='background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); width: 32px; height: 32px; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;'>P</div>
            <div>
                <p style='margin: 0; font-size: 0.85em; font-weight: 600; color: #f0f2f6;'>Partner</p>
                <p style='margin: 0; font-size: 0.75em; color: #a0aec0;'>SR Capital Firm</p>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        return st.session_state.get('current_page', 'Daily Briefing')
