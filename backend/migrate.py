from database import engine
from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    
    print("[!] STARTING DATABASE MIGRATION...")
    
    # Tables to check
    tables = {
        "incidents": [
            ("company_impact_status", "VARCHAR"),
            ("company_impact_reason", "VARCHAR"),
            ("company_impact_score", "INTEGER DEFAULT 0"),
            ("review_status", "VARCHAR DEFAULT 'Pending'"),
            ("impact_flag", "INTEGER DEFAULT 0"),
            ("detection_method", "VARCHAR"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("raw_data", "JSON"),
            ("full_analysis", "VARCHAR"),
            ("crawled_content", "VARCHAR")
        ],
        "cves": [
            ("company_impact_score", "INTEGER DEFAULT 0"),
            ("company_impact_reason", "VARCHAR"),
            ("review_status", "VARCHAR DEFAULT 'Pending'"),
            ("impact_flag", "INTEGER DEFAULT 0"),
            ("detection_method", "VARCHAR"),
            ("company_name", "VARCHAR"),
            ("product_name", "VARCHAR"),
            ("ai_summary", "VARCHAR"),
            ("ai_tags", "JSON"),
            ("ai_processed", "INTEGER DEFAULT 0"),
            ("pull_type", "VARCHAR"),
            ("pull_params", "JSON"),
            ("search_session_id", "VARCHAR"),
            ("raw_data", "JSON"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "company_profiles": [
            ("company_name", "VARCHAR"),
            ("tech_stack", "JSON"),
            ("industry", "VARCHAR"),
            ("last_updated", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "impact_reports": [
            ("incident_title", "VARCHAR"),
            ("root_cause", "VARCHAR"),
            ("business_impact", "VARCHAR"),
            ("operational_impact", "VARCHAR"),
            ("financial_impact", "VARCHAR"),
            ("reputational_impact", "VARCHAR"),
            ("data_involved", "VARCHAR"),
            ("data_classification", "VARCHAR"),
            ("attack_type", "VARCHAR"),
            ("breach_method", "VARCHAR"),
            ("debug_prompt", "VARCHAR"),
            ("published", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "mitre_mappings": [
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "companies": [
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "combined_reports": [
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]
    }
    
    print(f"Existing tables: {inspector.get_table_names()}")
    
    for table_name, columns in tables.items():
        if table_name not in inspector.get_table_names():
            print(f"[!] Table {table_name} DOES NOT EXIST. Creating it...")
            try:
                # Use SQLAlchemy to create the specific table
                # We can import models and use the metadata
                import models
                table_obj = models.Base.metadata.tables.get(table_name)
                if table_obj is not None:
                    table_obj.create(bind=engine)
                    print(f"[+] Table {table_name} created.")
                else:
                    print(f"[X] Could not find table object for {table_name} in models.py")
            except Exception as e:
                print(f"[X] Error creating table {table_name}: {e}")
            continue
            
        existing_columns = [c['name'] for c in inspector.get_columns(table_name)]
        
        with engine.connect() as conn:
            for col_name, col_type in columns:
                if col_name not in existing_columns:
                    try:
                        print(f"[>] Adding column {col_name} to {table_name}...")
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"[+] Added column {col_name} to {table_name}")
                    except Exception as e:
                        print(f"[X] Error adding {col_name} to {table_name}: {e}")
                        conn.rollback()
                else:
                    print(f"[-] Column {col_name} already exists in {table_name}")

    print("[!] MIGRATION COMPLETE.")

if __name__ == "__main__":
    migrate()
