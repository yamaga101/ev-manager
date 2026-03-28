/**
 * EV Charge Log - Google Apps Script backend v4.5.9
 *
 * Receives POST requests from the PWA and writes records to the
 * corresponding sheet in the active spreadsheet.
 *
 * Security hardening:
 *   - Requires a shared token in payload.token
 *   - Stores the shared token in Script Properties
 *   - Creates a daily trigger for cleanupOldIdempotencyKeys if missing
 *
 * Sheet layout per type:
 *   charging     : Timestamp | ID | Status | Start Time | End Time | Location | Start Odo | Start SoC | Start Range | Start Range AC ON | End SoC | End Range | End Range AC ON | Added kWh | Cost | Efficiency | Duration (mins) | Record Type | FileName | TripMeter | AC_OFF_Range | ChargingState | VehicleTime | Memo
 *   maintenance  : id | date | category | description | cost | odometer | nextDueDate | memo
 *   inspection   : id | date | inspectionType | odometer | cost | soh | nextDueDate | findings
 *   insurance    : id | provider | policyNumber | insuranceType | coverageSummary | premium | startDate | endDate | memo
 *   tax          : id | taxType | amount | dueDate | paidDate | fiscalYear | memo
 *   driveLog     : id | date | departure | destination | distance | startOdometer | endOdometer | efficiency | purpose | memo
 */

var GAS_VERSION = "4.6.1";
var SPREADSHEET_ID = "1Cvn4oUoN7lsd5VW0MufgwSwrdNC-LE9VbPwZ2eG0cvA";
var SHARED_TOKEN_PROPERTY = "EV_MANAGER_SHARED_TOKEN";
var IDEMPOTENCY_PREFIX = "idem:";
var CLEANUP_TRIGGER_HANDLER = "cleanupOldIdempotencyKeys";
var CLEANUP_TRIGGER_HOUR = 3;

var CHARGING_SHEET = "充電ログ";
var CHARGING_HEADERS = [
  "Timestamp", "ID", "Status", "Start Time", "End Time",
  "Location", "Start Odo", "Start SoC", "Start Range", "Start Range AC ON",
  "End SoC", "End Range", "End Range AC ON", "Added kWh", "Cost",
  "Efficiency", "Duration (mins)", "Record Type",
  "FileName", "TripMeter", "AC_OFF_Range",
  "ChargingState", "VehicleTime", "Memo",
];

function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);

    if (!payload.type) {
      return jsonResponse({ ok: false, error: "missing type" });
    }

    var auth = authorizePayload_(payload);
    if (!auth.ok) {
      return jsonResponse(auth);
    }

    ensureMaintenanceTriggers_();

    if (payload.type === "ping") {
      return jsonResponse({ ok: true, type: "ping", version: GAS_VERSION, now: new Date().toISOString() });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var idempotencyKey = payload.idempotencyKey || "";
      if (idempotencyKey && isKeyProcessed(idempotencyKey)) {
        return jsonResponse({ ok: true, type: payload.type, id: payload.id, duplicate: true });
      }

      switch (payload.type) {
        case "charging":
        case "snapshot":
          writeCharging(payload);
          break;
        case "patch":
          patchCharging(payload);
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

      if (idempotencyKey) {
        recordIdempotencyKey(idempotencyKey);
      }

      return jsonResponse({ ok: true, type: payload.type, id: payload.id });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function authorizePayload_(payload) {
  var secret = getSharedToken_();
  if (!secret) {
    return { ok: false, error: "shared token is not configured" };
  }
  if (!payload.token || String(payload.token) !== String(secret)) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true };
}

function getSharedToken_() {
  return PropertiesService.getScriptProperties().getProperty(SHARED_TOKEN_PROPERTY) || "";
}

function setSharedToken(token) {
  if (!token) {
    throw new Error("token is required");
  }
  PropertiesService.getScriptProperties().setProperty(SHARED_TOKEN_PROPERTY, String(token));
}

function rotateSharedToken() {
  var token = "evm_" + Utilities.getUuid().replace(/-/g, "");
  setSharedToken(token);
  Logger.log("Shared token rotated. Save this value into VITE_GAS_SHARED_TOKEN or settings.gasSharedToken: " + token);
  return token;
}

function clearSharedToken() {
  PropertiesService.getScriptProperties().deleteProperty(SHARED_TOKEN_PROPERTY);
}

function ensureMaintenanceTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  var cleanupTriggers = [];

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === CLEANUP_TRIGGER_HANDLER) {
      cleanupTriggers.push(triggers[i]);
    }
  }

  if (cleanupTriggers.length === 0) {
    ScriptApp.newTrigger(CLEANUP_TRIGGER_HANDLER)
      .timeBased()
      .atHour(CLEANUP_TRIGGER_HOUR)
      .everyDays(1)
      .inTimezone(Session.getScriptTimeZone())
      .create();
    return;
  }

  for (var j = 1; j < cleanupTriggers.length; j++) {
    ScriptApp.deleteTrigger(cleanupTriggers[j]);
  }
}

