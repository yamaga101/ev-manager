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
  Navigation,
  Shield,
  Radio,
} from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useLocationStore } from "../../store/useLocationStore.ts";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import {
  VEHICLE_PRESETS,
  SPREADSHEET_URL,
  APP_VERSION,
} from "../../constants/defaults.ts";
import { exportJson, importJson } from "../../utils/json-io.ts";
import { pingGas } from "../../../shared/utils/gas-sync.ts";
import type { ChargingLocation, Theme } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface SettingsPanelProps {
  t: Translations;
}

const DEFAULT_LOCATION_DRAFT: Omit<ChargingLocation, "id"> = {
  name: "",
  voltage: 200,
  amperage: 15,
  kw: 3.0,
  lat: undefined,
  lng: undefined,
  radiusMeters: 120,
  lastUsedAt: undefined,
};

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
  const outbox = useSyncStore((s) => s.outbox);
  const showToast = useToastStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newLoc, setNewLoc] = useState<Omit<ChargingLocation, "id">>(DEFAULT_LOCATION_DRAFT);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTestingGas, setIsTestingGas] = useState(false);

  const handleSaveLocation = () => {
    if (!newLoc.name) return;
    const normalized: Omit<ChargingLocation, "id"> = {
      ...newLoc,
      lat: Number.isFinite(newLoc.lat) ? Number(newLoc.lat) : undefined,
      lng: Number.isFinite(newLoc.lng) ? Number(newLoc.lng) : undefined,
      radiusMeters: Number.isFinite(newLoc.radiusMeters)
        ? Number(newLoc.radiusMeters)
        : 120,
    };
    if (editingLocId) {
      updateLocation(editingLocId, normalized);
      setEditingLocId(null);
    } else {
      addLocation(normalized);
    }
    setNewLoc(DEFAULT_LOCATION_DRAFT);
  };

  const startEdit = (loc: ChargingLocation) => {
    setNewLoc({
      name: loc.name,
      voltage: loc.voltage,
      amperage: loc.amperage,
      kw: loc.kw,
      lat: loc.lat,
      lng: loc.lng,
      radiusMeters: loc.radiusMeters ?? 120,
      lastUsedAt: loc.lastUsedAt,
    });
    setEditingLocId(loc.id);
  };

  const cancelEdit = () => {
    setNewLoc(DEFAULT_LOCATION_DRAFT);
    setEditingLocId(null);
  };

  const handleUseCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      showToast(t.locationPermissionDenied, "info");
      return;
    }
    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 5 * 60 * 1000,
        });
      });
      const roundedLat = Number(position.coords.latitude.toFixed(6));
      const roundedLng = Number(position.coords.longitude.toFixed(6));
      const radiusMeters = Math.max(
        80,
        Math.min(250, Math.round(position.coords.accuracy || 120)),
      );
      setNewLoc((prev) => ({
        ...prev,
        lat: roundedLat,
        lng: roundedLng,
        radiusMeters: prev.radiusMeters ?? radiusMeters,
      }));
      showToast(t.locationCaptured, "success");
    } catch {
      showToast(t.locationPermissionDenied, "info");
    } finally {
      setIsLocating(false);
    }
  };

  const handleTestGas = async () => {
    if (!settings.gasUrl) {
      showToast(t.toastGasPingFail, "error");
      return;
    }
    setIsTestingGas(true);
    try {
      const ok = await pingGas(settings.gasUrl, settings.gasSharedToken);
      showToast(ok ? t.toastGasPingOk : t.toastGasPingFail, ok ? "success" : "error");
    } finally {
      setIsTestingGas(false);
    }
  };

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: t.light },
    { value: "dark", icon: Moon, label: t.dark },
    { value: "system", icon: Monitor, label: t.systemDefault },
  ];

  const sectionTitle =
    "font-display text-[10px] font-semibold text-nexus-cyan/60 tracking-[0.2em] uppercase mb-3 flex items-center gap-2";
  const inputBase =
    "w-full rounded-lg border border-border-subtle bg-space-panel p-2.5 text-sm font-mono-data text-text-bright focus:outline-none focus:border-nexus-cyan focus:shadow-[0_0_0_2px_rgba(0,240,255,0.1)] transition-all";

  return (
    <div className="space-y-5 pb-20">
      <section>
        <h3 className={sectionTitle}>{t.theme}</h3>
        <div className="flex gap-2">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                theme === value
                  ? "border-nexus-cyan/30 bg-nexus-cyan-glow text-nexus-cyan shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                  : "border-border-subtle text-text-dim hover:text-text-mid hover:border-border-glow"
              }`}
            >
              <Icon size={16} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>
          <Globe size={14} className="text-nexus-cyan/60" /> {t.language}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setLang("en")}
            className={`flex-1 py-2 rounded-xl border text-sm transition-all ${
              lang === "en"
                ? "border-nexus-cyan/30 bg-nexus-cyan-glow text-nexus-cyan"
                : "border-border-subtle text-text-dim hover:border-border-glow"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`flex-1 py-2 rounded-xl border text-sm transition-all ${
              lang === "ja"
                ? "border-nexus-cyan/30 bg-nexus-cyan-glow text-nexus-cyan"
                : "border-border-subtle text-text-dim hover:border-border-glow"
            }`}
          >
            日本語
          </button>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>
          <Car size={14} className="text-nexus-cyan/60" /> {t.vehicleSettings}
        </h3>
        <div className="space-y-2 glass-panel p-3 rounded-xl">
          <div>
            <div className="text-[9px] text-text-dim mb-1 uppercase tracking-[0.15em] font-medium">
              {t.vehiclePreset}
            </div>
            <select
              value=""
              onChange={(e) => {
                const preset = VEHICLE_PRESETS.find((p) => p.label === e.target.value);
                if (preset) updateSettings({ batteryCapacity: preset.capacity });
              }}
              className={inputBase}
            >
              <option value="">{t.customInput}</option>
              {VEHICLE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-text-dim mb-1 uppercase tracking-[0.15em] font-medium">
                {t.batteryCapacity}
              </div>
              <input
                type="number"
                value={settings.batteryCapacity}
                onChange={(e) =>
                  updateSettings({ batteryCapacity: Number(e.target.value) || 0 })
                }
                className={inputBase}
              />
            </div>
            <div>
              <div className="text-[9px] text-text-dim mb-1 uppercase tracking-[0.15em] font-medium">
                {t.electricityRate}
              </div>
              <input
                type="number"
                value={settings.electricityRate}
                onChange={(e) =>
                  updateSettings({ electricityRate: Number(e.target.value) || 0 })
                }
                className={inputBase}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-bright">
            <input
              id="nightRateEnabled"
              type="checkbox"
              checked={settings.useNightRate}
              onChange={(e) => updateSettings({ useNightRate: e.target.checked })}
            />
            <label htmlFor="nightRateEnabled">{t.nightRate}</label>
            {settings.useNightRate && (
              <input
                type="number"
                value={settings.nightRate}
                onChange={(e) => updateSettings({ nightRate: Number(e.target.value) || 0 })}
                className="rounded-lg border border-border-subtle bg-space-panel p-2 text-sm font-mono-data w-24 ml-auto text-text-bright focus:outline-none focus:border-nexus-cyan"
              />
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>
          <MapPin size={14} className="text-nexus-cyan/60" /> {t.chargingLocations}
        </h3>
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`flex justify-between items-center p-2.5 rounded-lg border transition-all ${
                editingLocId === loc.id
                  ? "border-nexus-cyan/30 bg-nexus-cyan-glow"
                  : "border-border-subtle glass-panel"
              }`}
            >
              <div>
                <div className="font-medium text-sm text-nexus-cyan">{loc.name}</div>
                <div className="text-[10px] text-text-dim font-mono-data">
                  {loc.voltage}V / {loc.amperage}A / {loc.kw}kW
                </div>
                {typeof loc.lat === "number" && typeof loc.lng === "number" && (
                  <div className="text-[10px] text-text-dim font-mono-data">
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)} · r={loc.radiusMeters ?? 120}m
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(loc)}
                  className="text-text-dim hover:text-nexus-cyan transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => removeLocation(loc.id)}
                  className="text-text-dim hover:text-nexus-error transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-[10px] text-text-dim italic tracking-wider">{t.noLocations}</div>
          )}
        </div>

        <div className="glass-panel p-3 rounded-xl">
          <div className="text-[9px] text-text-dim mb-2 uppercase tracking-[0.15em] font-medium">
            {editingLocId ? t.editLocation : t.addNewLocation}
          </div>
          <input
            type="text"
            placeholder="Name"
            value={newLoc.name}
            onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
            className={`${inputBase} mb-2`}
          />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="number"
              placeholder="V"
              value={newLoc.voltage}
              onChange={(e) => setNewLoc({ ...newLoc, voltage: Number(e.target.value) })}
              className={inputBase}
            />
            <input
              type="number"
              placeholder="A"
              value={newLoc.amperage}
              onChange={(e) => setNewLoc({ ...newLoc, amperage: Number(e.target.value) })}
              className={inputBase}
            />
            <input
              type="number"
              placeholder="kW"
              value={newLoc.kw}
              onChange={(e) => setNewLoc({ ...newLoc, kw: Number(e.target.value) })}
              className={inputBase}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="35.000000"
              value={newLoc.lat ?? ""}
              onChange={(e) =>
                setNewLoc({
                  ...newLoc,
                  lat: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className={inputBase}
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder="139.000000"
              value={newLoc.lng ?? ""}
              onChange={(e) =>
                setNewLoc({
                  ...newLoc,
                  lng: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className={inputBase}
            />
            <input
              type="number"
              placeholder="120m"
              value={newLoc.radiusMeters ?? ""}
              onChange={(e) =>
                setNewLoc({
                  ...newLoc,
                  radiusMeters:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className={inputBase}
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full py-2 rounded-lg border border-border-subtle text-sm font-medium text-nexus-cyan hover:border-border-glow transition-all mb-2 disabled:text-text-dim"
          >
            <span className="inline-flex items-center gap-2">
              <Navigation size={14} />
              {isLocating ? "GPS..." : t.useCurrentLocation}
            </span>
          </button>
          <button
            onClick={handleSaveLocation}
            className="btn-plasma w-full py-2 rounded-lg text-sm font-display tracking-wider mb-1"
          >
            {editingLocId ? t.updateLocation : t.addLocation}
          </button>
          {editingLocId && (
            <button
              onClick={cancelEdit}
              className="w-full py-1 text-[10px] text-text-dim hover:text-nexus-cyan tracking-wider uppercase transition-colors"
            >
              {t.cancelEdit}
            </button>
          )}
        </div>
      </section>

      <section>
        <label className={sectionTitle}>
          <Camera size={14} className="text-nexus-cyan/60" /> {t.geminiApiKey}
        </label>
        <input
          type="password"
          value={settings.geminiApiKey ?? ""}
          onChange={(e) => updateSettings({ geminiApiKey: e.target.value || undefined })}
          placeholder="AIza..."
          className={inputBase}
        />
        <p className="text-[10px] text-text-dim mt-1 pl-1">{t.geminiApiKeyHint}</p>
      </section>

      <section>
        <label className={sectionTitle}>
          <Cloud size={14} className="text-nexus-cyan/60" /> {t.gasUrl}
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={settings.gasUrl}
            onChange={(e) => updateSettings({ gasUrl: e.target.value })}
            placeholder="https://script.google.com/..."
            className={inputBase}
          />
          <label className={sectionTitle}>
            <Shield size={14} className="text-nexus-cyan/60" /> {t.gasSharedToken}
          </label>
          <input
            type="password"
            value={settings.gasSharedToken ?? ""}
            onChange={(e) =>
              updateSettings({ gasSharedToken: e.target.value || undefined })
            }
            placeholder="evm_..."
            className={inputBase}
          />
          <p className="text-[10px] text-text-dim pl-1">{t.gasSharedTokenHint}</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 rounded-xl btn-neon text-sm"
            >
              <ExternalLink size={13} /> {t.openSpreadsheet}
            </a>
            <button
              type="button"
              onClick={handleTestGas}
              disabled={isTestingGas}
              className="flex items-center justify-center gap-2 py-2 rounded-xl border border-nexus-cyan/30 text-nexus-cyan text-sm font-medium hover:bg-nexus-cyan-glow transition-all disabled:text-text-dim"
            >
              <Radio size={13} /> {isTestingGas ? "PING..." : t.testGasConnection}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>
          <Download size={14} className="text-nexus-cyan/60" /> {t.jsonExport} / {t.jsonImport}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              exportJson(history, locations, settings);
              showToast(t.jsonExportSuccess, "success");
            }}
            className="flex-1 btn-neon flex items-center justify-center gap-2 py-2 rounded-xl text-sm"
          >
            <Download size={13} /> {t.jsonExport}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-nexus-violet/30 text-nexus-violet text-sm font-medium hover:bg-nexus-violet-glow transition-all"
          >
            <Upload size={13} /> {t.jsonImport}
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

      {outbox.length > 0 && (
        <section className="glass-panel p-3 rounded-xl border-nexus-warning/20">
          <div className="text-nexus-warning text-sm font-medium flex items-center gap-2">
            <WifiOff size={14} /> {t.offlineQueue}: {outbox.length} {t.pendingItems}
          </div>
          <p className="text-[10px] text-text-dim mt-1">{t.autoSendOnline}</p>
        </section>
      )}

      <div className="text-center font-display text-[10px] text-text-mid tracking-[0.3em] pt-2 opacity-60">
        EV CHARGE LOG v{APP_VERSION}
      </div>
    </div>
  );
}
