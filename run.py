import subprocess
import sys
import time

def main():
    print("🚀 Starting ANTIGRAVITY OS...")
    
    # Start the FastAPI Webhook server
    print("📡 Starting Webhook Server on port 8001...")
    webhook_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "webhooks.whatsapp_webhook:app", "--host", "127.0.0.1", "--port", "8001", "--no-access-log"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(2) # Give it a moment to boot
    
    # Start the Streamlit App
    print("⚡ Starting Streamlit UI on port 8501...")
    streamlit_process = subprocess.Popen(
        [sys.executable, "-m", "streamlit", "run", "app.py", "--server.port", "8501", "--server.address", "localhost"]
    )
    
    try:
        streamlit_process.wait()
    except KeyboardInterrupt:
        print("Shutting down ANTIGRAVITY...")
        webhook_process.terminate()
        streamlit_process.terminate()

if __name__ == "__main__":
    main()
