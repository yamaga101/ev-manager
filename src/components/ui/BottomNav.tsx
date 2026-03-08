import {
  BatteryCharging,
  History,
  BarChart3,
  Settings,
  Car,
} from "lucide-react";
import type { TabId } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  t: Translations;
}

const tabs: { id: TabId; icon: typeof BatteryCharging; labelKey: keyof Translations }[] = [
  { id: "charging", icon: BatteryCharging, labelKey: "startCharging" },
  { id: "history", icon: History, labelKey: "history" },
  { id: "vehicle", icon: Car, labelKey: "vehicleTab" },
  { id: "stats", icon: BarChart3, labelKey: "statistics" },
  { id: "settings", icon: Settings, labelKey: "settings" },
];

export function BottomNav({ activeTab, onTabChange, t }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-t border-border dark:border-dark-border pb-safe" aria-label="Main navigation" role="navigation">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              aria-label={t[labelKey]}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-ev-primary"
                  : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-0.5 font-medium">
                {t[labelKey]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
