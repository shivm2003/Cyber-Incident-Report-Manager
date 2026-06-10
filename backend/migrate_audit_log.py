"""
Migration script to increase varchar column sizes in automation_audit_logs table
This fixes the StringDataRightTruncation error when storing large entity_ids
"""

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

def migrate_audit_log():
    db = SessionLocal()
    try:
        print("[*] Starting migration: Increasing varchar limits for automation_audit_logs...")
        
        # Check if table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'automation_audit_logs'
            )
        """)).fetchone()
        
        if not result[0]:
            print("[X] Table 'automation_audit_logs' does not exist. Skipping migration.")
            return
        
        print("[+] Table found. Altering columns...")
        
        # Alter entity_id to varchar(5000)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN entity_id TYPE varchar(5000)"))
            print("[+] entity_id column updated to varchar(5000)")
        except Exception as e:
            print(f"[!] Error altering entity_id: {e}")
        
        # Alter entity_title to varchar(500)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN entity_title TYPE varchar(500)"))
            print("[+] entity_title column updated to varchar(500)")
        except Exception as e:
            print(f"[!] Error altering entity_title: {e}")
        
        # Alter scan_status to varchar(50)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN scan_status TYPE varchar(50)"))
            print("[+] scan_status column updated to varchar(50)")
        except Exception as e:
            print(f"[!] Error altering scan_status: {e}")
        
        # Alter match_status to varchar(50)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN match_status TYPE varchar(50)"))
            print("[+] match_status column updated to varchar(50)")
        except Exception as e:
            print(f"[!] Error altering match_status: {e}")
        
        # Alter details to varchar(50000)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN details TYPE varchar(50000)"))
            print("[+] details column updated to varchar(50000)")
        except Exception as e:
            print(f"[!] Error altering details: {e}")
        
        # Alter entity_type to varchar(50)
        try:
            db.execute(text("ALTER TABLE automation_audit_logs ALTER COLUMN entity_type TYPE varchar(50)"))
            print("[+] entity_type column updated to varchar(50)")
        except Exception as e:
            print(f"[!] Error altering entity_type: {e}")
        
        db.commit()
        print("[+] Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"[X] Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_audit_log()
