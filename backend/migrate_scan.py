"""
Migration: Add scan_iteration columns and scan_history table
"""
import sys
sys.path.insert(0, '.')

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check existing columns in incidents
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'incidents'"))
    inc_cols = [r[0] for r in result.fetchall()]
    print(f"Incident columns: {inc_cols}")
    
    if 'scan_iteration' not in inc_cols:
        conn.execute(text("ALTER TABLE incidents ADD COLUMN scan_iteration INTEGER DEFAULT 0"))
        print("  -> Added scan_iteration to incidents")
    else:
        print("  -> scan_iteration already exists in incidents")
    
    # Check existing columns in cves
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'cves'"))
    cve_cols = [r[0] for r in result.fetchall()]
    print(f"\nCVE columns: {cve_cols}")
    
    if 'scan_iteration' not in cve_cols:
        conn.execute(text("ALTER TABLE cves ADD COLUMN scan_iteration INTEGER DEFAULT 0"))
        print("  -> Added scan_iteration to cves")
    else:
        print("  -> scan_iteration already exists in cves")
    
    # Create scan_history table
    result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scan_history')"))
    exists = result.fetchone()[0]
    
    if not exists:
        conn.execute(text("""
            CREATE TABLE scan_history (
                id SERIAL PRIMARY KEY,
                iteration INTEGER,
                scan_type VARCHAR,
                incidents_scanned INTEGER DEFAULT 0,
                cves_scanned INTEGER DEFAULT 0,
                threats_found INTEGER DEFAULT 0,
                threats_no_impact INTEGER DEFAULT 0,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                status VARCHAR DEFAULT 'running'
            )
        """))
        conn.execute(text("CREATE INDEX ix_scan_history_iteration ON scan_history(iteration)"))
        print("\n-> Created scan_history table")
    else:
        print("\n-> scan_history table already exists")
    
    conn.commit()
    print("\nMigration complete!")
