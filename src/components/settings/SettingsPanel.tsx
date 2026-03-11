import { useState, useRef } from "react";
import {
  Car,
  MapPin,
  Cloud,
  Camera,
  WifiOff,
  Trash2,
  Edit2,
  Globe,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  ExternalLink,
} from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useLocationStore } from "../../store/useLocationStore.ts";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { VEHICLE_PRESETS, SPREADSHEET_URL, APP_VERSION } from "../../constants/defaults.ts";
import { exportJson, importJson } from "../../utils/json-io.ts";
import type { ChargingLocation, Theme } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface SettingsPanelProps {
  t: Translations;
}

export function SettingsPanel({ t }: SettingsPanelProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const updateLocation = useLocationStore((s) => s.updateLocation);
  const removeLocation = useLocationStore((s) => s.removeLocation);

  const history = useChargingStore((s) => s.history);
  const importRecords = useChargingStore((s) => s.importRecords);
  const offlineQueue = useChargingStore((s) => s.offlineQueue);
  const showToast = useToastStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newLoc, setNewLoc] = useState<Omit<ChargingLocation, "id">>({
    name: "",
    voltage: 200,
    amperage: 15,
    kw: 3.0,
  });
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  const handleSaveLocation = () => {
    if (!newLoc.name) return;
    if (editingLocId) {
      updateLocation(editingLocId, newLoc);
      setEditingLocId(null);
    } else {
      addLocation(newLoc);
    }
    setNewLoc({ name: "", voltage: 200, amperage: 15, kw: 3.0 });
  };

  const startEdit = (loc: ChargingLocation) => {
    setNewLoc({
      name: loc.name,
      voltage: loc.voltage,
      amperage: loc.amperage,
      kw: loc.kw,
    });
    setEditingLocId(loc.id);
  };

  const cancelEdit = () => {
    setNewLoc({ name: "", voltage: 200, amperage: 15, kw: 3.0 });
    setEditingLocId(null);
  };

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: t.light },
    { value: "dark", icon: Moon, label: t.dark },
    { value: "system", icon: Monitor, label: t.systemDefault },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scroll pb-4 space-y-6">
      {/* Theme */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3 flex items-center gap-2">
          <Sun size={16} /> {t.theme}
        </h3>
        <div className="flex gap-2">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                theme === value
                  ? "border-ev-primary bg-ev-primary/5 text-ev-primary"
                  : "border-border dark:border-dark-border text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3 flex items-center gap-2">
          <Globe size={16} /> {t.language}
        </h3>
        <div className="flex gap-2">
          {(["en", "ja"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                lang === l
                  ? "border-ev-primary bg-ev-primary/5 text-ev-primary"
                  : "border-border dark:border-dark-border text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {l === "en" ? "English" : "日本語"}
            </button>
          ))}
        </div>
      </section>

      {/* Vehicle Settings */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3 flex items-center gap-2">
          <Car size={16} /> {t.vehicle}
        </h3>

        {/* Presets */}
        <div className="mb-3">
          <label className="text-text-muted text-xs block mb-1">
            {t.vehiclePreset}
          </label>
          <div className="flex flex-wrap gap-1">
            {VEHICLE_PRESETS.map((preset) => (
              <button
                key={preset.capacity}
                onClick={() =>
                  updateSettings({ batteryCapacity: preset.capacity })
                }
                className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                  settings.batteryCapacity === preset.capacity
                    ? "border-ev-primary bg-ev-primary/5 text-ev-primary"
                    : "border-border dark:border-dark-border text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-text-muted text-xs block mb-1">
              {t.batteryCapacity}
            </label>
            <input
              type="number"
              value={settings.batteryCapacity}
              onChange={(e) =>
                updateSettings({ batteryCapacity: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
            />
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">
              {t.electricityRate}
            </label>
            <input
              type="number"
              value={settings.electricityRate}
              onChange={(e) =>
                updateSettings({ electricityRate: Number(e.target.value) })
              }
              step="0.01"
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.useNightRate}
              onChange={(e) =>
                updateSettings({ useNightRate: e.target.checked })
              }
              className="w-4 h-4 accent-ev-primary"
            />
            <label className="text-text-muted text-sm">{t.nightRate}</label>
            {settings.useNightRate && (
              <input
                type="number"
                value={settings.nightRate}
                onChange={(e) =>
                  updateSettings({ nightRate: Number(e.target.value) })
                }
                step="0.01"
                className="rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm w-24 ml-auto text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
              />
            )}
          </div>
        </div>
      </section>

      {/* Charging Locations */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-2 flex items-center gap-2">
          <MapPin size={16} /> {t.chargingLocations}
        </h3>
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`flex justify-between items-center p-2 rounded-lg border transition-colors ${
                editingLocId === loc.id
                  ? "border-ev-primary bg-ev-primary/5"
                  : "border-border dark:border-dark-border bg-white dark:bg-dark-surface"
              }`}
            >
              <div>
                <div className="font-medium text-sm text-ev-primary">
                  {loc.name}
                </div>
                <div className="text-xs text-text-muted">
                  {loc.voltage}V / {loc.amperage}A / {loc.kw}kW
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(loc)}
                  className="text-text-muted hover:text-ev-primary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => removeLocation(loc.id)}
                  className="text-text-muted hover:text-ev-error transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-xs text-text-muted italic">
              {t.noLocations}
            </div>
          )}
        </div>

        <div className="bg-surface-alt dark:bg-gray-800/50 p-3 rounded-xl border border-border dark:border-dark-border">
          <div className="text-xs text-text-muted mb-2 uppercase font-medium">
            {editingLocId ? t.editLocation : t.addNewLocation}
          </div>
          <input
            type="text"
            placeholder="Name"
            value={newLoc.name}
            onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
            className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 mb-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
          />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="number"
              placeholder="V"
              value={newLoc.voltage}
              onChange={(e) =>
                setNewLoc({ ...newLoc, voltage: Number(e.target.value) })
              }
              className="rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
            />
            <input
              type="number"
              placeholder="A"
              value={newLoc.amperage}
              onChange={(e) =>
                setNewLoc({ ...newLoc, amperage: Number(e.target.value) })
              }
              className="rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
            />
            <input
              type="number"
              placeholder="kW"
              value={newLoc.kw}
              onChange={(e) =>
                setNewLoc({ ...newLoc, kw: Number(e.target.value) })
              }
              className="rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
            />
          </div>
          <button
            onClick={handleSaveLocation}
            className="w-full py-2 bg-ev-primary text-white rounded-lg text-sm font-medium hover:bg-ev-primary-dark transition-colors mb-1"
          >
            {editingLocId ? t.updateLocation : t.addLocation}
          </button>
          {editingLocId && (
            <button
              onClick={cancelEdit}
              className="w-full py-1 text-xs text-text-muted hover:text-text-primary underline"
            >
              {t.cancelEdit}
            </button>
          )}
        </div>
      </section>

      {/* Gemini API Key */}
      <section>
        <label className="text-sm font-semibold text-text-primary dark:text-dark-text mb-2 flex items-center gap-2">
          <Camera size={16} /> {t.geminiApiKey}
        </label>
        <input
          type="password"
          value={settings.geminiApiKey ?? ""}
          onChange={(e) => updateSettings({ geminiApiKey: e.target.value || undefined })}
          placeholder="AIza..."
          className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-3 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
        />
        <p className="text-xs text-text-muted mt-1 pl-1">{t.geminiApiKeyHint}</p>
      </section>

      {/* GAS URL */}
      <section>
        <label className="text-sm font-semibold text-text-primary dark:text-dark-text mb-2 flex items-center gap-2">
          <Cloud size={16} /> {t.gasUrl}
        </label>
        <input
          type="text"
          value={settings.gasUrl}
          onChange={(e) => updateSettings({ gasUrl: e.target.value })}
          placeholder="https://script.google.com/..."
          className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-3 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
        />
        <a
          href={SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-ev-primary/50 text-ev-primary text-sm font-medium hover:bg-ev-primary/5 transition-colors"
        >
          <ExternalLink size={14} /> {t.openSpreadsheet}
        </a>
      </section>

      {/* JSON Import/Export */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3 flex items-center gap-2">
          <Download size={16} /> {t.jsonExport} / {t.jsonImport}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              exportJson(history, locations, settings);
              showToast(t.jsonExportSuccess, "success");
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-ev-primary text-ev-primary text-sm font-medium hover:bg-ev-primary/5 transition-colors"
          >
            <Download size={14} /> {t.jsonExport}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-ev-secondary text-ev-secondary text-sm font-medium hover:bg-ev-secondary/5 transition-colors"
          >
            <Upload size={14} /> {t.jsonImport}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const data = await importJson(file);
              const imported = importRecords(data.history);
              showToast(
                t.jsonImportSuccess.replace("{n}", String(imported)),
                "success",
              );
              if (data.history.length - imported > 0) {
                showToast(
                  t.jsonImportSkipped.replace(
                    "{n}",
                    String(data.history.length - imported),
                  ),
                  "info",
                );
              }
            } catch {
              showToast(t.jsonImportError, "error");
            }
            e.target.value = "";
          }}
        />
      </section>

      {/* Offline Queue Status */}
      {offlineQueue.length > 0 && (
        <section className="bg-ev-warning/10 border border-ev-warning/30 rounded-xl p-3">
          <div className="text-ev-warning text-sm font-medium flex items-center gap-2">
            <WifiOff size={14} /> {t.offlineQueue}: {offlineQueue.length}{" "}
            {t.pendingItems}
          </div>
          <p className="text-xs text-text-muted mt-1">{t.autoSendOnline}</p>
        </section>
      )}

      {/* Version */}
      <div className="text-center text-xs text-text-muted pt-2">
        EV Manager v{APP_VERSION}
      </div>
    </div>
  );
}