function installMaintenanceTriggers() {
  ensureMaintenanceTriggers_();
}

function writeCharging(p) {
  var sheet = getOrCreateSheet(CHARGING_SHEET, CHARGING_HEADERS);
  if (idExistsInColumn(sheet, 2, p.id)) return;

  sheet.appendRow([
    new Date(),
    p.id,
    p.status || "",
    p.startTime || "",
    p.endTime || "",
    p.location || "",
    p.startOdometer || "",
    p.startSoC || "",
    p.startRange || "",
    p.startRangeAcOn || "",
    p.endSoC || "",
    p.endRange || "",
    p.endRangeAcOn || "",
    p.addedKwh || "",
    p.cost || "",
    p.efficiency || "",
    "",
    p.recordType || "charging",
    p.fileName || "",
    p.tripMeter || "",
    p.acOffRange || "",
    p.chargingState || "",
    p.vehicleTime || "",
    p.memo || "",
  ]);
}

function patchCharging(p) {
  var sheet = getOrCreateSheet(CHARGING_SHEET, CHARGING_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(p.id)) {
      var row = i + 2;
      if (p.addedKwh) sheet.getRange(row, 14).setValue(p.addedKwh);
      if (p.startRange) sheet.getRange(row, 9).setValue(p.startRange);
      if (p.startRangeAcOn) sheet.getRange(row, 10).setValue(p.startRangeAcOn);
      if (p.endRange) sheet.getRange(row, 12).setValue(p.endRange);
      if (p.endRangeAcOn) sheet.getRange(row, 13).setValue(p.endRangeAcOn);
      if (p.efficiency) sheet.getRange(row, 16).setValue(p.efficiency);
      if (p.memo) sheet.getRange(row, 24).setValue(p.memo);
      return;
    }
  }
}

function writeMaintenance(p) {
  var sheet = getOrCreateSheet("maintenance", [
    "id", "date", "category", "description", "cost", "odometer", "nextDueDate", "memo",
  ]);
  if (idExists(sheet, p.id)) return;
  sheet.appendRow([
    p.id, p.date, p.category, p.description, p.cost, p.odometer, p.nextDueDate, p.memo,
  ]);
}

function writeInspection(p) {
  var sheet = getOrCreateSheet("inspection", [
    "id", "date", "inspectionType", "odometer", "cost", "soh", "nextDueDate", "findings",
  ]);
  if (idExists(sheet, p.id)) return;
  sheet.appendRow([
    p.id, p.date, p.inspectionType, p.odometer, p.cost, p.soh, p.nextDueDate, p.findings,
  ]);
}

function writeInsurance(p) {
  var sheet = getOrCreateSheet("insurance", [
    "id", "provider", "policyNumber", "insuranceType", "coverageSummary", "premium", "startDate", "endDate", "memo",
  ]);
  if (idExists(sheet, p.id)) return;
  sheet.appendRow([
    p.id, p.provider, p.policyNumber, p.insuranceType, p.coverageSummary, p.premium, p.startDate, p.endDate, p.memo,
  ]);
}

function writeTax(p) {
  var sheet = getOrCreateSheet("tax", [
    "id", "taxType", "amount", "dueDate", "paidDate", "fiscalYear", "memo",
  ]);
  if (idExists(sheet, p.id)) return;
  sheet.appendRow([
    p.id, p.taxType, p.amount, p.dueDate, p.paidDate, p.fiscalYear, p.memo,
  ]);
}

