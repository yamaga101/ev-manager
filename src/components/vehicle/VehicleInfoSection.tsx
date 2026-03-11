import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import type { VehicleRegistration } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface VehicleInfoSectionProps {
  t: Translations;
}

export function VehicleInfoSection({ t }: VehicleInfoSectionProps) {
  const registration = useVehicleStore((s) => s.registration);
  const setRegistration = useVehicleStore((s) => s.setRegistration);
  const showToast = useToastStore((s) => s.showToast);

  const [form, setForm] = useState<VehicleRegistration>({
    plateNumber: "",
    vin: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    expiryDate: "",
    purchaseDate: "",
    memo: "",
  });

  useEffect(() => {
    if (registration) setForm(registration);
  }, [registration]);

  const handleSave = () => {
    setRegistration(form);
    showToast(t.toastVehicleInfoSaved, "success");
  };

  const inputClass =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50";

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">{t.plateNumber}</label>
        <input
          type="text"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
          placeholder="熊本 500 あ 12-34"
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">{t.modelName}</label>
        <input
          type="text"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="NISSAN LEAF AZE0"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">{t.modelYear}</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">{t.carColor}</label>
          <input
            type="text"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">{t.vinNumber}</label>
        <input
          type="text"
          value={form.vin}
          onChange={(e) => setForm({ ...form, vin: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">{t.vehicleExpiryDate}</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">{t.purchaseDate}</label>
          <input
            type="date"
            value={form.purchaseDate || ""}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">{t.maintenanceMemo}</label>
        <textarea
          value={form.memo || ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          rows={2}
          className={inputClass}
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-ev-primary text-white font-semibold py-2.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
      >
        <Save size={16} />
        {t.saveVehicleInfo}
      </button>
    </div>
  );
}
