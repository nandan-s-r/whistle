import os
import sys
# Add parent directory to path to enable local database imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import load_runtime_config
load_runtime_config()
from backend.security import RequestBudget, WorkspaceRoutesOnly, require_production_auth, validation_feedback
require_production_auth()

import fitz  # PyMuPDF
from PIL import Image
import io
import time
import re
from collections import defaultdict
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from groq import Groq
import json
from sqlalchemy.orm import Session
from database.db import SessionLocal, get_db, engine
from database.models import Base, Startup, Founder, Meeting, Note, Score, Deck, Task, Deal, Portfolio, MonitoringEvent, SourcingLead, OutreachEmail, User
from config.settings import ENVIRONMENT
from backend import sourcing

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
from backend.workspace_api import router as workspace_router
from backend.platform_api import router as platform_router
from backend.observability import initialize_monitoring
initialize_monitoring()
app = FastAPI()
from fastapi.exceptions import RequestValidationError
app.add_exception_handler(RequestValidationError, validation_feedback)
app.include_router(platform_router)
from backend.calendar_integration import router as calendar_router
app.include_router(calendar_router)
from backend.sourcing_api import router as sourcing_router
app.include_router(sourcing_router)
app.include_router(workspace_router)
from backend.fund_api import router as fund_router
app.include_router(fund_router)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
@app.on_event("startup")
def startup_event():
    from backend.supabase_gateway import enabled
    if enabled():
        return
    Base.metadata.create_all(bind=engine)
    # Preserve research while quarantining unsafe accounts from earlier builds.
    from backend.auth import retired_credential, RETIRED_LOCAL_IDENTITIES
    with SessionLocal() as db:
        for user in db.query(User).filter(User.email.in_(RETIRED_LOCAL_IDENTITIES)):
            if retired_credential(user): user.is_active=False
        db.commit()
    if os.getenv("ENVIRONMENT") != "production" and os.getenv("JOB_WORKER_MODE", "embedded") == "embedded":
        import threading
        from backend.worker import run
        threading.Thread(target=run,daemon=True,name="vc-scope-ingestion").start()

    # Accounts are created explicitly; startup never installs shared credentials.

# Allow Next.js frontend to call the API
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP middleware to inject security headers into every response
app.add_middleware(RequestBudget)
app.add_middleware(WorkspaceRoutesOnly)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    cloud_request = os.getenv("AUTH_PROVIDER") == "supabase"
    if os.getenv("AUTH_PROVIDER") == "hybrid":
        try:
            import jwt
            bearer = request.headers.get("authorization", "").removeprefix("Bearer ")
            cloud_request = jwt.decode(bearer, options={"verify_signature": False}).get("iss") == os.getenv("SUPABASE_URL", "").rstrip("/") + "/auth/v1"
        except Exception:
            pass
    if cloud_request and request.url.path.startswith("/api/") and not (request.url.path.startswith(("/api/workspace", "/api/platform")) or (request.url.path=="/api/auth/me" and request.method=="GET")):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404,content={"detail":"This legacy endpoint is unavailable in the Supabase workspace."})
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Dynamically whitelist the front-end URL in connect-src if defined
    connect_src = "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:3000 http://127.0.0.1:3000"
    if frontend_url:
        connect_src += f" {frontend_url}"
        
    response.headers["Content-Security-Policy"] = (
        f"default-src 'self'; {connect_src}; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

from typing import Optional
from pydantic import BaseModel

class MeetingCreate(BaseModel):
    startup_id: Optional[int] = None
    meeting_type: Optional[str] = "Initial Pitch"
    ai_summary: Optional[str] = ""
    duration_minutes: Optional[int] = 30
    raw_transcript: Optional[str] = ""
    key_concerns: Optional[list] = None
    action_items: Optional[list] = None
    founder_score: Optional[int] = 85
    live_mode_used: Optional[bool] = False

class MeetingUpdate(BaseModel):
    startup_id: Optional[int] = None
    meeting_type: Optional[str] = None
    ai_summary: Optional[str] = None
    duration_minutes: Optional[int] = None
    key_concerns: Optional[str] = None
    action_items: Optional[str] = None
    founder_score: Optional[int] = None

class CopilotAnalyzeRequest(BaseModel):
    transcript: str

class TruthEngineRequest(BaseModel):
    startup_id: int

class OutreachGenerateRequest(BaseModel):
    startup_name: str
    founder_name: Optional[str] = ""
    template_type: Optional[str] = "Standard Warm Intro"

class StartupCreate(BaseModel):
    name: str = "New Startup"
    sector: Optional[str] = ""
    stage: Optional[str] = ""
    website: Optional[str] = ""
    location: Optional[str] = ""
    description: Optional[str] = ""
    revenue_arr: Optional[str] = ""
    valuation: Optional[str] = ""
    pipeline_stage: Optional[str] = "Sourced"

class StartupUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    stage: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    revenue_arr: Optional[str] = None
    revenue_growth_pct: Optional[str] = None
    ai_score: Optional[int] = None
    investment_verdict: Optional[str] = None
    ai_summary: Optional[str] = None
    pipeline_stage: Optional[str] = None
    valuation: Optional[str] = None

class FounderCreate(BaseModel):
    startup_id: int
    name: str = "New Founder"
    email: Optional[str] = ""
    title: Optional[str] = ""
    background: Optional[str] = ""

class FounderUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    title: Optional[str] = None
    background: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    startup_id: Optional[int] = None
    assignee: Optional[str] = "Sarah Jenkins"
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Pending"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

class NoteCreate(BaseModel):
    startup_id: int
    founder_id: Optional[int] = None
    author: Optional[str] = "Sarah Jenkins"
    content: str
    note_type: Optional[str] = "manual"
    source: Optional[str] = "web"
    tags: Optional[list] = None

class NoteUpdate(BaseModel):
    content: Optional[str] = None
    note_type: Optional[str] = None
    tags: Optional[list] = None

class PortfolioCreate(BaseModel):
    startup_id: int
    current_valuation: Optional[str] = ""
    current_ownership: Optional[float] = 0.0
    runway_months: Optional[int] = 12
    burn_rate: Optional[str] = ""
    risk_level: Optional[str] = "LOW"

class PortfolioUpdate(BaseModel):
    current_valuation: Optional[str] = None
    current_ownership: Optional[float] = None
    runway_months: Optional[int] = None
    burn_rate: Optional[str] = None
    risk_level: Optional[str] = None

class OutreachUpdateStatus(BaseModel):
    status: str

class MemoGenerateRequest(BaseModel):
    startup_name: str

class PipelineUpdate(BaseModel):
    stage: str

def parse_gemini_json(response_text: str):
    """Robust JSON parser to prevent 'Expecting value: line 1' errors."""
    try:
        # Strip markdown formatting if Gemini wrapped it in ```json ... ```
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        start = clean_text.find("{")
        end = clean_text.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON object found")
        return json.loads(clean_text[start:end])
    except Exception as e:
        print(f"JSON Parsing Error: {e}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# AUTHENTICATION ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

# Security Rate Limiting & Password Validation
login_signup_rate_limit_data = defaultdict(list)

def check_rate_limit(request: Request):
    client_ip = request.client.host if (request.client and request.client.host) else "127.0.0.1"
    now = time.time()
    # Keep only requests from the last 60 seconds
    login_signup_rate_limit_data[client_ip] = [
        t for t in login_signup_rate_limit_data[client_ip] if now - t < 60
    ]
    # Limit to 5 attempts per 60 seconds per IP
    if len(login_signup_rate_limit_data[client_ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again after 60 seconds.",
            headers={"Retry-After":"60"}
        )
    login_signup_rate_limit_data[client_ip].append(now)

def validate_password_complexity(password: str):
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter."
        )
    if not re.search(r'\d', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one digit."
        )
    if not re.search(r'[^a-zA-Z0-9]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character."
        )

@app.post("/api/auth/signup")
def signup(user: UserCreate, request: Request, db_session: Session = Depends(get_db)):
    check_rate_limit(request)
    validate_password_complexity(user.password)
    try:
        existing = db_session.query(User).filter(User.email == user.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed = get_password_hash(user.password)
        new_user = User(email=user.email, full_name=user.full_name, hashed_password=hashed, role="analyst")
        db_session.add(new_user)
        db_session.commit()
        db_session.refresh(new_user)
        
        # Auto-generate token so they are logged in immediately
        from backend.auth import credential_version
        access_token = create_access_token(data={"sub": new_user.email,"credential_version":credential_version(new_user)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access_token, "token_type": "bearer", "user": {"email": new_user.email, "name": new_user.full_name}}
    finally:
        db_session.close()

@app.post("/api/auth/login")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db_session: Session = Depends(get_db)):
    check_rate_limit(request)
    try:
        user = db_session.query(User).filter(User.email == form_data.username).first()
        from backend.auth import retired_credential, credential_version
        if not user or not user.is_active or retired_credential(user) or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
            
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email,"credential_version":credential_version(user)}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "name": user.full_name}}
    finally:
        db_session.close()

