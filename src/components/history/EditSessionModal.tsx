import { useState, useEffect } from "react";
import { Edit2 } from "lucide-react";
import { Modal } from "../ui/Modal.tsx";
import { SmartNumberInput } from "../inputs/SmartNumberInput.tsx";
import { useChargingStore } from "../../store/useChargingStore.ts";
import type { ChargingRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface EditSessionModalProps {
  item: ChargingRecord | null;
  onClose: () => void;
  t: Translations;
}

export function EditSessionModal({
  item,
  onClose,
  t,
}: EditSessionModalProps) {
  const updateRecord = useChargingStore((s) => s.updateRecord);
  const [formData, setFormData] = useState<ChargingRecord | null>(null);

  useEffect(() => {
    if (item) setFormData({ ...item });
  }, [item]);

  if (!item || !formData) return null;

  const handleChange = (field: string, value: number | string) =>
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));

  const handleSave = () => {
    if (formData) {
      updateRecord(formData);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title={t.editSession}
      titleIcon={<Edit2 size={18} />}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-border dark:border-dark-border text-text-muted font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-3 bg-ev-primary text-white font-medium rounded-xl hover:bg-ev-primary-dark transition-colors"
          >
            {t.saveChanges}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-text-muted text-xs font-medium uppercase mb-1 block">
            {t.start}
          </label>
          <input
            type="datetime-local"
            value={formData.startTime || formData.timestamp || ""}
            onChange={(e) => handleChange("startTime", e.target.value)}
            className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
          />
        </div>
        <div>
          <label className="text-text-muted text-xs font-medium uppercase mb-1 block">
            {t.end}
          </label>
          <input
            type="datetime-local"
            value={formData.endTime || ""}
            onChange={(e) => handleChange("endTime", e.target.value)}
            className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:border-ev-primary"
          />
        </div>

        <div>
          <label className="text-text-muted text-xs font-medium uppercase mb-1 block">
            {t.odometer}
          </label>
          <div className="flex items-center gap-1 border border-border dark:border-dark-border rounded-lg p-2">
            {[-100, -10].map((d) => (
              <button
                key={d}
                onClick={() =>
                  handleChange(
                    "odometer",
                    Number(formData.odometer || 0) + d,
                  )
                }
                className="h-8 w-12 flex items-center justify-center rounded bg-gray-50 dark:bg-gray-800 text-ev-error text-xs font-bold"
              >
                {d}
              </button>
            ))}
            <input
              type="number"
              value={Number(formData.odometer || 0)}
              onChange={(e) =>
                handleChange("odometer", Number(e.target.value))
              }
              className="flex-1 bg-transparent text-center text-lg font-semibold text-ev-primary focus:outline-none"
            />
            {[10, 100].map((d) => (
              <button
                key={d}
                onClick={() =>
                  handleChange(
                    "odometer",
                    Number(formData.odometer || 0) + d,
                  )
                }
                className="h-8 w-12 flex items-center justify-center rounded bg-gray-50 dark:bg-gray-800 text-ev-primary text-xs font-bold"
              >
                +{d}
              </button>
            ))}
          </div>
        </div>

        <SmartNumberInput
          label={t.efficiency}
          value={Number(formData.efficiency)}
          unit="km/kWh"
          steps={[-1, -0.1, 0.1, 1]}
          min={0}
          max={20}
          onChange={(v) => handleChange("efficiency", v)}
        />

        <div className="p-3 border border-border dark:border-dark-border rounded-lg bg-surface-alt dark:bg-gray-800/50">
          <div className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">
            {t.startConditions}
          </div>
          <SmartNumberInput
            label={t.battPct}
            value={Number(formData.startBattery || formData.battery || 0)}
            unit="%"
            onChange={(v) => handleChange("startBattery", v)}
          />
          <div>
            <div className="text-text-muted text-[9px] font-medium uppercase tracking-[0.15em] pl-1 mb-0.5">
              {t.rangeKm}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SmartNumberInput
                label="AC OFF"
                value={Number(formData.startRange || 0)}
                unit="km"
                steps={[-10, 10]}
                min={0} max={1000}
                onChange={(v) => handleChange("startRange", v)}
                compact
              />
              <SmartNumberInput
                label="AC ON"
                value={Number(formData.startRangeAcOn || 0)}
                unit="km"
                steps={[-10, 10]}
                min={0} max={1000}
                onChange={(v) => handleChange("startRangeAcOn", v)}
                compact
              />
            </div>
          </div>
        </div>

        <div className="p-3 border border-border dark:border-dark-border rounded-lg bg-surface-alt dark:bg-gray-800/50">
          <div className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">
            {t.endConditions}
          </div>
          <SmartNumberInput
            label={t.battPct}
            value={Number(formData.endBattery || formData.batteryAfter || 0)}
            unit="%"
            onChange={(v) => handleChange("endBattery", v)}
          />
          <div>
            <div className="text-text-muted text-[9px] font-medium uppercase tracking-[0.15em] pl-1 mb-0.5">
              {t.rangeKm}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SmartNumberInput
                label="AC OFF"
                value={Number(formData.endRange || 0)}
                unit="km"
                steps={[-10, 10]}
                min={0} max={1000}
                onChange={(v) => handleChange("endRange", v)}
                compact
              />
              <SmartNumberInput
                label="AC ON"
                value={Number(formData.endRangeAcOn || 0)}
                unit="km"
                steps={[-10, 10]}
                min={0} max={1000}
                onChange={(v) => handleChange("endRangeAcOn", v)}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
