import sqlite3
import os

db_path = os.path.join("backend", "sql_app.db")
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT link, COUNT(*) FROM incidents GROUP BY link HAVING COUNT(*) > 1;")
        rows = cursor.fetchall()
        if rows:
            print("Duplicate links found:")
            for row in rows:
                print(f"- {row[0]}: {row[1]} times")
        else:
            print("No identical link duplicates found.")
            
        cursor.execute("SELECT title, COUNT(*) FROM incidents GROUP BY title HAVING COUNT(*) > 1;")
        rows_title = cursor.fetchall()
        if rows_title:
            print("\nDuplicate titles found:")
            for row in rows_title:
                print(f"- {row[0]}: {row[1]} times")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
