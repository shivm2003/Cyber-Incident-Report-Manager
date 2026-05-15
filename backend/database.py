import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

# Database credentials from environment variables
username = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "Shivraj@123456")
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5432")
database = os.getenv("DB_NAME", "cyber_monitor")

# Safely encode the password to handle special characters like '@'
safe_password = urllib.parse.quote_plus(password)

# New Connection String
SQLALCHEMY_DATABASE_URL = f"postgresql://{username}:{safe_password}@{host}:{port}/{database}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def reset_database():
    """Drops and recreates all tables. Use this when deleting tables."""
    # Import locally to avoid circular dependency
    import models
    print("[!] DROPPING ALL TABLES...")
    models.Base.metadata.drop_all(bind=engine)
    Base.metadata.drop_all(bind=engine)
    print("[+] RECREATING TABLES WITH NEW COLUMNS...")
    Base.metadata.create_all(bind=engine)
    print("[+] DATABASE SYNC COMPLETE.")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
