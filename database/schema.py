from database.db import engine
from database.models import Base
# Models are registered when Base is imported from models.py

def init_db():
    print("Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    print("Database Schema initialized successfully.")

if __name__ == "__main__":
    init_db()
