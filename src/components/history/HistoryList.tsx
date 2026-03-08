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
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
        <button
          onClick={() => setHistorySubTab("charging")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            historySubTab === "charging"
              ? "bg-white dark:bg-dark-surface text-ev-primary shadow-sm"
              : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
          }`}
        >
          <BatteryCharging size={14} />
          {t.history}
        </button>
        <button
          onClick={() => setHistorySubTab("driveLog")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            historySubTab === "driveLog"
              ? "bg-white dark:bg-dark-surface text-ev-primary shadow-sm"
              : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
          }`}
        >
          <Navigation size={14} />
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
              className="text-xs text-ev-primary border border-ev-primary px-2 py-1 rounded-lg hover:bg-ev-primary/10 flex items-center gap-1 transition-colors"
            >
              <Download size={12} /> {t.csv}
            </button>
          )}
          {selectedIds.length > 0 ? (
            <button
              onClick={handleDeleteSelected}
              className="text-xs text-ev-error border border-ev-error px-2 py-1 rounded-lg hover:bg-ev-error/10 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> {t.delete} ({selectedIds.length})
            </button>
          ) : (
            history.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-text-muted border border-border dark:border-dark-border px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
          className="mb-2 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-1.5 text-xs text-text-primary dark:text-dark-text w-full appearance-none"
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
            className="w-4 h-4 rounded accent-ev-primary cursor-pointer"
          />
          <span className="text-xs text-text-muted">
            {t.selectAll} ({filteredHistory.length})
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-text-muted py-10">
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
                className={`bg-white dark:bg-dark-surface rounded-lg p-3 border-l-4 shadow-sm transition-colors ${
                  selectedIds.includes(item.id)
                    ? "border-ev-primary bg-ev-primary/5"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                style={
                  !selectedIds.includes(item.id) && speed > 0
                    ? { borderLeftColor: badge.color }
                    : undefined
                }
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 w-4 h-4 rounded accent-ev-primary cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-text-muted">
                        {item.startTime
                          ? formatDate(item.startTime)
                          : formatDate(item.timestamp || "")}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-semibold text-text-primary dark:text-dark-text">
                          {item.startRange || "-"}
                        </span>
                        <ArrowRight
                          size={12}
                          className="text-text-muted inline"
                        />
                        <span className="text-lg font-semibold text-text-primary dark:text-dark-text">
                          {item.endRange || "-"}
                        </span>
                        <span className="text-xs text-text-muted">km</span>
                      </div>
                      <div className="text-sm text-text-primary dark:text-dark-text mt-0.5">
                        {t.battPct}: {item.startBattery || item.battery}%{" "}
                        <ArrowRight size={10} className="inline text-text-muted" />{" "}
                        {item.endBattery || item.batteryAfter}%
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-ev-primary font-medium">
                          {kwh.toFixed(1)}kWh
                        </span>
                        <span className="text-ev-success font-medium">
                          &yen;{cost}
                        </span>
                        {duration > 0 && (
                          <span className="text-text-primary dark:text-dark-text">
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
                        <div className="text-xs text-ev-primary mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {item.locationName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingItem(item)}
                      title={t.editSession}
                      className="h-9 w-9 flex items-center justify-center bg-ev-primary text-white rounded-lg hover:bg-ev-primary-dark transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title={t.delete}
                      className="h-9 w-9 flex items-center justify-center border border-ev-error text-ev-error rounded-lg hover:bg-ev-error hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
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
