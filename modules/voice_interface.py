import streamlit as st
import streamlit.components.v1 as components
from ui.components import render_page_header

def render():
    render_page_header("Voice Interface", "Talk to Antigravity hands-free.")
    
    st.markdown("Click the mic to speak your command.")
    
    # Simple continuous listening UI mock
    html_code = """
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px;">
        <button id="micBtn" style="background: #333; color: white; border: none; border-radius: 50%; width: 100px; height: 100px; font-size: 30px; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);">🎤</button>
        <p id="micStatus" style="margin-top: 20px; color: #888; font-family: Inter;">Ready</p>
    </div>
    <script>
        const micBtn = document.getElementById('micBtn');
        const micStatus = document.getElementById('micStatus');
        let listening = false;
        
        micBtn.onclick = function() {
            listening = !listening;
            if(listening) {
                micBtn.style.background = "#6366f1";
                micBtn.style.transform = "scale(1.1)";
                micStatus.innerText = "Listening for 'Hey Antigravity'...";
            } else {
                micBtn.style.background = "#333";
                micBtn.style.transform = "scale(1)";
                micStatus.innerText = "Ready";
            }
        };
    </script>
    """
    components.html(html_code, height=400)
