import { useState } from "react";
import { X } from "lucide-react";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import { generateId } from "../../utils/formatting.ts";
import { buildInsuranceGasPayload } from "../../utils/gas-sync.ts";
import type { InsuranceRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface AddInsuranceFormProps {
  onClose: () => void;
  t: Translations;
}

export function AddInsuranceForm({ onClose, t }: AddInsuranceFormProps) {
  const addInsurance = useVehicleStore((s) => s.addInsurance);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);
  const showToast = useToastStore((s) => s.showToast);
  const syncSend = useSyncStore((s) => s.syncSend);

  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [type, setType] = useState<"mandatory" | "voluntary">("voluntary");
  const [coverageSummary, setCoverageSummary] = useState("");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [memo, setMemo] = useState("");

  const handleSave = async () => {
    if (!provider || !startDate || !endDate) return;

    const record: InsuranceRecord = {
      id: generateId(),
      provider,
      policyNumber,
      type,
      coverageSummary,
      premium: Number(premium) || 0,
      startDate,
      endDate,
      referenceNumber: referenceNumber || undefined,
      memo: memo || undefined,
      createdAt: new Date().toISOString(),
    };

    addInsurance(record);

    if (gasUrl) {
      const payload = buildInsuranceGasPayload(record);
      await syncSend(gasUrl, payload);
    }

    showToast(t.toastInsuranceAdded, "success");
    onClose();
  };

  const inputClass =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-text-primary dark:text-dark-text">{t.addInsurance}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary dark:hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.insuranceProvider}</label>
            <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.inspectionType}</label>
            <div className="flex gap-2">
              {(["voluntary", "mandatory"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setType(v)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    type === v
                      ? "border-ev-primary bg-ev-primary/10 text-ev-primary"
                      : "border-gray-200 dark:border-gray-700 text-text-muted"
                  }`}
                >
                  {v === "mandatory" ? t.insuranceTypeMandatory : t.insuranceTypeVoluntary}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.insurancePolicyNumber}</label>
            <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.insuranceCoverage}</label>
            <textarea value={coverageSummary} onChange={(e) => setCoverageSummary(e.target.value)} rows={2} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.insurancePremium}</label>
            <input type="number" value={premium} onChange={(e) => setPremium(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.insuranceStartDate}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.insuranceEndDate}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.insuranceRefNumber}</label>
            <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.maintenanceMemo}</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={inputClass} />
          </div>

          <button
            onClick={handleSave}
            disabled={!provider || !startDate || !endDate}
            className="w-full bg-ev-primary text-white font-semibold py-2.5 rounded-lg hover:bg-ev-primary-dark transition-colors disabled:opacity-40"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}
