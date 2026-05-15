import os
import re
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

# Use the same logic as database.py
username = "postgres"
password = "Shivraj@123456"
host = "localhost"
database = "cyber_monitor"
safe_password = urllib.parse.quote_plus(password)
DATABASE_URL = f"postgresql://{username}:{safe_password}@{host}/{database}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def clean_html(text_content):
    if not text_content:
        return ""
    # Basic regex to strip tags
    clean = re.compile('<.*?>')
    cleaned_text = re.sub(clean, ' ', text_content)
    # Clean up whitespace
    cleaned_text = ' '.join(cleaned_text.split())
    return cleaned_text

def cleanup_database():
    db = SessionLocal()
    try:
        print("[*] Starting database HTML cleanup...")
        
        # 1. Clean incidents table
        incidents = db.execute(text("SELECT id, description, ai_summary FROM incidents")).fetchall()
        for idx, row in enumerate(incidents):
            inc_id, desc, ai_sum = row
            new_desc = clean_html(desc)
            new_ai_sum = clean_html(ai_sum)
            
            if new_desc != desc or new_ai_sum != ai_sum:
                db.execute(
                    text("UPDATE incidents SET description = :desc, ai_summary = :ai_sum WHERE id = :id"),
                    {"desc": new_desc, "ai_sum": new_ai_sum, "id": inc_id}
                )
        
        # 2. Clean impact_reports table
        reports = db.execute(text("SELECT id, official_report, technical_analysis, breach_process FROM impact_reports")).fetchall()
        for row in reports:
            rep_id, official, technical, breach = row
            new_official = clean_html(official)
            new_technical = clean_html(technical)
            new_breach = clean_html(breach)
            
            if new_official != official or new_technical != technical or new_breach != breach:
                db.execute(
                    text("UPDATE impact_reports SET official_report = :off, technical_analysis = :tech, breach_process = :breach WHERE id = :id"),
                    {"off": new_official, "tech": new_technical, "breach": new_breach, "id": rep_id}
                )
        
        db.commit()
        print(f"[+] Cleanup complete! Processed {len(incidents)} incidents and {len(reports)} reports.")
        
    except Exception as e:
        print(f"[-] Cleanup failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_database()
