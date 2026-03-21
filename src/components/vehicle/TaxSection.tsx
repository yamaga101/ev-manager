import { useState } from "react";
import { Plus, Trash2, Calendar, Receipt, Check, X } from "lucide-react";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { useSyncStore } from "../../store/useSyncStore.ts";
import { generateId } from "../../utils/formatting.ts";
import { buildTaxGasPayload } from "../../utils/gas-sync.ts";
import type { TaxRecord, TaxType } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface TaxSectionProps {
  t: Translations;
}

function formatJpDate(isoDate: string): string {
  if (!isoDate) return "--";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

const TAX_TYPE_COLORS: Record<TaxType, string> = {
  automobile: "#3b82f6",
  weight: "#f59e0b",
  env: "#10b981",
  other: "#9ca3af",
};

function getTaxTypeLabel(taxType: TaxType, t: Translations): string {
  const map: Record<TaxType, keyof Translations> = {
    automobile: "taxAutomobile",
    weight: "taxWeight",
    env: "taxEnv",
    other: "taxOther",
  };
  return t[map[taxType]];
}

function TaxCard({
  record,
  t,
  onDelete,
}: {
  record: TaxRecord;
  t: Translations;
  onDelete: () => void;
}) {
  const color = TAX_TYPE_COLORS[record.taxType];
  const isPaid = !!record.paidDate;

  const today = new Date();
  const dueDate = new Date(record.dueDate + "T00:00:00");
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = !isPaid && daysLeft < 0;
  const isDueSoon = !isPaid && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div
      className="bg-white dark:bg-dark-surface rounded-lg p-3 border-l-4 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color, backgroundColor: color + "20" }}
            >
              {getTaxTypeLabel(record.taxType, t)}
            </span>
            <span className="text-xs text-text-muted">{record.fiscalYear}</span>
            {isPaid && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center gap-0.5">
                <Check size={10} />{t.taxPaid}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                {t.overdue}
              </span>
            )}
            {isDueSoon && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
                {daysLeft}{t.daysLeft}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
            <span className="text-ev-success font-medium">
              &yen;{record.amount.toLocaleString()}
            </span>
            <span className="text-text-muted flex items-center gap-0.5">
              <Calendar size={10} /> {t.taxDueDate}: {formatJpDate(record.dueDate)}
            </span>
            {record.paidDate && (
              <span className="text-text-muted">
                {t.taxPaidDate}: {formatJpDate(record.paidDate)}
              </span>
            )}
          </div>
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

export function TaxSection({ t }: TaxSectionProps) {
  const records = useVehicleStore((s) => s.taxRecords);
  const deleteTax = useVehicleStore((s) => s.deleteTax);
  const showToast = useToastStore((s) => s.showToast);
  const [showAdd, setShowAdd] = useState(false);

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDeleteTax)) {
      deleteTax(id);
      showToast(t.toastTaxDeleted, "success");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        {records.length > 0 && (
          <span className="text-xs text-text-muted">
            {t.totalTaxAmount}:{" "}
            <span className="font-semibold text-ev-success">
              &yen;{totalAmount.toLocaleString()}
            </span>
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-ev-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
          >
            <Plus size={14} /> {t.addTax}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
        {records.length === 0 ? (
          <div className="text-center text-text-muted py-10">
            <Receipt size={32} className="mx-auto mb-2 opacity-30" />
            {t.noTaxRecords}
          </div>
        ) : (
          records.map((record) => (
            <TaxCard
              key={record.id}
              record={record}
              t={t}
              onDelete={() => handleDelete(record.id)}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddTaxForm onClose={() => setShowAdd(false)} t={t} />
      )}
    </>
  );
}

function AddTaxForm({ onClose, t }: { onClose: () => void; t: Translations }) {
  const addTax = useVehicleStore((s) => s.addTax);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);
  const showToast = useToastStore((s) => s.showToast);
  const syncSend = useSyncStore((s) => s.syncSend);

  const [taxType, setTaxType] = useState<TaxType>("automobile");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [memo, setMemo] = useState("");

  const handleSave = async () => {
    if (!amount || !dueDate) return;

    const record: TaxRecord = {
      id: generateId(),
      taxType,
      amount: Number(amount),
      dueDate,
      paidDate: paidDate || undefined,
      fiscalYear: Number(fiscalYear),
      memo: memo || undefined,
      createdAt: new Date().toISOString(),
    };

    addTax(record);

    if (gasUrl) {
      const payload = buildTaxGasPayload(record);
      await syncSend(gasUrl, payload);
    }

    showToast(t.toastTaxAdded, "success");
    onClose();
  };

  const inputClass =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-ev-primary/50";

  const taxTypes: TaxType[] = ["automobile", "weight", "env", "other"];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-text-primary dark:text-dark-text">{t.addTax}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary dark:hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.taxType}</label>
            <div className="grid grid-cols-2 gap-2">
              {taxTypes.map((tt) => (
                <button
                  key={tt}
                  onClick={() => setTaxType(tt)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    taxType === tt
                      ? "border-ev-primary bg-ev-primary/10 text-ev-primary"
                      : "border-gray-200 dark:border-gray-700 text-text-muted"
                  }`}
                >
                  {getTaxTypeLabel(tt, t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.taxAmount}</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.taxDueDate}</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">{t.taxFiscalYear}</label>
              <input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.taxPaidDate}</label>
            <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">{t.maintenanceMemo}</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={inputClass} />
          </div>

          <button
            onClick={handleSave}
            disabled={!amount || !dueDate}
            className="w-full bg-ev-primary text-white font-semibold py-2.5 rounded-lg hover:bg-ev-primary-dark transition-colors disabled:opacity-40"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}

