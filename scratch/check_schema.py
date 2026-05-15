from sqlalchemy import create_engine, text
import urllib.parse

username = "postgres"
password = "Shivraj@123456"
host = "localhost"
database = "cyber_monitor"
safe_password = urllib.parse.quote_plus(password)
SQLALCHEMY_DATABASE_URL = f"postgresql://{username}:{safe_password}@{host}/{database}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incidents'"))
    for row in result:
        print(row)
