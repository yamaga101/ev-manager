#!/usr/bin/env python3
"""
Consolidate Raw_Data + ダッシュボード記録 → Charging_Logs in a single sheet.
Uses yamaga101 OAuth token for Sheets API access.
"""

import json
import sys
from pathlib import Path

import google.auth.transport.requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SPREADSHEET_ID = "1Cvn4oUoN7lsd5VW0MufgwSwrdNC-LE9VbPwZ2eG0cvA"
TOKEN_PATH = Path.home() / ".config" / "google-api" / "token.json"

UNIFIED_HEADERS = [
    "Timestamp", "ID", "Status", "Start Time", "End Time",
    "Location", "Start Odo", "Start SoC", "Start Range",
    "End SoC", "End Range", "Added kWh", "Cost",
    "Efficiency", "Duration (mins)", "Record Type",
    "FileName", "TripMeter", "AC_OFF_Range",
    "ChargingState", "VehicleTime", "Memo",
]


def get_service():
    token_data = json.loads(TOKEN_PATH.read_text())
    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data.get("scopes", []),
    )
    if creds.expired:
        creds.refresh(google.auth.transport.requests.Request())
        token_data["token"] = creds.token
        TOKEN_PATH.write_text(json.dumps(token_data))
    return build("sheets", "v4", credentials=creds)


def read_range(service, range_str):
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range=range_str
    ).execute()
    return result.get("values", [])


def main():
    service = get_service()
    rows_to_append = []

    # --- 1. Parse Raw_Data ---
    print("Reading Raw_Data...")
    raw_data = read_range(service, "Raw_Data!A2:B1000")
    for i, row in enumerate(raw_data):
        if len(row) < 2:
            continue
        timestamp = row[0]
        try:
            obj = json.loads(row[1])
        except json.JSONDecodeError:
            print(f"  Skip row {i+2}: JSON parse error")
            continue

        rid = obj.get("id", f"raw-{i}")
        rows_to_append.append([
            timestamp,
            rid,
            obj.get("status", ""),
            obj.get("startTime", ""),
            obj.get("endTime", ""),
            obj.get("location", ""),
            "",
            "",
            obj.get("startRange", ""),
            obj.get("endSoC", ""),
            obj.get("endRange", ""),
            "",
            str(obj.get("cost", "")),
            "",
            "",
            "raw",
        ])
    print(f"  {len(rows_to_append)} rows from Raw_Data")

    # --- 2. Parse ダッシュボード記録 ---
    print("Reading ダッシュボード記録...")
    dash_data = read_range(service, "'ダッシュボード記録'!A2:L1000")
    dash_count = 0
    for row in dash_data:
        # Pad row to 12 columns
        while len(row) < 12:
            row.append("")
        file_name = row[0]
        shot_time = row[1]
        dash_id = "dash-" + file_name.replace(".jpg", "").replace(".png", "")

        rows_to_append.append([
            shot_time,       # Timestamp
            dash_id,         # ID
            "",              # Status
            "",              # Start Time
            "",              # End Time
            "",              # Location
            row[4],          # Start Odo (オドメーター)
            row[3],          # Start SoC (バッテリー残量%)
            row[6],          # Start Range (航続可能距離)
            "",              # End SoC
            "",              # End Range
            "",              # Added kWh
            "",              # Cost
            row[7],          # Efficiency (平均電費)
            "",              # Duration
            "snapshot",      # Record Type
            file_name,       # FileName
            row[5],          # TripMeter
            row[8],          # AC_OFF_Range
            row[9],          # ChargingState
            row[10],         # VehicleTime
            row[11],         # Memo
        ])
        dash_count += 1
    print(f"  {dash_count} rows from ダッシュボード記録")

    if not rows_to_append:
        print("No rows to append. Done.")
        return

    # --- 3. Expand Charging_Logs headers ---
    print("Updating Charging_Logs headers...")
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="Charging_Logs!A1",
        valueInputOption="RAW",
        body={"values": [UNIFIED_HEADERS]},
    ).execute()

    # --- 4. Set Record Type = "charging" for existing rows ---
    print("Setting Record Type for existing Charging_Logs rows...")
    existing = read_range(service, "Charging_Logs!A2:A1000")
    existing_count = len(existing)
    if existing_count > 0:
        type_values = [["charging"]] * existing_count
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"Charging_Logs!P2:P{existing_count + 1}",
            valueInputOption="RAW",
            body={"values": type_values},
        ).execute()
    print(f"  {existing_count} existing rows tagged as 'charging'")

    # --- 5. Append consolidated rows ---
    print(f"Appending {len(rows_to_append)} rows to Charging_Logs...")
    service.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range="Charging_Logs!A1",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": rows_to_append},
    ).execute()

    # --- 6. Delete old tabs ---
    print("Deleting old tabs...")
    metadata = service.spreadsheets().get(
        spreadsheetId=SPREADSHEET_ID
    ).execute()

    sheet_ids_to_delete = {}
    for sheet in metadata["sheets"]:
        title = sheet["properties"]["title"]
        if title in ("Raw_Data", "ダッシュボード記録"):
            sheet_ids_to_delete[title] = sheet["properties"]["sheetId"]

    if sheet_ids_to_delete:
        requests = [
            {"deleteSheet": {"sheetId": sid}}
            for sid in sheet_ids_to_delete.values()
        ]
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests},
        ).execute()
        for name in sheet_ids_to_delete:
            print(f"  Deleted: {name}")

    print(f"\nDone! {len(rows_to_append)} rows consolidated into Charging_Logs.")
    print(f"  - Raw_Data: {len(raw_data)} rows merged")
    print(f"  - ダッシュボード記録: {dash_count} rows merged")
    print(f"  - Existing charging: {existing_count} rows tagged")


if __name__ == "__main__":
    main()