function writeDriveLog(p) {
  var sheet = getOrCreateSheet("driveLog", [
    "id", "date", "departure", "destination", "distance", "startOdometer", "endOdometer", "efficiency", "purpose", "memo",
  ]);
  if (idExists(sheet, p.id)) return;
  sheet.appendRow([
    p.id, p.date, p.departure, p.destination, p.distance, p.startOdometer, p.endOdometer, p.efficiency, p.purpose, p.memo,
  ]);
}

function consolidateSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var target = getOrCreateSheet(CHARGING_SHEET, CHARGING_HEADERS);

  var currentHeaders = target.getRange(1, 1, 1, target.getLastColumn()).getValues()[0];
  if (currentHeaders.length < CHARGING_HEADERS.length) {
    var headerRange = target.getRange(1, 1, 1, CHARGING_HEADERS.length);
    headerRange.setValues([CHARGING_HEADERS]);
    headerRange.setFontWeight("bold");
  }

  var addedCount = 0;

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
            timestamp,
            id,
            obj.status || "",
            obj.startTime || "",
            obj.endTime || "",
            obj.location || "",
            "",
            "",
            obj.startRange || "",
            "",
            obj.endSoC || "",
            obj.endRange || "",
            "",
            "",
            obj.cost || "",
            "",
            "",
            "raw",
          ]);
          addedCount++;
        }
      } catch (err) {
        Logger.log("Raw_Data row " + i + " parse error: " + err);
      }
    }
    ss.deleteSheet(rawSheet);
    Logger.log("Raw_Data merged and deleted.");
  }

  var dashSheet = ss.getSheetByName("ダッシュボード記録");
  if (dashSheet) {
    var dashData = dashSheet.getDataRange().getValues();
    for (var j = 1; j < dashData.length; j++) {
      var row = dashData[j];
      var fileName = row[0] || "";
      var shotTime = row[1] || "";
      var dashId = "dash-" + fileName.replace(/\.[^.]+$/, "");
      if (!idExistsInColumn(target, 2, dashId)) {
        target.appendRow([
          shotTime,
          dashId,
          "",
          "",
          "",
          "",
          row[4] || "",
          row[3] || "",
          row[6] || "",
          "",
          "",
          "",
          "",
          "",
          "",
          row[7] || "",
          "",
          "snapshot",
          fileName,
          row[5] || "",
          row[8] || "",
          row[9] || "",
          row[10] || "",
          row[11] || "",
        ]);
        addedCount++;
      }
    }
    ss.deleteSheet(dashSheet);
    Logger.log("ダッシュボード記録 merged and deleted.");
  }

  var lastRow = target.getLastRow();
  if (lastRow > 1) {
    var typeCol = 18;
    var types = target.getRange(2, typeCol, lastRow - 1, 1).getValues();
    for (var k = 0; k < types.length; k++) {
      if (!types[k][0]) {
        target.getRange(k + 2, typeCol).setValue("charging");
      }
    }
  }

  Logger.log("Consolidation complete. " + addedCount + " rows added.");
  Logger.log("統合完了: " + addedCount + " 件追加しました。Raw_Data と ダッシュボード記録 は削除されました。");
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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

function idExists(sheet, id) {
  return idExistsInColumn(sheet, 1, id);
}

function idExistsInColumn(sheet, col, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return true;
  }
  return false;
}

function isKeyProcessed(key) {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty(IDEMPOTENCY_PREFIX + key) !== null;
}

function recordIdempotencyKey(key) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(IDEMPOTENCY_PREFIX + key, new Date().toISOString());
}

function cleanupOldIdempotencyKeys() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  var deleted = 0;
  for (var key in all) {
    if (key.indexOf(IDEMPOTENCY_PREFIX) === 0) {
      var date = new Date(all[key]);
      if (date < cutoff) {
        props.deleteProperty(key);
        deleted++;
      }
    }
  }
  Logger.log("Cleaned up " + deleted + " old idempotency keys.");
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
