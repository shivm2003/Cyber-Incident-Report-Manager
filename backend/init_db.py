from database import engine, Base
import models

def init_db():
    print("[!] Initializing database...")
    print(f"[*] Target Engine: {engine.url}")
    
    # Create all tables defined in models.py
    # This uses the Base from database.py which is inherited by all models
    try:
        models.Base.metadata.create_all(bind=engine)
        print("[+] All table schemas created successfully.")
        
        # Verify tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"[+] Current tables in database: {tables}")
        
    except Exception as e:
        print(f"[X] Error initializing database: {e}")

if __name__ == "__main__":
    init_db()
