from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
# USER MODEL
# Why: Stores login credentials for authentication.
# Passwords are NEVER stored raw — only the bcrypt hash.
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="partner")  # partner | analyst | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    outreach_identity = Column(JSON, nullable=True)


class Startup(Base):
    __tablename__ = 'startups'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sector = Column(String)
    stage = Column(String)
    website = Column(String)
    linkedin = Column(String)
    deck_url = Column(String)
    team_size = Column(Integer)
    location = Column(String)
    founded_year = Column(Integer)
    description = Column(Text)
    problem = Column(Text)
    solution = Column(Text)
    moat = Column(Text)
    gtm = Column(Text)
    revenue_arr = Column(String)
    revenue_growth_pct = Column(String)
    last_round = Column(String)
    valuation = Column(String)
    pipeline_stage = Column(String, default="Sourced")
    priority = Column(Integer, default=1)
    assigned_partner = Column(String)
    ai_score = Column(Integer, default=0)
    investment_verdict = Column(String)
    ai_summary = Column(Text)
    tags = Column(JSON)
    last_interaction_at = Column(DateTime)
    next_action_date = Column(DateTime)
    source = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    founders = relationship("Founder", back_populates="startup")
    meetings = relationship("Meeting", back_populates="startup")
    notes = relationship("Note", back_populates="startup")
    scores = relationship("Score", back_populates="startup", uselist=False)
    decks = relationship("Deck", back_populates="startup")
    tasks = relationship("Task", back_populates="startup")
    deals = relationship("Deal", back_populates="startup")
    portfolio = relationship("Portfolio", back_populates="startup", uselist=False)
    monitoring_events = relationship("MonitoringEvent", back_populates="startup")
    whatsapp_messages = relationship("WhatsappMessage", back_populates="startup")
    outreach_emails = relationship("OutreachEmail", back_populates="startup")

class Founder(Base):
    __tablename__ = 'founders'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    name = Column(String)
    email = Column(String)
    linkedin = Column(String)
    twitter = Column(String)
    title = Column(String)
    background = Column(Text)
    previous_companies = Column(JSON)
    education = Column(Text)
    trust_score = Column(Integer)
    responsiveness_score = Column(Integer)
    execution_score = Column(Integer)
    notes = Column(Text)
    
    startup = relationship("Startup", back_populates="founders")
    outreach_emails = relationship("OutreachEmail", back_populates="founder")

class Meeting(Base):
    __tablename__ = 'meetings'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    founder_ids = Column(JSON) # List of IDs
    meeting_type = Column(String)
    scheduled_at = Column(DateTime)
    duration_minutes = Column(Integer)
    raw_transcript = Column(Text)
    ai_summary = Column(Text)
    key_concerns = Column(JSON)
    action_items = Column(JSON)
    founder_score = Column(Integer)
    live_mode_used = Column(Boolean, default=False)
    
    startup = relationship("Startup", back_populates="meetings")

class Note(Base):
    __tablename__ = 'notes'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    founder_id = Column(Integer, ForeignKey('founders.id'), nullable=True)
    author = Column(String)
    content = Column(Text)
    note_type = Column(String)
    source = Column(String) # web/whatsapp/voice/manual
    tags = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    startup = relationship("Startup", back_populates="notes")

class Score(Base):
    __tablename__ = 'scores'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    dimensions = Column(JSON) # The 10 dimensions
    total_score = Column(Integer)
    verdict = Column(String)
    rationale = Column(Text)
    
    startup = relationship("Startup", back_populates="scores")

class Deck(Base):
    __tablename__ = 'decks'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    file_path = Column(String)
    extracted_text = Column(Text)
    analysis_json = Column(JSON)
    agent_results_json = Column(JSON)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    startup = relationship("Startup", back_populates="decks")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    title = Column(String)
    startup_id = Column(Integer, ForeignKey('startups.id'), nullable=True)
    assignee = Column(String)
    due_date = Column(DateTime)
    priority = Column(String)
    status = Column(String, default="Pending")
    source = Column(String)
    
    startup = relationship("Startup", back_populates="tasks")

class Deal(Base):
    __tablename__ = 'deals'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    round_type = Column(String)
    round_size = Column(String)
    valuation_cap = Column(String)
    check_size = Column(String)
    ownership_pct = Column(Float)
    safe_terms_json = Column(JSON)
    status = Column(String)
    
    startup = relationship("Startup", back_populates="deals")

class Portfolio(Base):
    __tablename__ = 'portfolio'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    current_valuation = Column(String)
    current_ownership = Column(Float)
    runway_months = Column(Integer)
    burn_rate = Column(String)
    risk_level = Column(String)
    last_update_date = Column(DateTime)
    
    startup = relationship("Startup", back_populates="portfolio")

class MonitoringEvent(Base):
    __tablename__ = 'monitoring_events'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'))
    event_type = Column(String)
    event_data = Column(JSON)
    ai_summary = Column(Text)
    importance_score = Column(Integer)
    detected_at = Column(DateTime, default=datetime.utcnow)
    
    startup = relationship("Startup", back_populates="monitoring_events")

class WhatsappMessage(Base):
    __tablename__ = 'whatsapp_messages'
    id = Column(Integer, primary_key=True)
    partner_id = Column(String)
    direction = Column(String) # in/out
    message_text = Column(Text)
    media_url = Column(String)
    intent_detected = Column(String)
    startup_id_linked = Column(Integer, ForeignKey('startups.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    startup = relationship("Startup", back_populates="whatsapp_messages")

class SourcingLead(Base):
    __tablename__ = 'sourcing_leads'
    id = Column(Integer, primary_key=True)
    company_name = Column(String)
    website = Column(String)
    description = Column(Text)
    source = Column(String)
    signal_score = Column(Integer)
    status = Column(String, default="New")
    discovered_at = Column(DateTime, default=datetime.utcnow)

class OutreachEmail(Base):
    __tablename__ = 'outreach_emails'
    id = Column(Integer, primary_key=True)
    startup_id = Column(Integer, ForeignKey('startups.id'), nullable=True)
    founder_id = Column(Integer, ForeignKey('founders.id'), nullable=True)
    
    startup = relationship("Startup", back_populates="outreach_emails")
    founder = relationship("Founder", back_populates="outreach_emails")
    template_type = Column(String)
    subject = Column(String)
    body = Column(Text)
    sent_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    gmail_thread_id = Column(String)
