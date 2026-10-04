import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

# AI Providers
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Search APIs
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")

# WhatsApp config
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")

# Database Config
# Vercel's application bundle is read-only. These paths are scratch space;
# cloud accounts keep durable records and files in Supabase.
RUNTIME_DIR = (os.path.join(tempfile.gettempdir(), "whistle")
               if os.getenv("VERCEL") == "1"
               else os.path.dirname(os.path.dirname(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL", (
    "sqlite:///" + os.path.join(RUNTIME_DIR, "antigravity.db").replace("\\", "/")
    if os.getenv("VERCEL") == "1" else "sqlite:///./antigravity.db"
))
CHROMA_DB_PATH = os.path.join(RUNTIME_DIR, "chromadb_storage")

# App Config
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
UPLOAD_DIR = os.path.join(RUNTIME_DIR, "uploads")
REPORTS_DIR = os.path.join(RUNTIME_DIR, "reports")

# Ensure dirs exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

