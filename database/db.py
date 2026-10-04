from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.settings import DATABASE_URL
from database.urls import normalize_database_url
from contextlib import contextmanager

import os

# Render and Neon often provide 'postgres://' which SQLAlchemy 1.4+ requires as 'postgresql://'
db_url = normalize_database_url(DATABASE_URL)

# Programmatic fallback: If running on Render and using SQLite, redirect it to writable /tmp
if (os.getenv("RENDER") == "true" or os.getenv("PORT")) and db_url.startswith("sqlite"):
    db_url = "sqlite:////tmp/antigravity.db"

if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
