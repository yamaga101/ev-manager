import { useState } from "react";
import { Plus, Trash2, Calendar, Shield } from "lucide-react";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import type { InsuranceRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";
import { AddInsuranceForm } from "./AddInsuranceForm.tsx";

interface InsuranceSectionProps {
  t: Translations;
}

function formatJpDate(isoDate: string): string {
  if (!isoDate) return "--";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function InsuranceCard({
  record,
  t,
  onDelete,
}: {
  record: InsuranceRecord;
  t: Translations;
  onDelete: () => void;
}) {
  const isMandatory = record.type === "mandatory";
  const color = isMandatory ? "#ef4444" : "#3b82f6";
  const typeLabel = isMandatory ? t.insuranceTypeMandatory : t.insuranceTypeVoluntary;

  const today = new Date();
  const endDate = new Date(record.endDate + "T00:00:00");
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;
  const isExpired = daysLeft < 0;

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
              {typeLabel}
            </span>
            {isExpired && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                {t.overdue}
              </span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
                {daysLeft}{t.daysLeft}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm font-medium text-text-primary dark:text-dark-text">
            {record.provider}
          </div>
          {record.coverageSummary && (
            <div className="mt-0.5 text-xs text-text-muted truncate">{record.coverageSummary}</div>
          )}
          <div className="flex flex-wrap gap-3 mt-1 text-xs">
            <span className="text-ev-success font-medium">
              &yen;{record.premium.toLocaleString()}
            </span>
            <span className="text-text-muted flex items-center gap-0.5">
              <Calendar size={10} /> {formatJpDate(record.startDate)} ~ {formatJpDate(record.endDate)}
            </span>
          </div>
          {record.policyNumber && (
            <div className="mt-0.5 text-[10px] text-text-muted">
              {t.insurancePolicyNumber}: {record.policyNumber}
            </div>
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

export function InsuranceSection({ t }: InsuranceSectionProps) {
  const records = useVehicleStore((s) => s.insuranceRecords);
  const deleteInsurance = useVehicleStore((s) => s.deleteInsurance);
  const showToast = useToastStore((s) => s.showToast);
  const [showAdd, setShowAdd] = useState(false);

  const totalPremium = records.reduce((sum, r) => sum + r.premium, 0);

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDeleteInsurance)) {
      deleteInsurance(id);
      showToast(t.toastInsuranceDeleted, "success");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        {records.length > 0 && (
          <span className="text-xs text-text-muted">
            {t.totalInsuranceCost}:{" "}
            <span className="font-semibold text-ev-success">
              &yen;{totalPremium.toLocaleString()}
            </span>
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-ev-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
          >
            <Plus size={14} /> {t.addInsurance}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
        {records.length === 0 ? (
          <div className="text-center text-text-muted py-10">
            <Shield size={32} className="mx-auto mb-2 opacity-30" />
            {t.noInsuranceRecords}
          </div>
        ) : (
          records.map((record) => (
            <InsuranceCard
              key={record.id}
              record={record}
              t={t}
              onDelete={() => handleDelete(record.id)}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddInsuranceForm onClose={() => setShowAdd(false)} t={t} />
      )}
    </>
  );
}
