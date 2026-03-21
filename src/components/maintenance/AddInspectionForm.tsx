import { useState } from "react";
import { X } from "lucide-react";
import { useMaintenanceStore } from "../../store/useMaintenanceStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { buildInspectionGasPayload } from "../../utils/gas-sync.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import type { InspectionRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface AddInspectionFormProps {
  onClose: () => void;
  t: Translations;
}

type InspectionType = InspectionRecord["type"];

const INSPECTION_TYPES: InspectionType[] = ["shaken", "12month", "6month"];

function getInspectionTypeLabel(type: InspectionType, t: Translations): string {
  const map: Record<InspectionType, keyof Translations> = {
    shaken: "inspTypeShaken",
    "12month": "inspType12month",
    "6month": "inspType6month",
  };
  return t[map[type]];
}

export function AddInspectionForm({ onClose, t }: AddInspectionFormProps) {
  const addInspection = useMaintenanceStore((s) => s.addInspection);
  const showToast = useToastStore((s) => s.showToast);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);
  const syncSend = useSyncStore((s) => s.syncSend);

  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [type, setType] = useState<InspectionType>("shaken");
  const [odometer, setOdometer] = useState("");
  const [cost, setCost] = useState("");
  const [soh, setSoh] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [findings, setFindings] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !odometer || !nextDueDate) return;

    const record: InspectionRecord = {
      id: `insp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      type,
      odometer: Number(odometer),
      cost: Number(cost) || 0,
      soh: soh ? Number(soh) : undefined,
      nextDueDate,
      findings: findings.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addInspection(record);

    // Attempt GAS sync via outbox
    if (gasUrl) {
      const payload = buildInspectionGasPayload(record);
      syncSend(gasUrl, payload);
    }

    showToast(t.toastInspectionAdded, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-border dark:border-dark-border px-4 py-3 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-base font-semibold text-text-primary dark:text-dark-text">
            {t.addInspection}
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

          {/* Inspection Type */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.inspectionType}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InspectionType)}
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50 appearance-none"
            >
              {INSPECTION_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {getInspectionTypeLabel(tp, t)}
                </option>
              ))}
            </select>
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
              required
              min="0"
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

          {/* SOH */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.sohPct}
            </label>
            <input
              type="number"
              value={soh}
              onChange={(e) => setSoh(e.target.value)}
              min="0"
              max="100"
              placeholder="—"
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.inspectionNextDue}
            </label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
              className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50"
            />
          </div>

          {/* Findings */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t.inspectionFindings}
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
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
