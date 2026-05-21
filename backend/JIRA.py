import os
import json
import requests

from datetime import datetime
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth


# ==========================================
# LOAD ENV VARIABLES
# ==========================================

load_dotenv()

JIRA_URL = os.getenv("JIRA_URL")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")




# ==========================================
# HEADERS
# ==========================================

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}


# ==========================================
# HARDCODED PAYLOAD
# ==========================================

payload = {
    "fields": {

        # ----------------------------------
        # PROJECT
        # ----------------------------------

        "project": {
            "key": "CI"
        },

        # ----------------------------------
        # ISSUE TYPE
        # ----------------------------------

        "issuetype": {
            "name": "Task"
        },

        # ----------------------------------
        # SUMMARY
        # ----------------------------------

        "summary": "Test 1",

        # ----------------------------------
        # DESCRIPTION
        # ----------------------------------

        "description": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Test 1"
                        }
                    ]
                }
            ]
        },

        # ----------------------------------
        # ASSIGNEE
        # ----------------------------------

        "assignee": {
            "id": "6422be0257f0c028e2f71e9a"
        },


        # ----------------------------------
        # IMPACT
        # ----------------------------------

        "customfield_13102": "Customer Impacted",

        # ----------------------------------
        # SEVERITY DROPDOWN
        # ----------------------------------

        "customfield_13104": {
            "value": "Critical"
        },

        # ----------------------------------
        # REMARKS
        # ----------------------------------

        "customfield_13103": {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "Immediate action required."
                }
            ]
        }
    ]
}
    }
}


# ==========================================
# API REQUEST
# ==========================================

response = requests.post(
    f"{JIRA_URL}/rest/api/3/issue",
    headers=headers,
    auth=HTTPBasicAuth(
        JIRA_EMAIL,
        JIRA_API_TOKEN
    ),
    data=json.dumps(payload)
)


# ==========================================
# RESPONSE
# ==========================================

if response.status_code == 201:

    data = response.json()

    print("✅ Ticket Created Successfully")
    print("Ticket Key:", data["key"])

else:

    print("❌ Failed to Create Ticket")
    print(response.text)