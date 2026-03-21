export const APP_VERSION = "4.5.8";

export const PRE_CONFIGURED_GAS_URL =
  "https://script.google.com/macros/s/AKfycbwtU2yzzRnHLkiI1ebAJ1bDCvq0K6_v7Yi94A1Xm13mEzq0KzGIHr512FzV1O53k0wcRA/exec";

export const DEFAULT_GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ?? "";

export const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Cvn4oUoN7lsd5VW0MufgwSwrdNC-LE9VbPwZ2eG0cvA";

export const STORAGE_KEY_DATA = "ev_gravity_data_v1";
export const STORAGE_KEY_SETTINGS = "ev_gravity_settings_v1";
export const STORAGE_KEY_SESSION = "ev_gravity_session_v1";
export const STORAGE_KEY_LOCATIONS = "ev_gravity_locations_v1";
export const STORAGE_KEY_QUEUE = "ev_gravity_queue_v1";
export const STORAGE_KEY_ONBOARDING = "ev_gravity_onboarding_done";
export const STORAGE_KEY_LANG = "ev_gravity_lang";

export const DEFAULT_BATTERY_CAPACITY = 30;
export const DEFAULT_ELECTRICITY_RATE = 31;
export const DEFAULT_NIGHT_RATE = 17.78;
export const MAX_CHARGE_HOURS = 24;

export const VEHICLE_PRESETS = [
  { label: "Nissan Leaf 30kWh (AZE0)", capacity: 30 },
  { label: "Nissan Leaf 40kWh (ZE1)", capacity: 40 },
  { label: "Nissan Leaf 62kWh (ZE1e+)", capacity: 62 },
  { label: "Nissan Sakura 20kWh", capacity: 20 },
] as const;

export const CSV_HEADERS = {
  en: [
    "Date",
    "Start Time",
    "End Time",
    "Odometer",
    "Start %",
    "End %",
    "Start Range",
    "End Range",
    "Charged kWh",
    "Cost (JPY)",
    "Duration",
    "Charge Speed (kW)",
    "Efficiency",
    "Location",
    "Start Range AC ON",
    "End Range AC ON",
  ],
  ja: [
    "日時",
    "開始時刻",
    "終了時刻",
    "走行距離",
    "開始%",
    "終了%",
    "開始航続",
    "終了航続",
    "充電量kWh",
    "コスト(円)",
    "所要時間",
    "充電速度(kW)",
    "電費",
    "場所",
    "開始航続AC ON",
    "終了航続AC ON",
  ],
} as const;
