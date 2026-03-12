import { useState, useMemo } from "react";
import { Download, Trash2, Edit2, MapPin, ArrowRight, BatteryCharging, Navigation } from "lucide-react";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import {
  calcChargedKwh,
  calcCost,
  calcDurationMinutes,
  calcChargeSpeed,
  getChargeSpeedBadge,
} from "../../utils/calculations.ts";
import { formatDate, formatDuration } from "../../utils/formatting.ts";
import { exportCSV } from "../../utils/csv-export.ts";
import {
  DEFAULT_BATTERY_CAPACITY,
  DEFAULT_ELECTRICITY_RATE,
} from "../../constants/defaults.ts";
import type { ChargingRecord, HistorySubTab } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";
import { EditSessionModal } from "./EditSessionModal.tsx";
import { DriveLogList } from "./DriveLogList.tsx";

interface HistoryListProps {
  t: Translations;
}

export function HistoryList({ t }: HistoryListProps) {
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>("charging");
  const history = useChargingStore((s) => s.history);
  const deleteRecord = useChargingStore((s) => s.deleteRecord);
  const deleteRecords = useChargingStore((s) => s.deleteRecords);
  const deleteAllRecords = useChargingStore((s) => s.deleteAllRecords);
  const settings = useSettingsStore((s) => s.settings);
  const lang = useSettingsStore((s) => s.lang);
  const showToast = useToastStore((s) => s.showToast);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [editingItem, setEditingItem] = useState<ChargingRecord | null>(null);

  const capacity = settings.batteryCapacity || DEFAULT_BATTERY_CAPACITY;
  const rate = settings.electricityRate || DEFAULT_ELECTRICITY_RATE;

  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    history.forEach((h) => {
      if (h.locationName) locs.add(h.locationName);
    });
    return [...locs];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!locationFilter) return history;
    return history.filter((h) => h.locationName === locationFilter);
  }, [history, locationFilter]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );

  const handleSelectAll = () => {
    if (selectedIds.length === filteredHistory.length) setSelectedIds([]);
    else setSelectedIds(filteredHistory.map((h) => h.id));
  };

  const handleDeleteSelected = () => {
    if (
      selectedIds.length > 0 &&
      confirm(t.confirmDeleteN.replace("{n}", String(selectedIds.length)))
    ) {
      deleteRecords(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteAll = () => {
    if (confirm(t.confirmDeleteAll)) {
      deleteAllRecords();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDelete)) {
      deleteRecord(id);
    }
  };

  const handleExportCSV = () => {
    exportCSV(history, settings, lang);
    showToast(t.toastCsvExported, "success");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab selector */}
      <div className="flex rounded-xl bg-space-panel border border-border-subtle p-1 mb-4">
        <button
          onClick={() => setHistorySubTab("charging")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all ${
            historySubTab === "charging"
              ? "bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
              : "text-text-dim hover:text-text-mid"
          }`}
        >
          <BatteryCharging size={13} />
          {t.history}
        </button>
        <button
          onClick={() => setHistorySubTab("driveLog")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all ${
            historySubTab === "driveLog"
              ? "bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
              : "text-text-dim hover:text-text-mid"
          }`}
        >
          <Navigation size={13} />
          {t.driveLog}
        </button>
      </div>

      {historySubTab === "driveLog" && <DriveLogList t={t} />}
      {historySubTab === "charging" && <>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2 items-center">
          {history.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="btn-neon text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Download size={11} /> {t.csv}
            </button>
          )}
          {selectedIds.length > 0 ? (
            <button
              onClick={handleDeleteSelected}
              className="text-[10px] tracking-wider uppercase text-nexus-error border border-nexus-error/30 px-2.5 py-1 rounded-lg hover:bg-nexus-error/10 flex items-center gap-1 transition-all"
            >
              <Trash2 size={11} /> {t.delete} ({selectedIds.length})
            </button>
          ) : (
            history.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-[10px] tracking-wider uppercase text-text-dim border border-border-subtle px-2.5 py-1 rounded-lg hover:text-text-mid hover:border-border-glow transition-all"
              >
                {t.deleteAll}
              </button>
            )
          )}
        </div>
      </div>

      {/* Location filter */}
      {allLocations.length > 0 && (
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="mb-2 rounded-lg border border-border-subtle bg-space-panel p-1.5 text-xs text-text-bright w-full appearance-none"
        >
          <option value="">{t.allLocations}</option>
          {allLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      )}

      {/* Select all */}
      {filteredHistory.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <input
            type="checkbox"
            checked={
              filteredHistory.length > 0 &&
              selectedIds.length === filteredHistory.length
            }
            onChange={handleSelectAll}
            className="w-4 h-4 rounded accent-nexus-cyan cursor-pointer"
          />
          <span className="text-[10px] text-text-dim tracking-wider uppercase">
            {t.selectAll} ({filteredHistory.length})
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-text-dim py-10 font-display tracking-wider text-sm">
            {t.noRecords}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const kwh = calcChargedKwh(
              capacity,
              item.startBattery || 0,
              item.endBattery || item.batteryAfter || 0,
            );
            const cost = calcCost(kwh, rate);
            const duration =
              item.startTime && item.endTime
                ? calcDurationMinutes(item.startTime, item.endTime)
                : 0;
            const speed = calcChargeSpeed(kwh, duration);
            const badge = getChargeSpeedBadge(speed);

            return (
              <div
                key={item.id}
                className={`glass-panel rounded-lg p-3 border-l-2 transition-all ${
                  selectedIds.includes(item.id)
                    ? "border-l-nexus-cyan bg-nexus-cyan-glow"
                    : ""
                }`}
                style={
                  !selectedIds.includes(item.id) && speed > 0
                    ? { borderLeftColor: badge.color }
                    : selectedIds.includes(item.id)
                      ? undefined
                      : { borderLeftColor: "rgba(0, 240, 255, 0.15)" }
                }
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 w-4 h-4 rounded accent-nexus-cyan cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-dim font-mono-data">
                        {item.startTime
                          ? formatDate(item.startTime)
                          : formatDate(item.timestamp || "")}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-mono-data font-bold text-text-bright">
                          {item.startRange || "-"}
                        </span>
                        <ArrowRight
                          size={11}
                          className="text-nexus-cyan/60 inline"
                        />
                        <span className="text-lg font-mono-data font-bold text-text-bright">
                          {item.endRange || "-"}
                        </span>
                        <span className="text-[9px] text-text-dim">km</span>
                      </div>
                      <div className="text-xs font-mono-data text-text-mid mt-0.5">
                        {item.startBattery || item.battery}%{" "}
                        <ArrowRight size={9} className="inline text-nexus-cyan/30" />{" "}
                        {item.endBattery || item.batteryAfter}%
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] font-mono-data">
                        <span className="text-nexus-cyan font-medium">
                          {kwh.toFixed(1)}kWh
                        </span>
                        <span className="text-nexus-green font-medium">
                          ¥{cost}
                        </span>
                        {duration > 0 && (
                          <span className="text-text-mid">
                            {formatDuration(duration)}
                          </span>
                        )}
                        {speed > 0 && (
                          <span style={{ color: badge.color }}>
                            {badge.emoji} {speed.toFixed(1)}kW
                          </span>
                        )}
                      </div>
                      {item.locationName && (
                        <div className="text-[10px] text-nexus-cyan/60 mt-1 flex items-center gap-1">
                          <MapPin size={9} /> {item.locationName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingItem(item)}
                      title={t.editSession}
                      className="h-8 w-8 flex items-center justify-center bg-nexus-cyan/10 text-nexus-cyan rounded-lg hover:bg-nexus-cyan/20 border border-nexus-cyan/20 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title={t.delete}
                      className="h-8 w-8 flex items-center justify-center border border-nexus-error/20 text-nexus-error/60 rounded-lg hover:bg-nexus-error/10 hover:text-nexus-error transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditSessionModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        t={t}
      />
      </>}
    </div>
  );
}
