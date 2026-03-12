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
    <nav
      className="fixed bottom-3 left-3 right-3 z-50"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="max-w-lg mx-auto glass-panel rounded-2xl border border-border-subtle pb-safe">
        <div className="flex justify-around items-center h-14">
          {tabs.map(({ id, icon: Icon, labelKey }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-label={t[labelKey]}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                  isActive
                    ? "text-nexus-cyan"
                    : "text-text-dim hover:text-text-mid"
                }`}
              >
                {/* Active glow indicator */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-nexus-cyan glow-breathe"
                    style={{ boxShadow: "0 0 8px rgba(0, 240, 255, 0.5)" }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={isActive ? "drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" : ""}
                />
                <span className="text-[9px] mt-0.5 font-medium tracking-wider uppercase">
                  {t[labelKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
