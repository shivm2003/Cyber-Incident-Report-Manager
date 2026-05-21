import requests
import os
from dotenv import load_dotenv

load_dotenv()

def test_ollama():
    try:
        prompt = """
        You are a Senior Cyber Security Officer (CSO) analyzing a security incident.
        Incident: Test Incident
        Details: Test details.

        Provide a forensic deep-dive in JSON format with exactly these four keys:
        1. "breach_process": A 3-step technical timeline of how the breach likely occurred.
        2. "affected_customers": An estimation of who and what volume of customers/entities are impacted.
        3. "technical_analysis": A paragraph explaining the vulnerability exploited.
        4. "official_report": A 500-word authoritative professional Cyber Security Report for stakeholders.

        Return ONLY the JSON. No markdown. No intro.
        """
        base_url = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
        model = os.getenv('OLLAMA_MODEL', 'gemma4:e4b')
        
        response = requests.post(f'{base_url}/api/generate', json={
            'model': model,
            'prompt': prompt,
            'stream': False,
            'format': 'json'
        }, timeout=600)
        print(f"Status: {response.status_code}")
        
        raw_text = response.json().get('response', '{}')
        print("RAW RESPONSE:")
        print(repr(raw_text))
        
        import json
        data = json.loads(raw_text)
        print("JSON PARSED SUCCESSFULLY")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ollama()