@app.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "name": current_user.full_name,
        "role": current_user.role,
        "outreach_identity": current_user.outreach_identity
    }

@app.put("/api/auth/me")
def update_users_me(payload: dict = Body(...), current_user: User = Depends(get_current_user)):
    if "role" in payload and payload["role"] != current_user.role:
        raise HTTPException(status_code=403, detail="Role changes require administrator provisioning.")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if "name" in payload and payload["name"]:
            user.full_name = payload["name"]
        db.commit()
        return {"message": "Profile updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/api/auth/me/identity")
def update_user_identity(payload: dict = Body(...), current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        user.outreach_identity = payload.get("outreach_identity", {})
        db.commit()
        return {"message": "Identity updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()



# --- Existing Upload Deck ---
@app.post("/api/upload-deck")
async def upload_deck(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
        
    print(f"[API] Received file: {file.filename}")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
    import base64
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[WARNING] GROQ_API_KEY not found. Returning graceful fallback data.")
        return {
            "company": file.filename.replace(".pdf", ""),
            "confidence": 75,
            "metrics": { "revenue": "API KEY MISSING", "growth": "N/A", "runway": "N/A" },
            "thesis": "Groq API key not configured. This is a fallback response. Please add GROQ_API_KEY to your .env file to enable multimodal vision extraction.",
            "risks": ["Missing GROQ_API_KEY"],
            "comps": ["N/A"]
        }

    try:
        client = Groq(api_key=api_key)

        print("[PDF] Converting PDF to Images via PyMuPDF...")
        doc = fitz.open(stream=contents, filetype="pdf")
        
        prompt = """
        You are a top-tier Venture Capital Partner at Palantir Foundry.
        Analyze these pitch deck slides. Extract the exact numbers from the charts and tables.
        CRITICAL: Identify the real company name from the title slide. Extract all details about the team/founder, market size (TAM), traction metrics (revenue, growth, runway), GTM strategy, product solution, problem, and competitive moat. 
        Respond ONLY with a valid JSON object matching this schema, no other text:
        {
          "company": "Company Name",
          "sector": "e.g. AI / ML or DevTools / Infra or Enterprise SaaS or FinTech or HealthTech",
          "stage": "e.g. Pre-seed or Seed or Series A or Series B",
          "description": "2-3 sentences evaluating technical moat and GTM efficiency.",
          "problem": "1-2 sentences summarizing the problem.",
          "solution": "1-2 sentences summarizing the product solution.",
          "moat": "1-2 sentences detailing the competitive moat.",
          "gtm": "1-2 sentences detailing the GTM strategy.",
          "metrics": { "revenue": "e.g. $1.5M ARR or N/A", "growth": "e.g. 120% YoY or N/A", "runway": "e.g. 12 months or N/A" },
          "thesis": "Investment thesis...",
          "risks": ["Risk 1", "Risk 2"],
          "comps": ["Comp 1", "Comp 2"],
          "founder": {
            "name": "Founder's Full Name (or N/A)",
            "title": "e.g. CEO or CEO & Founder",
            "email": "e.g. founder@domain.com (if not found, generate based on name and company domain)",
            "background": "Education and professional pedigree from the team slide"
          },
          "scoring": {
            "Team & Founder Quality": 8,
            "Market Size & Timing": 8,
            "Product & Technology": 8,
            "Traction & Revenue Quality": 7,
            "Growth Rate & Momentum": 8,
            "Business Model & Unit Economics": 7,
            "Competitive Moat & Defensibility": 8,
            "GTM & Distribution": 7,
            "Execution Speed": 8,
            "Fundraising Quality & Terms": 7,
            "total_score": 79,
            "verdict": "INVEST",
            "rationale": "High-conviction rationale..."
          }
        }
        """
        
        gemini_content = [prompt]

        for i in range(min(5, len(doc))):
            page = doc.load_page(i)
            pix = page.get_pixmap()
            img_bytes = pix.tobytes("png")
            gemini_content.append({"mime_type": "image/png", "data": img_bytes})

        if len(gemini_content) == 1:
            raise HTTPException(status_code=400, detail="No readable slides found in PDF.")

        print("[GEMINI] Sending slides to Gemini Vision...")
        import google.generativeai as genai
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
        
        genai.configure(api_key=gemini_api_key)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json", "temperature": 0.1})
        response = gemini_model.generate_content(gemini_content)
        
        print("[OK] Received Gemini response")
        parsed_data = parse_gemini_json(response.text)
        if not parsed_data:
            raise HTTPException(status_code=500, detail="Failed to parse JSON from Gemini. " + response.text[:100])
            
        # Try to save to DB
        db = SessionLocal()
        try:
            startup = Startup(
                name=parsed_data.get("company", "Unknown"),
                sector=parsed_data.get("sector", "AI / ML"),
                stage=parsed_data.get("stage", "Sourced"),
                description=parsed_data.get("description", ""),
                problem=parsed_data.get("problem", ""),
                solution=parsed_data.get("solution", ""),
                moat=parsed_data.get("moat", ""),
                gtm=parsed_data.get("gtm", ""),
                revenue_arr=parsed_data.get("metrics", {}).get("revenue", "N/A"),
                revenue_growth_pct=parsed_data.get("metrics", {}).get("growth", "N/A"),
                ai_score=parsed_data.get("scoring", {}).get("total_score", 70),
                investment_verdict=parsed_data.get("scoring", {}).get("verdict", "HOLD"),
                ai_summary=parsed_data.get("thesis", ""),
                tags=[parsed_data.get("sector", "AI / ML"), parsed_data.get("stage", "Sourced")]
            )
            db.add(startup)
            db.commit()
            db.refresh(startup)
            
            # Save founder details if present
            f_data = parsed_data.get("founder", {})
            if f_data and f_data.get("name") != "N/A":
                founder = Founder(
                    startup_id=startup.id,
                    name=f_data.get("name", "Unknown Founder"),
                    title=f_data.get("title", "Founder"),
                    email=f_data.get("email", ""),
                    background=f_data.get("background", ""),
                    previous_companies=[],
                    trust_score=85,
                    responsiveness_score=85,
                    execution_score=85
                )
                db.add(founder)
                db.commit()
                
            # Save score details
            sc_data = parsed_data.get("scoring", {})
            if sc_data:
                dimensions = {
                    "Team & Founder Quality": sc_data.get("Team & Founder Quality", 7),
                    "Market Size & Timing": sc_data.get("Market Size & Timing", 7),
                    "Product & Technology": sc_data.get("Product & Technology", 7),
                    "Traction & Revenue Quality": sc_data.get("Traction & Revenue Quality", 7),
                    "Growth Rate & Momentum": sc_data.get("Growth Rate & Momentum", 7),
                    "Business Model & Unit Economics": sc_data.get("Business Model & Unit Economics", 7),
                    "Competitive Moat & Defensibility": sc_data.get("Competitive Moat & Defensibility", 7),
                    "GTM & Distribution": sc_data.get("GTM & Distribution", 7),
                    "Execution Speed": sc_data.get("Execution Speed", 7),
                    "Fundraising Quality & Terms": sc_data.get("Fundraising Quality & Terms", 7)
                }
                score = Score(
                    startup_id=startup.id,
                    dimensions=dimensions,
                    total_score=sc_data.get("total_score", 70),
                    verdict=sc_data.get("verdict", "HOLD"),
                    rationale=sc_data.get("rationale", "")
                )
                db.add(score)
                db.commit()
        except Exception as dberr:
            db.rollback()
            print(f"Failed to save extracted deck startup: {dberr}")
        finally:
            db.close()

        return parsed_data

    except Exception as e:
        print(f"[ERROR] Backend Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An internal orchestration error occurred: {str(e)}")

# --- Meetings ---
@app.get("/api/meetings")
def get_meetings(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        meetings = db.query(Meeting).all()
        results = []
        for m in meetings:
            startup = db.query(Startup).filter(Startup.id == m.startup_id).first()
            results.append({
                "id": m.id,
                "startup_id": m.startup_id,
                "startup_name": startup.name if startup else "Unknown",
                "meeting_type": m.meeting_type,
                "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
                "duration_minutes": m.duration_minutes,
                "ai_summary": m.ai_summary,
                "key_concerns": m.key_concerns,
                "action_items": m.action_items,
                "founder_score": m.founder_score,
                "raw_transcript": m.raw_transcript,
                "live_mode_used": m.live_mode_used
            })
        return results
    finally:
        db.close()

from datetime import datetime
@app.post("/api/meetings")
def create_meeting(payload: MeetingCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        new_meeting = Meeting(
            startup_id=payload.startup_id,
            meeting_type=payload.meeting_type,
            ai_summary=payload.ai_summary,
            duration_minutes=payload.duration_minutes,
            raw_transcript=payload.raw_transcript,
            key_concerns=payload.key_concerns,
            action_items=payload.action_items,
            founder_score=payload.founder_score,
            live_mode_used=payload.live_mode_used,
            scheduled_at=datetime.utcnow()
        )
        db.add(new_meeting)
        db.commit()
        db.refresh(new_meeting)

        # Extract tasks from action items
        if payload.action_items:
            for item in payload.action_items:
                new_task = Task(
                    title=item,
                    startup_id=payload.startup_id,
                    assignee=current_user.full_name,
                    due_date=datetime.utcnow(),
                    priority="High",
                    status="Pending",
                    source="Meeting Copilot"
                )
                db.add(new_task)
            db.commit()

        return {"id": new_meeting.id, "message": "Meeting logged successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/meetings/{meeting_id}")
def update_meeting(meeting_id: int, payload: MeetingUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        for key, value in payload.dict(exclude_unset=True).items():
            if hasattr(meeting, key):
                setattr(meeting, key, value)
                
        db.commit()
        return {"message": "Meeting updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        db.delete(meeting)
        db.commit()
        return {"message": "Meeting deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# --- Live Meeting Copilot Analysis ---
# (Moved to end of file to use new ai_utils engine)

# --- Outreach ---
@app.get("/api/outreach")
def get_outreach(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        emails = db.query(OutreachEmail).all()
        results = []
        for e in emails:
            startup = db.query(Startup).filter(Startup.id == e.startup_id).first()
            founder = db.query(Founder).filter(Founder.id == e.founder_id).first()
            results.append({
                "id": e.id,
                "startup_id": e.startup_id,
                "startup_name": startup.name if startup else "Unknown",
                "founder_name": founder.name if founder else "Unknown",
                "template_type": e.template_type,
                "subject": e.subject,
                "body": e.body,
                "sent_at": e.sent_at.isoformat() if e.sent_at else None,
                "opened_at": e.opened_at.isoformat() if e.opened_at else None,
                "replied_at": e.replied_at.isoformat() if e.replied_at else None,
                "thread_id": e.gmail_thread_id
            })
        return results
    finally:
        db.close()

# (generate_outreach moved to end of file to use ai_utils engine)

# --- Scores ---
@app.get("/api/scores")
def get_scores(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        scores = db.query(Score).all()
        results = []
        for sc in scores:
            startup = db.query(Startup).filter(Startup.id == sc.startup_id).first()
            results.append({
                "id": sc.id,
                "startup_id": sc.startup_id,
                "startup_name": startup.name if startup else "Unknown",
                "dimensions": sc.dimensions,
                "total_score": sc.total_score,
                "verdict": sc.verdict,
                "rationale": sc.rationale
            })
        return results
    finally:
        db.close()

# --- Leads (Sourcing) ---
@app.get("/api/leads")
def get_leads(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        leads = db.query(SourcingLead).all()
        results = []
        for l in leads:
            results.append({
                "id": l.id,
                "company_name": l.company_name,
                "website": l.website,
                "description": l.description,
                "source": l.source,
                "signal_score": l.signal_score,
                "status": l.status,
                "discovered_at": l.discovered_at.isoformat() if l.discovered_at else None
            })
        return results
    finally:
        db.close()

@app.put("/api/leads/{lead_id}")
def update_lead(lead_id: int, payload: dict = Body(...), current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        lead = db.query(SourcingLead).filter(SourcingLead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        if "status" in payload:
            lead.status = payload["status"]
        db.commit()
        return {"message": "Lead updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
@app.post("/api/sourcing/run")
def run_sourcing_crawlers(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Triggers the sourcing crawlers in the background."""
    background_tasks.add_task(sourcing.run_crawlers_and_evaluate)
    return {"message": "Crawlers started successfully"}

# --- Startups ---
@app.get("/api/startups")
def get_startups(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startups = db.query(Startup).all()
        results = []
        for s in startups:
            results.append({
                "id": s.id,
                "name": s.name,
                "sector": s.sector,
                "stage": s.stage,
                "description": s.description,
                "revenue_arr": s.revenue_arr,
                "revenue_growth_pct": s.revenue_growth_pct,
                "ai_score": s.ai_score,
                "investment_verdict": s.investment_verdict,
                "ai_summary": s.ai_summary,
                "pipeline_stage": s.pipeline_stage,
                "valuation": s.valuation,
                "website": s.website,
                "location": s.location
            })
        return results
    finally:
        db.close()

# --- Tasks ---
@app.post("/api/tasks")
def create_task(payload: TaskCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        due = None
        if payload.due_date:
            try:
                due = datetime.fromisoformat(payload.due_date.replace("Z", "+00:00"))
            except Exception:
                pass
        new_task = Task(
            title=payload.title,
            startup_id=payload.startup_id,
            assignee=payload.assignee or "Sarah Jenkins",
            priority=payload.priority or "Medium",
            status=payload.status or "Pending",
            due_date=due,
            source="web"
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return {"id": new_task.id, "message": "Task created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        for key, value in payload.dict(exclude_unset=True).items():
            if key == "due_date" and value:
                try:
                    task.due_date = datetime.fromisoformat(value.replace("Z", "+00:00"))
                except Exception:
                    pass
            elif hasattr(task, key):
                setattr(task, key, value)
                
        db.commit()
        return {"message": "Task updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        db.delete(task)
        db.commit()
        return {"message": "Task deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# --- Notes ---
@app.post("/api/notes")
def create_note(payload: NoteCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        new_note = Note(
            startup_id=payload.startup_id,
            founder_id=payload.founder_id,
            author=payload.author or "Sarah Jenkins",
            content=payload.content,
            note_type=payload.note_type or "manual",
            source=payload.source or "web",
            tags=payload.tags or []
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        return {"id": new_note.id, "message": "Note created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/notes/{note_id}")
def update_note(note_id: int, payload: NoteUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        for key, value in payload.dict(exclude_unset=True).items():
            if hasattr(note, key):
                setattr(note, key, value)
                
        db.commit()
        return {"message": "Note updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        db.delete(note)
        db.commit()
        return {"message": "Note deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- Founders ---
@app.get("/api/founders")
def get_founders(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        founders = db.query(Founder).all()
        results = []
        for f in founders:
            startup = db.query(Startup).filter(Startup.id == f.startup_id).first()
            results.append({
                "id": f.id,
                "name": f.name,
                "email": f.email,
                "linkedin": f.linkedin,
                "twitter": f.twitter,
                "title": f.title,
                "background": f.background,
                "previous_companies": f.previous_companies,
                "education": f.education,
                "trust_score": f.trust_score,
                "responsiveness_score": f.responsiveness_score,
                "execution_score": f.execution_score,
                "startup_id": f.startup_id,
                "startup_name": startup.name if startup else "Unknown"
            })
        return results
    finally:
        db.close()

@app.post("/api/founders")
def create_founder(payload: FounderCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        new_founder = Founder(
            name=payload.name,
            email=payload.email,
            title=payload.title,
            background=payload.background,
            startup_id=payload.startup_id
        )
        db.add(new_founder)
        db.commit()
        db.refresh(new_founder)
        return {"id": new_founder.id, "message": "Founder created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/founders/{founder_id}")
def update_founder(founder_id: int, payload: FounderUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        founder = db.query(Founder).filter(Founder.id == founder_id).first()
        if not founder:
            raise HTTPException(status_code=404, detail="Founder not found")
        
        for key, value in payload.dict(exclude_unset=True).items():
            if hasattr(founder, key):
                setattr(founder, key, value)
                
        db.commit()
        return {"message": "Founder updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/founders/{founder_id}")
def delete_founder(founder_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        founder = db.query(Founder).filter(Founder.id == founder_id).first()
        if not founder:
            raise HTTPException(status_code=404, detail="Founder not found")
        
        db.delete(founder)
        db.commit()
        return {"message": "Founder deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# --- Portfolio (Risks/Runway) ---
@app.get("/api/portfolio")
def get_portfolio(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        portcos = db.query(Portfolio).all()
        events = db.query(MonitoringEvent).order_by(MonitoringEvent.detected_at.desc()).all()
        
        portco_list = []
        for p in portcos:
            startup = db.query(Startup).filter(Startup.id == p.startup_id).first()
            portco_list.append({
                "id": p.id,
                "startup_id": p.startup_id,
                "startup_name": startup.name if startup else "Unknown",
                "current_valuation": p.current_valuation,
                "current_ownership": p.current_ownership,
                "runway_months": p.runway_months,
                "burn_rate": p.burn_rate,
                "risk_level": p.risk_level,
                "last_update": p.last_update_date.isoformat() if p.last_update_date else None
            })
            
        event_list = []
        for ev in events:
            startup = db.query(Startup).filter(Startup.id == ev.startup_id).first()
            event_list.append({
                "id": ev.id,
                "startup_id": ev.startup_id,
                "startup_name": startup.name if startup else "Unknown",
                "event_type": ev.event_type,
                "event_data": ev.event_data,
                "ai_summary": ev.ai_summary,
                "importance_score": ev.importance_score,
                "detected_at": ev.detected_at.isoformat() if ev.detected_at else None
            })
            
        return {
            "portfolio": portco_list,
            "alerts": event_list
        }
    finally:
        db.close()

@app.post("/api/portfolio")
def create_portfolio(payload: PortfolioCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        new_portco = Portfolio(
            startup_id=payload.startup_id,
            current_valuation=payload.current_valuation,
            current_ownership=payload.current_ownership,
            runway_months=payload.runway_months,
            burn_rate=payload.burn_rate,
            risk_level=payload.risk_level,
            last_update_date=datetime.utcnow()
        )
        db.add(new_portco)
        db.commit()
        db.refresh(new_portco)
        return {"id": new_portco.id, "message": "Portfolio entry created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/portfolio/{portfolio_id}")
def update_portfolio(portfolio_id: int, payload: PortfolioUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        portco = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portco:
            raise HTTPException(status_code=404, detail="Portfolio entry not found")
        for key, value in payload.dict(exclude_unset=True).items():
            if hasattr(portco, key):
                setattr(portco, key, value)
        portco.last_update_date = datetime.utcnow()
        db.commit()
        return {"message": "Portfolio updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/portfolio/{portfolio_id}")
def delete_portfolio(portfolio_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        portco = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portco:
            raise HTTPException(status_code=404, detail="Portfolio entry not found")
        db.delete(portco)
        db.commit()
        return {"message": "Portfolio deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/outreach/{outreach_id}")
def update_outreach(outreach_id: int, payload: OutreachUpdateStatus, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        outreach = db.query(OutreachEmail).filter(OutreachEmail.id == outreach_id).first()
        if not outreach:
            raise HTTPException(status_code=404, detail="Outreach not found")
        
        if payload.status == "opened":
            outreach.opened_at = datetime.utcnow()
        elif payload.status == "replied":
            outreach.replied_at = datetime.utcnow()
            
        db.commit()
        return {"message": "Outreach updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/outreach/{outreach_id}")
def delete_outreach(outreach_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        outreach = db.query(OutreachEmail).filter(OutreachEmail.id == outreach_id).first()
        if not outreach:
            raise HTTPException(status_code=404, detail="Outreach not found")
        db.delete(outreach)
        db.commit()
        return {"message": "Outreach deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# --- Network Graph Nodes & Edges ---
@app.get("/api/graph-data")
def get_graph_data(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startups = db.query(Startup).all()
        founders = db.query(Founder).all()
        
        nodes = []
        edges = []
        
        # Core VC firm node
        nodes.append({
            "id": "sr_capital",
            "label": "SR Capital",
            "type": "firm",
            "color": "#818CF8",
            "size": 25
        })
        
        for s in startups:
            nodes.append({
                "id": f"startup_{s.id}",
                "label": s.name,
                "type": "startup",
                "color": "#38BDF8",
                "size": 18,
                "real_id": s.id
            })
            
            # Link from VC to startup if invested or under IC review
            if s.pipeline_stage in ["Invested", "Portfolio Monitoring", "IC Review"]:
                edges.append({
                    "source": "sr_capital",
                    "target": f"startup_{s.id}",
                    "label": "Invested" if s.pipeline_stage != "IC Review" else "IC Review",
                    "color": "#10B981" if s.pipeline_stage != "IC Review" else "#818CF8"
                })
                
        for f in founders:
            nodes.append({
                "id": f"founder_{f.id}",
                "label": f.name,
                "type": "founder",
                "color": "#10B981",
                "size": 14,
                "real_id": f.id,
                "trust_score": f.trust_score,
                "notes": f.notes
            })
            
            # Link from founder to their startup
            edges.append({
                "source": f"founder_{f.id}",
                "target": f"startup_{f.startup_id}",
                "label": f.title,
                "color": "#475569"
            })
            
            # Co-investor mock references in background
            if f.previous_companies:
                for company in f.previous_companies:
                    node_id = f"prev_{company.lower().replace(' ', '_')}"
                    # Add node if not exists
                    if not any(n["id"] == node_id for n in nodes):
                        nodes.append({
                            "id": node_id,
                            "label": company,
                            "type": "legacy",
                            "color": "#475569",
                            "size": 10
                        })
                    edges.append({
                        "source": f"founder_{f.id}",
                        "target": node_id,
                        "label": "Alumni",
                        "color": "#1E293B"
                    })
                    
        return {"nodes": nodes, "edges": edges}
    finally:
        db.close()

# --- Comps Engine ---
@app.get("/api/comps")
def get_comps(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startups = db.query(Startup).all()
        results = []
        
        # Base multiples mock/market benchmarks
        benchmarks = {
            "AI / ML": {"arr_multiple": "24.5x", "rule_of_40": "65%"},
            "Enterprise SaaS": {"arr_multiple": "8.4x", "rule_of_40": "42%"},
            "FinTech": {"arr_multiple": "6.8x", "rule_of_40": "35%"},
            "DevTools / Infra": {"arr_multiple": "14.2x", "rule_of_40": "55%"},
            "HealthTech": {"arr_multiple": "7.5x", "rule_of_40": "38%"},
        }
        
        for s in startups:
            # Calculate mock revenue numbers if string is range
            revenue_str = s.revenue_arr
            multiple_info = benchmarks.get(s.sector, {"arr_multiple": "8.0x", "rule_of_40": "40%"})
            
            results.append({
                "id": s.id,
                "name": s.name,
                "sector": s.sector,
                "stage": s.stage,
                "arr": revenue_str,
                "growth": s.revenue_growth_pct,
                "implied_valuation": s.valuation,
                "multiple": multiple_info["arr_multiple"],
                "rule_of_40": multiple_info["rule_of_40"],
                "verdict": s.investment_verdict or "HOLD"
            })
        return results
    finally:
        db.close()

# --- IC Memo Generator ---
@app.post("/api/generate-memo")
def generate_memo(payload: MemoGenerateRequest, current_user: User = Depends(get_current_user)):
    startup_name = payload.startup_name
    
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.name == startup_name).first()
        score = db.query(Score).filter(Score.startup_id == startup.id).first() if startup else None
    finally:
        db.close()
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        desc = startup.description if (startup and startup.description) else "Data not provided"
        sector = startup.sector if (startup and startup.sector) else "Data not provided"
        prob = startup.problem if (startup and startup.problem) else "Data not provided"
        sol = startup.solution if (startup and startup.solution) else "Data not provided"
        moat = startup.moat if (startup and startup.moat) else "Data not provided"
        rev = startup.revenue_arr if (startup and startup.revenue_arr) else "Data not provided"
        verdict = startup.investment_verdict if (startup and startup.investment_verdict) else "HOLD"
        
        memo_md = f"""# Investment Committee Memo: {startup_name}

## Executive Summary
{desc}

## The Market & Problem
- **Sector:** {sector}
- **Problem Statement:** {prob}

## The Solution & Moat
- **Product Solution:** {sol}
- **Competitive Defensibility (Moat):** {moat}

## Traction & Economics
- **Current ARR:** {rev}

## Key Risks (Red Flags)
- {"No significant risks flagged in current dataset" if startup else "Data not provided"}

## Final Verdict
**AI Verdict:** {verdict}
"""
        return {
            "memo_markdown": memo_md
        }
        
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are a Partner at a top-tier Venture Capital firm.
        Write a highly professional, brutally honest Investment Committee (IC) Memo in Markdown format for the startup: {startup_name}.
        
        Available context:
        - Sector: {startup.sector if startup and startup.sector else 'Unknown'}
        - Description: {startup.description if startup and startup.description else 'Unknown'}
        - Problem: {startup.problem if startup and startup.problem else 'Unknown'}
        - Solution: {startup.solution if startup and startup.solution else 'Unknown'}
        - ARR: {startup.revenue_arr if startup and startup.revenue_arr else 'Unknown'}
        - AI Verdict: {score.verdict if score else 'Unknown'}
        
        CRITICAL: If any context above is "Unknown", DO NOT fabricate or invent facts. Explicitly state "Data not provided" and cite it as an information gap. Do not falsely claim they have "no problem" or "no solution".
        
        Format the memo cleanly with headers:
        # Investment Committee Memo: [Company]
        ## Executive Summary
        ## The Market & Problem
        ## The Solution & Moat
        ## Traction & Economics
        ## Key Risks (Red Flags)
        ## Final Verdict
        
        Return ONLY a JSON object:
        {{
           "memo_markdown": "the raw markdown string..."
        }}
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        parsed = parse_gemini_json(response.text)
        if parsed:
            return parsed
        raise ValueError("JSON parse failed")
    except Exception as e:
        print(f"Memo gen error: {e}")
        return {"memo_markdown": f"# Error Generating Memo\\n\\nSystem encountered an error: {str(e)}"}

# --- Smart Loading Endpoints for Rich Startup Profile ---

@app.get("/api/startups/{startup_id}/core")
def get_startup_core(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        score = db.query(Score).filter(Score.startup_id == startup_id).first()
        
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")
            
        result = {
            "id": startup.id,
            "name": startup.name,
            "sector": startup.sector,
            "stage": startup.stage,
            "location": startup.location,
            "website": startup.website,
            "founded_year": startup.founded_year,
            "description": startup.description,
            "pipeline_stage": startup.pipeline_stage,
            "ai_score": score.total_score if score else startup.ai_score,
            "investment_verdict": startup.investment_verdict,
            "last_interaction_at": startup.last_interaction_at.isoformat() if startup.last_interaction_at else None
        }
        return result
    finally:
        db.close()

def scrape_startup_info_task(startup_id: int):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        if not startup:
            return
            
        print(f"[SCRAPER] Starting background enrichment for {startup.name}")
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("[SCRAPER] No GROQ_API_KEY found, using default fallback enrichment.")
            founder_exists = db.query(Founder).filter(Founder.startup_id == startup_id).first()
            if not founder_exists:
                new_founder = Founder(
                    startup_id=startup_id,
                    name="Alex Rivera",
                    email=f"alex@{startup.name.lower().replace(' ', '')}.com",
                    title="CEO & Founder",
                    background="Ex-Stripe Senior Engineer. Stanford CS.",
                    previous_companies=["Stripe"],
                    education="Stanford University",
                    trust_score=85,
                    responsiveness_score=90,
                    execution_score=88
                )
                db.add(new_founder)
                
            if not startup.description:
                startup.description = f"Developing next-generation solutions for {startup.sector or 'enterprise SaaS'} focusing on efficiency and scale."
            if not startup.location:
                startup.location = "San Francisco, CA"
            if not startup.website:
                startup.website = f"https://www.{startup.name.lower().replace(' ', '')}.com"
                
            db.commit()
            return
            
        client = Groq(api_key=api_key)
        prompt = f"""
        You are a Venture Capital Intelligence Scraper.
        We have just added a new startup: "{startup.name}" in sector "{startup.sector or 'Unspecified'}".
        Find or generate realistic high-conviction tech intelligence about this company and its founders.
        
        Respond ONLY with a valid JSON object matching this schema, no other text:
        {{
          "description": "2-3 sentences explaining their product and technology.",
          "location": "City, State or Country (e.g. San Francisco, CA)",
          "website": "www.domain.com",
          "founder": {{
            "name": "Founder Full Name",
            "title": "Founder Title (e.g. CEO & Founder)",
            "email": "founder@domain.com",
            "background": "pedigree education and previous companies",
            "linkedin": "https://linkedin.com/in/username",
            "previous_companies": ["Company1", "Company2"]
          }}
        }}
        """
        
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        data = json.loads(response.choices[0].message.content)
        
        if data:
            if not startup.description and data.get("description"):
                startup.description = data.get("description")
            if not startup.location and data.get("location"):
                startup.location = data.get("location")
            if not startup.website and data.get("website"):
                startup.website = data.get("website")
                
            f_data = data.get("founder", {})
            if f_data and f_data.get("name"):
                founder_exists = db.query(Founder).filter(Founder.startup_id == startup_id).first()
                if not founder_exists:
                    new_founder = Founder(
                        startup_id=startup_id,
                        name=f_data.get("name"),
                        email=f_data.get("email", ""),
                        linkedin=f_data.get("linkedin", ""),
                        title=f_data.get("title", "CEO & Founder"),
                        background=f_data.get("background", ""),
                        previous_companies=f_data.get("previous_companies", []),
                        trust_score=85,
                        responsiveness_score=85,
                        execution_score=85
                    )
                    db.add(new_founder)
            db.commit()
            print(f"[SCRAPER] Successfully enriched {startup.name}")
    except Exception as e:
        db.rollback()
        print(f"[SCRAPER] Error enriching startup: {e}")
    finally:
        db.close()

@app.post("/api/startups")
def create_startup(payload: StartupCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        new_startup = Startup(
            name=payload.name,
            sector=payload.sector,
            stage=payload.stage,
            website=payload.website,
            location=payload.location,
            description=payload.description,
            revenue_arr=payload.revenue_arr,
            valuation=payload.valuation,
            pipeline_stage=payload.pipeline_stage
        )
        db.add(new_startup)
        db.commit()
        db.refresh(new_startup)
        
        # Trigger background enrichment scraping
        background_tasks.add_task(scrape_startup_info_task, new_startup.id)
        
        return {"id": new_startup.id, "message": "Startup created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/startups/{startup_id}")
def update_startup(startup_id: int, payload: StartupUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")
            
        for key, value in payload.dict(exclude_unset=True).items():
            if hasattr(startup, key):
                setattr(startup, key, value)
                
        db.commit()
        return {"message": "Startup updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/startups/{startup_id}")
def delete_startup(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")
        
        # We should ideally delete associated notes, tasks, meetings, etc.
        # But SQLite with SQLAlchemy can handle cascades if configured, 
        # or we just manually delete relations for safety.
        db.query(Task).filter(Task.startup_id == startup_id).delete()
        db.query(Meeting).filter(Meeting.startup_id == startup_id).delete()
        db.query(Portfolio).filter(Portfolio.startup_id == startup_id).delete()
        db.query(Score).filter(Score.startup_id == startup_id).delete()
        db.query(MonitoringEvent).filter(MonitoringEvent.startup_id == startup_id).delete()
        
        db.delete(startup)
        db.commit()
        return {"message": "Startup and associated data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/api/startups/{startup_id}/founders")
def get_startup_founders(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        founders = db.query(Founder).filter(Founder.startup_id == startup_id).all()
        results = [{
            "id": f.id,
            "name": f.name,
            "title": f.title,
            "email": f.email,
            "linkedin": f.linkedin,
            "trust_score": f.trust_score,
            "responsiveness_score": f.responsiveness_score,
            "background": f.background,
            "previous_companies": f.previous_companies
        } for f in founders]
        return results
    finally:
        db.close()

@app.get("/api/startups/{startup_id}/metrics")
def get_startup_metrics(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        portfolio = db.query(Portfolio).filter(Portfolio.startup_id == startup_id).first()
        
        result = {
            "revenue_arr": startup.revenue_arr if startup else "N/A",
            "revenue_growth_pct": startup.revenue_growth_pct if startup else "N/A",
            "valuation": startup.valuation if startup else "N/A",
            "runway_months": portfolio.runway_months if portfolio else "N/A",
            "burn_rate": portfolio.burn_rate if portfolio else "N/A",
            "current_ownership": portfolio.current_ownership if portfolio else 0.0,
            "risk_level": portfolio.risk_level if portfolio else "UNKNOWN"
        }
        return result
    finally:
        db.close()

@app.get("/api/startups/{startup_id}/tasks")
def get_startup_tasks(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        tasks = db.query(Task).filter(Task.startup_id == startup_id).all()
        results = [{
            "id": t.id,
            "title": t.title,
            "assignee": t.assignee,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None
        } for t in tasks]
        
        # Mocking a default task if none exist for demonstration of the operational panel
        if not results:
            results = [
                {"id": "mock1", "title": "Review AI IC Memo", "assignee": "Sarah J.", "status": "Pending", "priority": "High", "due_date": None},
                {"id": "mock2", "title": "Request updated Cap Table", "assignee": "Analyst", "status": "Waiting on Founder", "priority": "Medium", "due_date": None}
            ]
            
        return results
    finally:
        db.close()

@app.get("/api/startups/{startup_id}/history")
def get_startup_history(startup_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        # get meetings, outreach, monitoring, and notes, sort chronologically
        meetings = db.query(Meeting).filter(Meeting.startup_id == startup_id).all()
        outreach = db.query(OutreachEmail).filter(OutreachEmail.startup_id == startup_id).all()
        monitoring = db.query(MonitoringEvent).filter(MonitoringEvent.startup_id == startup_id).all()
        notes = db.query(Note).filter(Note.startup_id == startup_id).all()
        
        history = []
        
        for m in meetings:
            history.append({
                "type": "meeting",
                "id": m.id,
                "title": m.meeting_type,
                "summary": m.ai_summary,
                "date": m.scheduled_at.isoformat() if m.scheduled_at else None,
                "transcript": m.raw_transcript
            })
            
        for o in outreach:
            history.append({
                "type": "outreach",
                "id": o.id,
                "title": f"Email: {o.subject}",
                "summary": f"Sent via {o.template_type} template. Opened: {bool(o.opened_at)}. Replied: {bool(o.replied_at)}",
                "date": o.sent_at.isoformat() if o.sent_at else None,
                "transcript": o.body
            })
            
        for ev in monitoring:
            history.append({
                "type": "event",
                "id": ev.id,
                "title": ev.event_type,
                "summary": ev.ai_summary,
                "date": ev.detected_at.isoformat() if ev.detected_at else None,
                "transcript": None
            })
            
        for n in notes:
            history.append({
                "type": "note",
                "id": n.id,
                "title": f"Note: {n.note_type.capitalize()}",
                "summary": n.content,
                "date": n.created_at.isoformat() if n.created_at else None,
                "transcript": None
            })
        
        # Sort history by date descending
        history.sort(key=lambda x: x["date"] or "", reverse=True)
        
        return history
    finally:
        db.close()

@app.post("/api/startups/{startup_id}/pipeline")
def update_startup_pipeline(startup_id: int, payload: PipelineUpdate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == startup_id).first()
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")
            
        new_stage = payload.stage
        if new_stage:
            old_stage = startup.pipeline_stage
            startup.pipeline_stage = new_stage
            
            # Log this as a monitoring event (activity log)
            event = MonitoringEvent(
                startup_id=startup.id,
                event_type="Pipeline Transition",
                event_data={"old_stage": old_stage, "new_stage": new_stage},
                ai_summary=f"Startup moved from {old_stage} to {new_stage}.",
                importance_score=80
            )
            db.add(event)
            db.commit()
            return {"message": "Pipeline updated", "stage": new_stage}
        return {"message": "No stage provided"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

from backend import ai_utils

@app.post("/api/analyze-copilot")
def analyze_copilot(req: CopilotAnalyzeRequest, current_user: User = Depends(get_current_user)):
    try:
        result = ai_utils.analyze_copilot_transcript(req.transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-outreach")
def generate_outreach(req: OutreachGenerateRequest, current_user: User = Depends(get_current_user)):
    try:
        # Get current user name, default firm to "SR Capital" for demo (could be added to User model)
        sender_name = current_user.full_name or "Sarah Jenkins"
        if sender_name == "SR Admin":
            sender_name = "Sarah Jenkins"
        sender_firm = "SR Capital" 
        result = ai_utils.generate_outreach_email(req.startup_name, req.founder_name, req.template_type, sender_name, sender_firm)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)


@app.post("/api/truth-engine")
def run_truth_engine(payload: TruthEngineRequest, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        startup = db.query(Startup).filter(Startup.id == payload.startup_id).first()
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")

        founders = db.query(Founder).filter(Founder.startup_id == payload.startup_id).all()
        meetings = db.query(Meeting).filter(Meeting.startup_id == payload.startup_id).all()
        decks = db.query(Deck).filter(Deck.startup_id == payload.startup_id).all()

        prompt = f'''
        You are the VC Scope OS Deal Truth Engine. Your job is to act as a cynical, highly analytical due diligence auditor for a venture capital firm.
        
        You are auditing a startup named {startup.name} in the {startup.sector} space.
        
        Here are the claims they make:
        - Revenue ARR: {startup.revenue_arr}
        - Description: {startup.description}
        - Problem: {startup.problem}
        - Solution: {startup.solution}
        - Moat: {startup.moat}
        
        Founders: {[{'name': f.name, 'background': f.background} for f in founders]}
        Meeting Transcripts & AI Summaries: {[{'summary': m.ai_summary, 'concerns': m.key_concerns} for m in meetings]}
        Deck Content: {[d.extracted_text for d in decks]}
        
        Cross-reference the startup claims with their meeting transcripts, deck contents, and founder backgrounds.
        Output ONLY a JSON payload with NO markdown block formatting, in this exact structure:
        {{
            "verified_claims": ["Claim 1", "Claim 2"],
            "unsupported_claims": ["Claim 1"],
            "contradictions": ["Contradiction 1"],
            "investor_questions": ["Question 1"],
            "confidence_score": 75
        }}
        '''

        import google.generativeai as genai
        import json
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        
        return json.loads(text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
