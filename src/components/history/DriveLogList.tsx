import { useState } from "react";
import { Plus, Trash2, MapPin, ArrowRight, Navigation, X } from "lucide-react";
import { useDriveLogStore } from "../../store/useDriveLogStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import { generateId } from "../../utils/formatting.ts";
import { buildDriveLogGasPayload } from "../../utils/gas-sync.ts";
import type { DriveLogRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface DriveLogListProps {
  t: Translations;
}

function formatJpDate(isoDate: string): string {
  if (!isoDate) return "--";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function DriveLogCard({
  record,
  t,
  onDelete,
}: {
  record: DriveLogRecord;
  t: Translations;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg p-3 border-l-4 border-blue-400 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-muted">{formatJpDate(record.date)}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={12} className="text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary dark:text-dark-text truncate">{record.departure}</span>
            <ArrowRight size={12} className="text-text-muted flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary dark:text-dark-text truncate">{record.destination}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs">
            <span className="text-ev-primary font-medium">
              {record.distance.toFixed(1)} km
            </span>
            {record.efficiency != null && record.efficiency > 0 && (
              <span className="text-ev-success font-medium">
                {record.efficiency.toFixed(1)} km/kWh
              </span>
            )}
            <span className="text-text-muted">
              {record.startOdometer.toLocaleString()} → {record.endOdometer.toLocaleString()} km
            </span>
          </div>
          {record.purpose && (
            <div className="mt-0.5 text-[10px] text-text-muted">{record.purpose}</div>
          )}
        </div>
        <button
          onClick={onDelete}
          title={t.delete}
          className="ml-2 h-8 w-8 flex items-center justify-center border border-ev-error text-ev-error rounded-lg hover:bg-ev-error hover:text-white transition-colors flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function DriveLogList({ t }: DriveLogListProps) {
  const records = useDriveLogStore((s) => s.records);
  const addRecord = useDriveLogStore((s) => s.addRecord);
  const deleteRecord = useDriveLogStore((s) => s.deleteRecord);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);
  const syncSend = useSyncStore((s) => s.syncSend);
  const showToast = useToastStore((s) => s.showToast);
  const [showAdd, setShowAdd] = useState(false);

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDeleteDriveLog)) {
      deleteRecord(id);
      showToast(t.toastDriveLogDeleted, "success");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-text-muted">
          {records.length > 0 && `${records.length} ${t.history}`}
        </span>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 bg-ev-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
        >
          <Plus size={14} /> {t.addDriveLog}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
        {records.length === 0 ? (
          <div className="text-center text-text-muted py-10">
            <Navigation size={32} className="mx-auto mb-2 opacity-30" />
            {t.noDriveLogRecords}
          </div>
        ) : (
          records.map((record) => (
            <DriveLogCard
              key={record.id}
              record={record}
              t={t}
              onDelete={() => handleDelete(record.id)}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddDriveLogForm
          onClose={() => setShowAdd(false)}
          t={t}
          onSave={async (record) => {
            addRecord(record);
            if (gasUrl) {
              const payload = buildDriveLogGasPayload(record);
              await syncSend(gasUrl, payload);
            }
            showToast(t.toastDriveLogAdded, "success");
          }}
        />
      )}
    </>
  );
}

function AddDriveLogForm({
  onClose,
  t,
  onSave,
}: {
  onClose: () => void;
  t: Translations;
  onSave: (record: DriveLogRecord) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [startOdometer, setStartOdometer] = useState("");
  const [endOdometer, setEndOdometer] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [purpose, setPurpose] = useState("");
  const [memo, setMemo] = useState("");

  const distance = Number(endOdometer) - Number(startOdometer);

  const handleSave = () => {
    if (!departure || !destination || !startOdometer || !endOdometer) return;

    const record: DriveLogRecord = {
      id: generateId(),
      date,
      departure,
      destination,
      distance: distance > 0 ? distance : 0,
      startOdometer: Number(startOdometer),
      endOdometer: Number(endOdometer),
      efficiency: Number(efficiency) || undefined,
      purpose: purpose || undefined,
      memo: memo || undefined,
      createdAt: new Date().toISOString(),
    };

    onSave(record);
    onClose();
  };

  const inputClass =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-text-primary dark:text-dark-text">{t.addDriveLog}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary dark:hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveDate}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveDeparture}</label>
              <input type="text" value={departure} onChange={(e) => setDeparture(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveDestination}</label>
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveStartOdometer}</label>
              <input type="number" value={startOdometer} onChange={(e) => setStartOdometer(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveEndOdometer}</label>
              <input type="number" value={endOdometer} onChange={(e) => setEndOdometer(e.target.value)} className={inputClass} />
            </div>
          </div>

          {distance > 0 && (
            <div className="text-xs text-ev-primary font-medium px-1">
              {t.driveDistance}: {distance.toFixed(1)} km
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.driveEfficiency}</label>
            <input type="number" step="0.1" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.drivePurpose}</label>
            <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.maintenanceMemo}</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={inputClass} />
          </div>

          <button
            onClick={handleSave}
            disabled={!departure || !destination || !startOdometer || !endOdometer}
            className="w-full bg-ev-primary text-white font-semibold py-2.5 rounded-lg hover:bg-ev-primary-dark transition-colors disabled:opacity-40"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}
