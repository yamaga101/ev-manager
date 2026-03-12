#!/usr/bin/env python3
"""Delete the empty 電費ログ sheet (data is already in Charging_Logs)."""

import json
from pathlib import Path

import google.auth.transport.requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SPREADSHEET_ID = "1Cvn4oUoN7lsd5VW0MufgwSwrdNC-LE9VbPwZ2eG0cvA"
TOKEN_PATH = Path.home() / ".config" / "google-api" / "token.json"
SHEETS_TO_DELETE = ["電費ログ"]


def main():
    token_data = json.loads(TOKEN_PATH.read_text())
    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
    )
    creds.refresh(google.auth.transport.requests.Request())
    token_data["token"] = creds.token
    TOKEN_PATH.write_text(json.dumps(token_data))

    service = build("sheets", "v4", credentials=creds)
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()

    requests = []
    for sheet in meta["sheets"]:
        title = sheet["properties"]["title"]
        if title in SHEETS_TO_DELETE:
            sid = sheet["properties"]["sheetId"]
            requests.append({"deleteSheet": {"sheetId": sid}})
            print(f"Will delete: {title} (sheetId={sid})")

    if requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests},
        ).execute()
        print("Done.")
    else:
        print("No matching sheets found.")


if __name__ == "__main__":
    main()
