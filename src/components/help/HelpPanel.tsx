import {
  X,
  Zap,
  History,
  Car,
  BarChart3,
  Settings,
  Cloud,
  Camera,
  WifiOff,
  Lightbulb,
} from "lucide-react";
import type { Translations } from "../../i18n/index.ts";

interface HelpPanelProps {
  t: Translations;
  onClose: () => void;
}

interface HelpSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function HelpSection({ icon, title, description }: HelpSectionProps) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2.5 mb-2">
        {icon}
        <h3 className="font-display text-xs font-semibold text-nexus-cyan tracking-widest uppercase">
          {title}
        </h3>
      </div>
      <p className="text-text-mid text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export function HelpPanel({ t, onClose }: HelpPanelProps) {
  const iconClass = "text-nexus-cyan shrink-0";
  const iconSize = 16;

  return (
    <div className="fixed inset-0 z-[100] bg-space-void/95 backdrop-blur-sm">
      <div className="nexus-grid-bg" aria-hidden="true" />
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-space-deep/90 backdrop-blur-xl border-b border-border-subtle px-4 py-3">
          <div className="max-w-lg mx-auto flex justify-between items-center">
            <h2
              className="font-display text-sm font-bold tracking-widest text-nexus-cyan"
              style={{ textShadow: "0 0 20px rgba(0, 240, 255, 0.2)" }}
            >
              {t.helpTitle}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-mid hover:text-nexus-cyan hover:bg-nexus-cyan-glow border border-transparent hover:border-border-glow transition-all"
              aria-label={t.close}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
            <HelpSection
              icon={<Zap size={iconSize} className={iconClass} />}
              title={t.helpGettingStarted}
              description={t.helpGettingStartedDesc}
            />
            <HelpSection
              icon={<Zap size={iconSize} className="text-nexus-green shrink-0" />}
              title={t.helpCharging}
              description={t.helpChargingDesc}
            />
            <HelpSection
              icon={<History size={iconSize} className={iconClass} />}
              title={t.helpHistory}
              description={t.helpHistoryDesc}
            />
            <HelpSection
              icon={<Car size={iconSize} className={iconClass} />}
              title={t.helpVehicle}
              description={t.helpVehicleDesc}
            />
            <HelpSection
              icon={<BarChart3 size={iconSize} className="text-nexus-violet shrink-0" />}
              title={t.helpStats}
              description={t.helpStatsDesc}
            />
            <HelpSection
              icon={<Settings size={iconSize} className={iconClass} />}
              title={t.helpSettings}
              description={t.helpSettingsDesc}
            />
            <HelpSection
              icon={<Cloud size={iconSize} className="text-nexus-warning shrink-0" />}
              title={t.helpSheets}
              description={t.helpSheetsDesc}
            />
            <HelpSection
              icon={<Camera size={iconSize} className={iconClass} />}
              title={t.helpMeter}
              description={t.helpMeterDesc}
            />
            <HelpSection
              icon={<WifiOff size={iconSize} className={iconClass} />}
              title={t.helpOffline}
              description={t.helpOfflineDesc}
            />

            {/* Tips */}
            <div className="glass-panel rounded-xl p-4 border-nexus-violet/20">
              <div className="flex items-center gap-2.5 mb-3">
                <Lightbulb size={iconSize} className="text-nexus-violet shrink-0" />
                <h3 className="font-display text-xs font-semibold text-nexus-violet tracking-widest uppercase">
                  {t.helpTip}
                </h3>
              </div>
              <ul className="space-y-2.5">
                <li className="flex gap-2 text-text-mid text-sm leading-relaxed">
                  <span className="text-nexus-violet/60 shrink-0">▸</span>
                  {t.helpTipNightRate}
                </li>
                <li className="flex gap-2 text-text-mid text-sm leading-relaxed">
                  <span className="text-nexus-violet/60 shrink-0">▸</span>
                  {t.helpTipPresets}
                </li>
                <li className="flex gap-2 text-text-mid text-sm leading-relaxed">
                  <span className="text-nexus-violet/60 shrink-0">▸</span>
                  {t.helpTipCsv}
                </li>
              </ul>
            </div>

            {/* Bottom padding for safe area */}
            <div className="pb-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
