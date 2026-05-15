import sqlite3
import os

db_path = os.path.join("backend", "sql_app.db")
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT source, count(*) FROM incidents GROUP BY source;")
        rows = cursor.fetchall()
        print("Source distribution:")
        for row in rows:
            print(f"- {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
