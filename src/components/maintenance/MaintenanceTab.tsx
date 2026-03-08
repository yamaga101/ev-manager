import { useState } from "react";
import { Plus, Trash2, Calendar, Gauge, Wrench, ClipboardCheck } from "lucide-react";
import { useMaintenanceStore } from "../../store/useMaintenanceStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import type { MaintenanceCategory, MaintenanceRecord, InspectionRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";
import { AddMaintenanceForm } from "./AddMaintenanceForm.tsx";
import { AddInspectionForm } from "./AddInspectionForm.tsx";

interface MaintenanceTabProps {
  t: Translations;
  initialSubTab?: "maintenance" | "inspection";
}

type SubTab = "maintenance" | "inspection";

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

const CATEGORY_COLORS: Record<MaintenanceCategory, string> = {
  tire: "#3b82f6",
  brake: "#ef4444",
  wiper: "#8b5cf6",
  battery12v: "#f59e0b",
  coolant: "#06b6d4",
  inspection: "#10b981",
  wash: "#64748b",
  other: "#9ca3af",
};

const INSPECTION_TYPE_COLORS: Record<InspectionRecord["type"], string> = {
  shaken: "#10b981",
  "12month": "#3b82f6",
  "6month": "#8b5cf6",
};

function formatJpDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function MaintenanceCard({
  record,
  t,
  onDelete,
}: {
  record: MaintenanceRecord;
  t: Translations;
  onDelete: () => void;
}) {
  const color = CATEGORY_COLORS[record.category];

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
              {getCategoryLabel(record.category, t)}
            </span>
            <span className="text-xs text-text-muted">
              {formatJpDate(record.date)}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-text-primary dark:text-dark-text truncate">
            {record.description}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs">
            {record.cost > 0 && (
              <span className="text-ev-success font-medium">
                &yen;{record.cost.toLocaleString()}
              </span>
            )}
            {record.odometer != null && (
              <span className="text-text-muted flex items-center gap-0.5">
                <Gauge size={10} /> {record.odometer.toLocaleString()}km
              </span>
            )}
            {record.nextDueDate && (
              <span className="text-text-muted flex items-center gap-0.5">
                <Calendar size={10} /> {t.nextDue}: {formatJpDate(record.nextDueDate)}
              </span>
            )}
          </div>
          {record.memo && (
            <div className="mt-1 text-xs text-text-muted">{record.memo}</div>
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

function InspectionCard({
  record,
  t,
  onDelete,
}: {
  record: InspectionRecord;
  t: Translations;
  onDelete: () => void;
}) {
  const color = INSPECTION_TYPE_COLORS[record.type];
  const typeKeyMap: Record<InspectionRecord["type"], keyof Translations> = {
    shaken: "inspTypeShaken",
    "12month": "inspType12month",
    "6month": "inspType6month",
  };

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
              {t[typeKeyMap[record.type]]}
            </span>
            <span className="text-xs text-text-muted">
              {formatJpDate(record.date)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
            {record.cost > 0 && (
              <span className="text-ev-success font-medium">
                &yen;{record.cost.toLocaleString()}
              </span>
            )}
            <span className="text-text-muted flex items-center gap-0.5">
              <Gauge size={10} /> {record.odometer.toLocaleString()}km
            </span>
            {record.soh != null && (
              <span className="text-ev-primary font-medium">
                SOH {record.soh}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 mt-1 text-xs text-text-muted">
            <Calendar size={10} />
            <span>{t.inspectionNextDue}: {formatJpDate(record.nextDueDate)}</span>
          </div>
          {record.findings && (
            <div className="mt-1 text-xs text-text-muted">{record.findings}</div>
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

export function MaintenanceTab({ t, initialSubTab }: MaintenanceTabProps) {
  const maintenanceRecords = useMaintenanceStore((s) => s.maintenanceRecords);
  const inspectionRecords = useMaintenanceStore((s) => s.inspectionRecords);
  const deleteMaintenance = useMaintenanceStore((s) => s.deleteMaintenance);
  const deleteInspection = useMaintenanceStore((s) => s.deleteInspection);
  const showToast = useToastStore((s) => s.showToast);

  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || "maintenance");
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddInspection, setShowAddInspection] = useState(false);

  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + r.cost, 0);
  const totalInspectionCost = inspectionRecords.reduce((sum, r) => sum + r.cost, 0);

  const handleDeleteMaintenance = (id: string) => {
    if (confirm(t.confirmDeleteMaintenance)) {
      deleteMaintenance(id);
      showToast(t.toastMaintenanceDeleted, "success");
    }
  };

  const handleDeleteInspection = (id: string) => {
    if (confirm(t.confirmDeleteInspection)) {
      deleteInspection(id);
      showToast(t.toastInspectionDeleted, "success");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab selector */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
        <button
          onClick={() => setSubTab("maintenance")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            subTab === "maintenance"
              ? "bg-white dark:bg-dark-surface text-ev-primary shadow-sm"
              : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
          }`}
        >
          <Wrench size={14} />
          {t.maintenanceLog}
        </button>
        <button
          onClick={() => setSubTab("inspection")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            subTab === "inspection"
              ? "bg-white dark:bg-dark-surface text-ev-primary shadow-sm"
              : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
          }`}
        >
          <ClipboardCheck size={14} />
          {t.inspectionLog}
        </button>
      </div>

      {subTab === "maintenance" && (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-3">
            {maintenanceRecords.length > 0 && (
              <span className="text-xs text-text-muted">
                {t.totalMaintenanceCost}:{" "}
                <span className="font-semibold text-ev-success">
                  &yen;{totalMaintenanceCost.toLocaleString()}
                </span>
              </span>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setShowAddMaintenance(true)}
                className="flex items-center gap-1 bg-ev-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
              >
                <Plus size={14} /> {t.addMaintenance}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
            {maintenanceRecords.length === 0 ? (
              <div className="text-center text-text-muted py-10">
                {t.noMaintenanceRecords}
              </div>
            ) : (
              maintenanceRecords.map((record) => (
                <MaintenanceCard
                  key={record.id}
                  record={record}
                  t={t}
                  onDelete={() => handleDeleteMaintenance(record.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {subTab === "inspection" && (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-3">
            {inspectionRecords.length > 0 && (
              <span className="text-xs text-text-muted">
                {t.totalMaintenanceCost}:{" "}
                <span className="font-semibold text-ev-success">
                  &yen;{totalInspectionCost.toLocaleString()}
                </span>
              </span>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setShowAddInspection(true)}
                className="flex items-center gap-1 bg-ev-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-ev-primary-dark transition-colors"
              >
                <Plus size={14} /> {t.addInspection}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-4">
            {inspectionRecords.length === 0 ? (
              <div className="text-center text-text-muted py-10">
                {t.noInspectionRecords}
              </div>
            ) : (
              inspectionRecords.map((record) => (
                <InspectionCard
                  key={record.id}
                  record={record}
                  t={t}
                  onDelete={() => handleDeleteInspection(record.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {showAddMaintenance && (
        <AddMaintenanceForm
          onClose={() => setShowAddMaintenance(false)}
          t={t}
        />
      )}

      {showAddInspection && (
        <AddInspectionForm
          onClose={() => setShowAddInspection(false)}
          t={t}
        />
      )}
    </div>
  );
}
