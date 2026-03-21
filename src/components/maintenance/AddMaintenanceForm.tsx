import { useState } from "react";
import { X } from "lucide-react";
import { useMaintenanceStore } from "../../store/useMaintenanceStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { buildMaintenanceGasPayload } from "../../utils/gas-sync.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import type { MaintenanceCategory, MaintenanceRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface AddMaintenanceFormProps {
  onClose: () => void;
  t: Translations;
}

const CATEGORIES: MaintenanceCategory[] = [
  "tire",
  "brake",
  "wiper",
  "battery12v",
  "coolant",
  "inspection",
  "wash",
  "other",
];

function getCategoryLabel(cat: MaintenanceCategory, t: Translations): string {
  const map: Record<MaintenanceCategory, keyof Translations> = {
    tire: "catTire",
    brake: "catBrake",
    wiper: "catWiper",
    battery12v: "catBattery12v",
    coolant: "catCoolant",
    inspection: "catInspection",
    wash: "catWash",
    other: "catOther",
  };
  return t[map[cat]];
}

export function AddMaintenanceForm({ onClose, t }: AddMaintenanceFormProps) {
  const addMaintenance = useMaintenanceStore((s) => s.addMaintenance);
  const showToast = useToastStore((s) => s.showToast);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);
  const syncSend = useSyncStore((s) => s.syncSend);

  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<MaintenanceCategory>("tire");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [nextDueOdometer, setNextDueOdometer] = useState("");
  const [memo, setMemo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description.trim()) return;

    const record: MaintenanceRecord = {
      id: `maint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      category,
      description: description.trim(),
      cost: Number(cost) || 0,
      odometer: odometer ? Number(odometer) : undefined,
      nextDueDate: nextDueDate || undefined,
      nextDueOdometer: nextDueOdometer ? Number(nextDueOdometer) : undefined,
      memo: memo.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addMaintenance(record);

    // Attempt GAS sync via outbox
    if (gasUrl) {
      const payload = buildMaintenanceGasPayload(record);
      syncSend(gasUrl, payload);
    }

    showToast(t.toastMaintenanceAdded, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-border dark:border-dark-border px-4 py-3 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-base font-semibold text-text-primary dark:text-dark-text">
            {t.addMaintenance}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary dark:hover:text-dark-text transition-colors"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceDate}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceCategory}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50 appearance-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat, t)}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceDescription}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceCost}
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min="0"
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Odometer */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceOdometer}
            </label>
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              min="0"
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceNextDueDate}
            </label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Next Due Odometer */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceNextDueOdometer}
            </label>
            <input
              type="number"
              value={nextDueOdometer}
              onChange={(e) => setNextDueOdometer(e.target.value)}
              min="0"
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.maintenanceMemo}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border dark:border-dark-border py-2.5 text-sm font-medium text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-ev-primary text-white py-2.5 text-sm font-semibold hover:bg-ev-primary-dark transition-colors"
            >
              {t.done}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
