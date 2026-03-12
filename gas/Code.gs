/**
 * EV Charge Log - Google Apps Script backend v4.4.0
 *
 * Receives POST requests from the PWA and writes records to the
 * corresponding sheet in the active spreadsheet.
 *
 * Sheet layout per type:
 *   Charging_Logs : Timestamp | ID | Status | Start Time | End Time | Location | Start Odo | Start SoC | Start Range | End SoC | End Range | Added kWh | Cost | Efficiency | Duration (mins) | Record Type | FileName | TripMeter | AC_OFF_Range | ChargingState | VehicleTime | Memo
 *   maintenance   : id | date | category | description | cost | odometer | nextDueDate | memo
 *   inspection    : id | date | inspectionType | odometer | cost | soh | nextDueDate | findings
 *   insurance     : id | provider | policyNumber | insuranceType | coverageSummary | premium | startDate | endDate | memo
 *   tax           : id | taxType | amount | dueDate | paidDate | fiscalYear | memo
 *   driveLog      : id | date | departure | destination | distance | startOdometer | endOdometer | efficiency | purpose | memo
 *
 * Idempotency: if the id already exists the row is skipped.
 *
 * Deploy as: "Execute as Me" + "Anyone can access" (no sign-in required)
 */

var GAS_VERSION = "4.5.0";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);

    if (!payload.type) {
      return jsonResponse({ ok: false, error: "missing type" });
    }

    switch (payload.type) {
      case "charging":
        writeCharging(payload);
        break;
      case "maintenance":
        writeMaintenance(payload);
        break;
      case "inspection":
        writeInspection(payload);
        break;
      case "insurance":
        writeInsurance(payload);
        break;
      case "tax":
        writeTax(payload);
        break;
      case "driveLog":
        writeDriveLog(payload);
        break;
      default:
        return jsonResponse({ ok: false, error: "unknown type: " + payload.type });
    }

    return jsonResponse({ ok: true, type: payload.type, id: payload.id });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Per-type writers
// ---------------------------------------------------------------------------

var CHARGING_SHEET = "Charging_Logs";
var CHARGING_HEADERS = [
  "Timestamp", "ID", "Status", "Start Time", "End Time",
  "Location", "Start Odo", "Start SoC", "Start Range",
  "End SoC", "End Range", "Added kWh", "Cost",
  "Efficiency", "Duration (mins)", "Record Type",
  "FileName", "TripMeter", "AC_OFF_Range",
  "ChargingState", "VehicleTime", "Memo",
];

function writeCharging(p) {
  var sheet = getOrCreateSheet(CHARGING_SHEET, CHARGING_HEADERS);

  // ID is in column B (index 2)
  if (idExistsInColumn(sheet, 2, p.id)) return;

  sheet.appendRow([
    new Date(),       // Timestamp
    p.id,             // ID
    p.status,         // Status
    p.startTime,      // Start Time
    p.endTime,        // End Time
    p.location,       // Location
    p.startOdometer,  // Start Odo
    p.startSoC,       // Start SoC
    p.startRange,     // Start Range
    p.endSoC,         // End SoC
    p.endRange,       // End Range
    p.addedKwh,       // Added kWh
    p.cost,           // Cost
    p.efficiency,     // Efficiency
    "",               // Duration (mins) - calculated client-side
    "charging",       // Record Type
  ]);
}

function writeMaintenance(p) {
  var sheet = getOrCreateSheet("maintenance", [
    "id", "date", "category", "description",
    "cost", "odometer", "nextDueDate", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id, p.date, p.category, p.description,
    p.cost, p.odometer, p.nextDueDate, p.memo,
  ]);
}

function writeInspection(p) {
  var sheet = getOrCreateSheet("inspection", [
    "id", "date", "inspectionType", "odometer",
    "cost", "soh", "nextDueDate", "findings",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id, p.date, p.inspectionType, p.odometer,
    p.cost, p.soh, p.nextDueDate, p.findings,
  ]);
}

function writeInsurance(p) {
  var sheet = getOrCreateSheet("insurance", [
    "id", "provider", "policyNumber", "insuranceType",
    "coverageSummary", "premium",
    "startDate", "endDate", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id, p.provider, p.policyNumber, p.insuranceType,
    p.coverageSummary, p.premium,
    p.startDate, p.endDate, p.memo,
  ]);
}

function writeTax(p) {
  var sheet = getOrCreateSheet("tax", [
    "id", "taxType", "amount", "dueDate",
    "paidDate", "fiscalYear", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id, p.taxType, p.amount, p.dueDate,
    p.paidDate, p.fiscalYear, p.memo,
  ]);
}

function writeDriveLog(p) {
  var sheet = getOrCreateSheet("driveLog", [
    "id", "date", "departure", "destination",
    "distance", "startOdometer", "endOdometer",
    "efficiency", "purpose", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id, p.date, p.departure, p.destination,
    p.distance, p.startOdometer, p.endOdometer,
    p.efficiency, p.purpose, p.memo,
  ]);
}

