import datetime
from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    print("Connected to PostgreSQL.")
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='company_profiles' and column_name='auto_retry_start_date';"
    ))
    row = result.fetchone()
    
    if not row:
        print("Adding auto_retry_start_date column...")
        conn.execute(text("ALTER TABLE company_profiles ADD COLUMN auto_retry_start_date TIMESTAMP;"))
        
        default_date = datetime.datetime(2026, 5, 20).strftime('%Y-%m-%d %H:%M:%S')
        conn.execute(text("UPDATE company_profiles SET auto_retry_start_date = :date"), {"date": default_date})
        conn.commit()
        print("Column added successfully with default date.")
    else:
        print("Column already exists.")
