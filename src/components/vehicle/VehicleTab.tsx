import { useState } from "react";
import { Car, Shield, Receipt, Wrench, ClipboardCheck } from "lucide-react";
import type { VehicleSubTab } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";
import { VehicleInfoSection } from "./VehicleInfoSection.tsx";
import { InsuranceSection } from "./InsuranceSection.tsx";
import { TaxSection } from "./TaxSection.tsx";
import { MaintenanceTab } from "../maintenance/MaintenanceTab.tsx";

interface VehicleTabProps {
  t: Translations;
}

const subTabs: { id: VehicleSubTab; icon: typeof Car; labelKey: keyof Translations }[] = [
  { id: "info", icon: Car, labelKey: "vehicleInfo" },
  { id: "insurance", icon: Shield, labelKey: "insurance" },
  { id: "tax", icon: Receipt, labelKey: "tax" },
  { id: "maintenance", icon: Wrench, labelKey: "maintenance" },
  { id: "inspection", icon: ClipboardCheck, labelKey: "inspectionLog" },
];

export function VehicleTab({ t }: VehicleTabProps) {
  const [subTab, setSubTab] = useState<VehicleSubTab>("info");

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab selector - scrollable horizontal */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4 overflow-x-auto">
        {subTabs.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-[10px] font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
              subTab === id
                ? "bg-white dark:bg-dark-surface text-ev-primary shadow-sm"
                : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
            }`}
          >
            <Icon size={13} />
            {t[labelKey]}
          </button>
        ))}
      </div>

      {subTab === "info" && <VehicleInfoSection t={t} />}
      {subTab === "insurance" && <InsuranceSection t={t} />}
      {subTab === "tax" && <TaxSection t={t} />}
      {(subTab === "maintenance" || subTab === "inspection") && (
        <MaintenanceTab t={t} initialSubTab={subTab} />
      )}
    </div>
  );
}
