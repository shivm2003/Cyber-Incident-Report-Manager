import time
from database import SessionLocal
import models
from analyzer import classify_attack

def backfill_missing_ai_summaries():
    db = SessionLocal()
    try:
        # Prioritize the most recent incidents
        incidents = db.query(models.Incident).filter(
            (models.Incident.ai_summary == None) | (models.Incident.ai_summary == "")
        ).order_by(models.Incident.date_collected.desc()).all()
        
        total = len(incidents)
        print(f"[*] Found {total} incidents needing AI intelligence backfill.")
        
        for i, inc in enumerate(incidents):
            print(f"    [{i+1}/{total}] Analyzing: {inc.title}...")
            try:
                # Use the enhanced Hybrid Intelligence logic
                res = classify_attack(inc.title, inc.description or "")
                
                if res.get("ai_summary"):
                    inc.ai_summary = res["ai_summary"]
                    # Also refresh metadata just in case
                    inc.attack_type = res["attack_type"]
                    inc.severity = res["severity"]
                    inc.target_entity = res["target_entity"]
                    
                    db.commit()
                    print(f"        [+] Saved AI Brief.")
                else:
                    print(f"        [-] AI Brief unavailable (possible timeout). Skipping.")
            except Exception as e:
                print(f"        [!] Error: {e}")
                db.rollback()
            
            # Small cooldown to prevent CPU overheating on 8GB RAM
            time.sleep(1)
            
    finally:
        db.close()
        print("[*] Backfill process completed.")

if __name__ == "__main__":
    backfill_missing_ai_summaries()