// ---------------------------------------------------------------------------
// One-time migration: consolidate Raw_Data + ダッシュボード記録 → Charging_Logs
// Run this manually from the Apps Script editor once.
// ---------------------------------------------------------------------------

function consolidateSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var target = getOrCreateSheet(CHARGING_SHEET, CHARGING_HEADERS);

  // Ensure header row has all columns (expand if needed)
  var currentHeaders = target.getRange(1, 1, 1, target.getLastColumn()).getValues()[0];
  if (currentHeaders.length < CHARGING_HEADERS.length) {
    var headerRange = target.getRange(1, 1, 1, CHARGING_HEADERS.length);
    headerRange.setValues([CHARGING_HEADERS]);
    headerRange.setFontWeight("bold");
  }

  var addedCount = 0;

  // --- 1. Merge Raw_Data ---
  var rawSheet = ss.getSheetByName("Raw_Data");
  if (rawSheet) {
    var rawData = rawSheet.getDataRange().getValues();
    for (var i = 1; i < rawData.length; i++) {
      var timestamp = rawData[i][0];
      var jsonStr = rawData[i][1];
      try {
        var obj = JSON.parse(jsonStr);
        var id = obj.id || ("raw-" + i);

        if (!idExistsInColumn(target, 2, id)) {
          target.appendRow([
            timestamp,         // Timestamp
            id,                // ID
            obj.status || "",  // Status
            obj.startTime || "", // Start Time
            obj.endTime || "",   // End Time
            obj.location || "",  // Location
            "",                  // Start Odo
            "",                  // Start SoC
            obj.startRange || "", // Start Range
            obj.endSoC || "",    // End SoC
            obj.endRange || "",  // End Range
            "",                  // Added kWh
            obj.cost || "",      // Cost
            "",                  // Efficiency
            "",                  // Duration
            "raw",               // Record Type
          ]);
          addedCount++;
        }
      } catch (e) {
        Logger.log("Raw_Data row " + i + " parse error: " + e);
      }
    }
    ss.deleteSheet(rawSheet);
    Logger.log("Raw_Data merged and deleted.");
  }

  // --- 2. Merge ダッシュボード記録 ---
  var dashSheet = ss.getSheetByName("ダッシュボード記録");
  if (dashSheet) {
    var dashData = dashSheet.getDataRange().getValues();
    // Header: ファイル名(0), 撮影日時(1), データ種別(2), バッテリー残量%(3),
    //         オドメーター(4), トリップメーター(5), 航続可能距離(6),
    //         平均電費(7), エアコンOFF追加距離(8), 充電状態(9), 車載時刻(10), 備考(11)
    for (var j = 1; j < dashData.length; j++) {
      var row = dashData[j];
      var fileName = row[0] || "";
      var shotTime = row[1] || "";
      var dashId = "dash-" + fileName.replace(/\.[^.]+$/, "");

      if (!idExistsInColumn(target, 2, dashId)) {
        target.appendRow([
          shotTime,            // Timestamp (撮影日時)
          dashId,              // ID
          "",                  // Status
          "",                  // Start Time
          "",                  // End Time
          "",                  // Location
          row[4] || "",        // Start Odo (オドメーター)
          row[3] || "",        // Start SoC (バッテリー残量%)
          row[6] || "",        // Start Range (航続可能距離)
          "",                  // End SoC
          "",                  // End Range
          "",                  // Added kWh
          "",                  // Cost
          row[7] || "",        // Efficiency (平均電費)
          "",                  // Duration
          "snapshot",          // Record Type
          fileName,            // FileName
          row[5] || "",        // TripMeter
          row[8] || "",        // AC_OFF_Range
          row[9] || "",        // ChargingState
          row[10] || "",       // VehicleTime
          row[11] || "",       // Memo
        ]);
        addedCount++;
      }
    }
    ss.deleteSheet(dashSheet);
    Logger.log("ダッシュボード記録 merged and deleted.");
  }

  // --- 3. Add Record Type to existing Charging_Logs rows ---
  var lastRow = target.getLastRow();
  if (lastRow > 1) {
    var typeCol = 16; // Column P = Record Type
    var types = target.getRange(2, typeCol, lastRow - 1, 1).getValues();
    for (var k = 0; k < types.length; k++) {
      if (!types[k][0]) {
        target.getRange(k + 2, typeCol).setValue("charging");
      }
    }
  }

  Logger.log("Consolidation complete. " + addedCount + " rows added.");
  SpreadsheetApp.getUi().alert(
    "統合完了: " + addedCount + " 件追加しました。\n" +
    "Raw_Data と ダッシュボード記録 は削除されました。"
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the sheet with the given name, creating it (with a header row)
 * if it does not yet exist.
 */
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Returns true when the given id is already present in column A (row 2+).
 */
function idExists(sheet, id) {
  return idExistsInColumn(sheet, 1, id);
}

/**
 * Returns true when the given id is already present in the specified column.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} col - 1-based column index
 * @param {string} id
 */
function idExistsInColumn(sheet, col, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var ids = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return true;
  }
  return false;
}

/**
 * Serialises an object as a JSON ContentService response.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
