from sqlalchemy import create_engine, text
import urllib.parse
import json

username = "postgres"
password = "Shivraj@123456"
host = "localhost"
database = "cyber_monitor"
safe_password = urllib.parse.quote_plus(password)
SQLALCHEMY_DATABASE_URL = f"postgresql://{username}:{safe_password}@{host}/{database}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # Get the latest incident with raw_data
    result = conn.execute(text("SELECT id, title, raw_data FROM incidents WHERE raw_data IS NOT NULL ORDER BY id DESC LIMIT 1"))
    row = result.fetchone()
    if row:
        print(f"ID: {row[0]}")
        print(f"Title: {row[1]}")
        print(f"Raw Data (first 200 chars): {json.dumps(row[2])[:200]}...")
    else:
        print("No incidents with raw_data found.")
