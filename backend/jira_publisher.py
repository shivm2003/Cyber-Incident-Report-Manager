import os
import requests
from requests.auth import HTTPBasicAuth

def create_jira_issue(
    project_key: str,
    issue_type: str,
    summary: str,
    description: str,
    assignee_id: str,
    impact: str,
    severity: str,
    remarks: str
) -> dict:
    jira_url = os.getenv("JIRA_URL")
    jira_email = os.getenv("JIRA_EMAIL")
    jira_api_token = os.getenv("JIRA_API_TOKEN")

    if not jira_url or not jira_email or not jira_api_token:
        raise ValueError("Missing JIRA credentials in environment variables")

    def text_to_adf(text_str: str) -> dict:
        paragraphs = []
        for line in text_str.split("\n"):
            line = line.strip()
            if not line:
                continue
            paragraphs.append({
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": line
                    }
                ]
            })
        if not paragraphs:
            paragraphs.append({
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "No details provided."
                    }
                ]
            })
        return {
            "type": "doc",
            "version": 1,
            "content": paragraphs
        }

    fields = {
        "project": {"key": project_key},
        "issuetype": {"name": issue_type},
        "summary": summary,
        "description": text_to_adf(description),
        "customfield_13102": impact,
        "customfield_13104": {"value": severity},
        "customfield_13103": text_to_adf(remarks)
    }

    if assignee_id and assignee_id.strip():
        fields["assignee"] = {"id": assignee_id.strip()}

    payload = {"fields": fields}

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{jira_url}/rest/api/3/issue",
        headers=headers,
        auth=HTTPBasicAuth(jira_email, jira_api_token),
        json=payload
    )

    if response.status_code == 201:
        return {"success": True, "data": response.json()}
    else:
        return {"success": False, "status_code": response.status_code, "error": response.text}

def get_jira_projects() -> list:
    jira_url = os.getenv("JIRA_URL")
    jira_email = os.getenv("JIRA_EMAIL")
    jira_api_token = os.getenv("JIRA_API_TOKEN")

    if not jira_url or not jira_email or not jira_api_token:
        raise ValueError("Missing JIRA credentials in environment variables")

    headers = {
        "Accept": "application/json"
    }

    response = requests.get(
        f"{jira_url}/rest/api/3/project",
        headers=headers,
        auth=HTTPBasicAuth(jira_email, jira_api_token)
    )

    if response.status_code == 200:
        projects = response.json()
        return [{"key": p["key"], "name": p["name"]} for p in projects]
    else:
        raise Exception(f"Failed to fetch projects: {response.text}")

def upload_jira_attachments(issue_key: str, files: list) -> dict:
    jira_url = os.getenv("JIRA_URL")
    jira_email = os.getenv("JIRA_EMAIL")
    jira_api_token = os.getenv("JIRA_API_TOKEN")

    if not jira_url or not jira_email or not jira_api_token:
        raise ValueError("Missing JIRA credentials in environment variables")

    headers = {
        "X-Atlassian-Token": "no-check"
    }

    response = requests.post(
        f"{jira_url}/rest/api/3/issue/{issue_key}/attachments",
        headers=headers,
        auth=HTTPBasicAuth(jira_email, jira_api_token),
        files=files
    )

    if response.status_code == 200:
        return {"success": True, "data": response.json()}
    else:
        return {"success": False, "status_code": response.status_code, "error": response.text}


