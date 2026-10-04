import streamlit as st
import streamlit.components.v1 as components
from ui.components import render_page_header

def render():
    render_page_header("Live Meeting Copilot", "Your AI partner, always in the room.")
    
    st.markdown("### WebSpeech Real-Time Transcription")
    
    # HTML/JS for browser-based speech recognition
    html_code = """
    <div id="status" style="color: #888; font-family: Inter;">Status: Ready</div>
    <button id="startBtn" style="background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Start Listening</button>
    <button id="stopBtn" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; display: none;">Stop Listening</button>
    <div id="transcript" style="margin-top: 20px; color: #efefef; font-family: Inter; height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #333; background: #111; border-radius: 8px;"></div>
    
    <script>
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const transcriptDiv = document.getElementById('transcript');
        const statusDiv = document.getElementById('status');
        
        let recognition;
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            
            recognition.onstart = function() {
                statusDiv.innerHTML = "Status: Listening...";
                startBtn.style.display = "none";
                stopBtn.style.display = "inline-block";
            };
            
            recognition.onresult = function(event) {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + '<br><br>';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if(finalTranscript) {
                    transcriptDiv.innerHTML += finalTranscript;
                    // Send to Streamlit via a custom event or Streamlit Component messaging (mocked here)
                }
            };
            
            recognition.onerror = function(event) {
                statusDiv.innerHTML = "Error: " + event.error;
            };
            
            recognition.onend = function() {
                statusDiv.innerHTML = "Status: Stopped.";
                startBtn.style.display = "inline-block";
                stopBtn.style.display = "none";
            };
            
            startBtn.onclick = () => recognition.start();
            stopBtn.onclick = () => recognition.stop();
        } else {
            statusDiv.innerHTML = "WebSpeech API not supported in this browser.";
            startBtn.style.display = "none";
        }
    </script>
    """
    
    col1, col2 = st.columns([6, 4])
    with col1:
        st.markdown("**Live Transcript**")
        components.html(html_code, height=450)
        
    with col2:
        st.markdown("**🧠 AI Insights**")
        st.markdown("""
        <div style='background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; padding: 10px; margin-bottom: 10px;'>
            <small style='color: #6366f1; font-weight: bold;'>METRIC DETECTED</small>
            <p style='margin: 0;'>$2M ARR at 3x YoY Growth mentioned.</p>
        </div>
        <div style='background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px; margin-bottom: 10px;'>
            <small style='color: #ef4444; font-weight: bold;'>RED FLAG</small>
            <p style='margin: 0;'>Founder deflected question on CAC/LTV ratio.</p>
        </div>
        """, unsafe_allow_html=True)
