from database import SessionLocal
import models

def check_ai_data():
    db = SessionLocal()
    try:
        incidents = db.query(models.Incident).all()
        total = len(incidents)
        with_ai = len([i for i in incidents if i.ai_summary and len(i.ai_summary) > 10])
        print(f"Total Incidents: {total}")
        print(f"Incidents with AI Summary: {with_ai}")
        if total > 0:
            print(f"Sample AI Summary: {incidents[0].ai_summary}")
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_data()
