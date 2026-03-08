/**
 * EV Manager - Google Apps Script backend
 *
 * Receives POST requests from the PWA and writes records to the
 * corresponding sheet in the active spreadsheet.
 *
 * Sheet layout per type:
 *   charging    : id | status | startTime | endTime | startOdometer | efficiency | startSoC | endSoC | startRange | endRange | location | addedKwh | cost
 *   maintenance : id | date | category | description | cost | odometer | nextDueDate | memo
 *   inspection  : id | date | inspectionType | odometer | cost | soh | nextDueDate | findings
 *   insurance   : id | provider | policyNumber | insuranceType | coverageSummary | premium | startDate | endDate | memo
 *   tax         : id | taxType | amount | dueDate | paidDate | fiscalYear | memo
 *   driveLog    : id | date | departure | destination | distance | startOdometer | endOdometer | efficiency | purpose | memo
 *
 * Idempotency: if the id already exists in column A the row is skipped.
 *
 * Deploy as: "Execute as Me" + "Anyone can access" (no sign-in required)
 * so the PWA can POST without OAuth.
 */

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

function writeCharging(p) {
  var sheet = getOrCreateSheet("charging", [
    "id", "status", "startTime", "endTime",
    "startOdometer", "efficiency",
    "startSoC", "endSoC",
    "startRange", "endRange",
    "location", "addedKwh", "cost",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id,
    p.status,
    p.startTime,
    p.endTime,
    p.startOdometer,
    p.efficiency,
    p.startSoC,
    p.endSoC,
    p.startRange,
    p.endRange,
    p.location,
    p.addedKwh,
    p.cost,
  ]);
}

function writeMaintenance(p) {
  var sheet = getOrCreateSheet("maintenance", [
    "id", "date", "category", "description",
    "cost", "odometer", "nextDueDate", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id,
    p.date,
    p.category,
    p.description,
    p.cost,
    p.odometer,
    p.nextDueDate,
    p.memo,
  ]);
}

function writeInspection(p) {
  var sheet = getOrCreateSheet("inspection", [
    "id", "date", "inspectionType", "odometer",
    "cost", "soh", "nextDueDate", "findings",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id,
    p.date,
    p.inspectionType,
    p.odometer,
    p.cost,
    p.soh,
    p.nextDueDate,
    p.findings,
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
    p.id,
    p.provider,
    p.policyNumber,
    p.insuranceType,
    p.coverageSummary,
    p.premium,
    p.startDate,
    p.endDate,
    p.memo,
  ]);
}

function writeTax(p) {
  var sheet = getOrCreateSheet("tax", [
    "id", "taxType", "amount", "dueDate",
    "paidDate", "fiscalYear", "memo",
  ]);

  if (idExists(sheet, p.id)) return;

  sheet.appendRow([
    p.id,
    p.taxType,
    p.amount,
    p.dueDate,
    p.paidDate,
    p.fiscalYear,
    p.memo,
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
    p.id,
    p.date,
    p.departure,
    p.destination,
    p.distance,
    p.startOdometer,
    p.endOdometer,
    p.efficiency,
    p.purpose,
    p.memo,
  ]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the sheet with the given name, creating it (with a header row)
 * if it does not yet exist.
 *
 * @param {string} name
 * @param {string[]} headers
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Bold header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Returns true when the given id is already present in column A
 * (skipping the header row in row 1).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} id
 * @returns {boolean}
 */
function idExists(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  // Read the entire id column at once for performance
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return true;
  }
  return false;
}

/**
 * Serialises an object as a JSON ContentService response.
 *
 * @param {object} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
