import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { ExternalLink, HelpCircle } from "lucide-react";
import { HelpPanel } from "./components/help/HelpPanel.tsx";
import { BottomNav } from "./components/ui/BottomNav.tsx";
import { ToastContainer } from "./components/ui/Toast.tsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.tsx";
import { SPREADSHEET_URL, APP_VERSION } from "./constants/defaults.ts";
import { StartChargingForm } from "./components/charging/StartChargingForm.tsx";
import { LiveChargingScreen } from "./components/charging/LiveChargingScreen.tsx";
import { CompletionSummary } from "./components/charging/CompletionSummary.tsx";
import { Onboarding } from "./components/onboarding/Onboarding.tsx";
import { ReminderBanner } from "./components/ui/ReminderBanner.tsx";
import { Starfield } from "./components/ui/Starfield.tsx";
import { useChargingStore } from "./store/useChargingStore.ts";
import { useSettingsStore } from "./store/useSettingsStore.ts";
import { useToastStore } from "./store/useToastStore.ts";
import { useServiceWorker } from "./hooks/useServiceWorker.ts";
import { useAutoImport } from "./hooks/useAutoImport.ts";
import { useSyncStore } from "./store/useSyncStore.ts";
import { getTranslations } from "./i18n/index.ts";
import type { TabId, ChargingRecord } from "./types/index.ts";

const HistoryList = lazy(() => import("./components/history/HistoryList.tsx").then((m) => ({ default: m.HistoryList })));
const StatsDashboard = lazy(() => import("./components/stats/StatsDashboard.tsx").then((m) => ({ default: m.StatsDashboard })));
const SettingsPanel = lazy(() => import("./components/settings/SettingsPanel.tsx").then((m) => ({ default: m.SettingsPanel })));
const VehicleTab = lazy(() => import("./components/vehicle/VehicleTab.tsx").then((m) => ({ default: m.VehicleTab })));

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("charging");
  const [completionRecord, setCompletionRecord] =
    useState<ChargingRecord | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const activeSession = useChargingStore((s) => s.activeSession);
  const legacyQueue = useChargingStore((s) => s.offlineQueue);
  const setLegacyQueue = useChargingStore((s) => s.setQueue);
  const outboxCount = useSyncStore((s) => s.outbox.length);
  const importLegacyQueue = useSyncStore((s) => s.importLegacyQueue);

  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);
  const theme = useSettingsStore((s) => s.theme);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);

  const showToast = useToastStore((s) => s.showToast);
  const { needRefresh, update, dismiss } = useServiceWorker();
  useAutoImport();

  const t = getTranslations(lang);

  // Gemini: real-time clock for "living HUD" feel
  const [clock, setClock] = useState("");
  const clockRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
      );
    };
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        if (mq.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // Migrate legacy offline queue to sync outbox (one-time)
  const legacyMigratedRef = useRef(false);
  useEffect(() => {
    if (!legacyMigratedRef.current && legacyQueue.length > 0) {
      importLegacyQueue(legacyQueue);
      setLegacyQueue([]);
      legacyMigratedRef.current = true;
    }
  }, [legacyQueue, importLegacyQueue, setLegacyQueue]);

  // Outbox retry: on online event + periodic (60s)
  useEffect(() => {
    const tryFlush = async () => {
      const { outbox, flushOutbox } = useSyncStore.getState();
      if (outbox.length === 0 || !navigator.onLine || !gasUrl) return;
      const { ackedCount } = await flushOutbox(gasUrl);
      if (ackedCount > 0) {
        showToast(t.toastQueueSent.replace("{n}", String(ackedCount)), "success");
      }
    };
    window.addEventListener("online", tryFlush);
    tryFlush();
    const interval = setInterval(tryFlush, 60000);
    return () => {
      window.removeEventListener("online", tryFlush);
      clearInterval(interval);
    };
  }, [gasUrl, showToast, t]);

  const handleChargingComplete = (record: ChargingRecord) => {
    setCompletionRecord(record);
  };

  if (!onboardingDone) {
    return (
      <>
        <Onboarding t={t} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-space-void text-text-bright relative">
      {/* Deep Space Background Layers */}
      <Starfield />
      <div className="nexus-grid-bg" aria-hidden="true" />
      <div className="vignette-overlay" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border-glow px-4 py-3" role="banner" style={{ background: "linear-gradient(180deg, rgba(0, 240, 255, 0.03) 0%, rgba(10, 15, 30, 0.95) 100%)" }}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-nexus-cyan glow-breathe" style={{ boxShadow: "0 0 8px rgba(0, 240, 255, 0.6)" }} />
              <h1 className="font-display text-base font-bold tracking-widest chroma-glitch" style={{ background: "linear-gradient(90deg, #00F0FF, #7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                EV CHARGE LOG
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-nexus-cyan/40 tracking-wider border border-nexus-cyan/20 px-1.5 py-0.5 rounded">
                v{APP_VERSION}
              </span>
              {activeSession && (
                <span className="font-mono text-[8px] text-nexus-green tracking-widest uppercase glow-breathe flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-nexus-green" style={{ boxShadow: "0 0 6px rgba(57, 255, 20, 0.6)" }} />
                  CHARGING
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-nexus-cyan/60 tracking-widest tabular-nums">
              {clock}
            </span>
            <button
              onClick={() => setLang(lang === "ja" ? "en" : "ja")}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider text-text-mid hover:text-nexus-cyan border border-border-subtle hover:border-border-glow transition-all"
            >
              {lang === "ja" ? "EN" : "JA"}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center px-1.5 py-1 rounded-lg text-nexus-cyan/60 hover:text-nexus-cyan hover:bg-nexus-cyan-glow border border-transparent hover:border-border-glow transition-all"
              aria-label={t.helpTitle}
            >
              <HelpCircle size={13} strokeWidth={2} />
            </button>
            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-1.5 py-1 rounded-lg text-nexus-cyan/60 hover:text-nexus-cyan hover:bg-nexus-cyan-glow border border-transparent hover:border-border-glow transition-all"
              aria-label={t.openSpreadsheet}
            >
              <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>
        </div>
        {/* Header glow separator */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.3), transparent)" }} />
      </header>

      {/* System Status Bar */}
      <div className="max-w-lg mx-auto px-4 pt-2 relative z-10">
        <div className="flex items-center gap-3 text-[8px] font-mono tracking-widest uppercase text-text-dim/60">
          <span className="flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${navigator.onLine ? "bg-nexus-green" : "bg-nexus-error glow-breathe"}`} />
            {navigator.onLine ? "ONLINE" : "OFFLINE"}
          </span>
          <span className="text-border-subtle">|</span>
          <span>{gasUrl ? "GAS:LINKED" : "GAS:NONE"}</span>
          <span className="text-border-subtle">|</span>
          <span>PWA:ACTIVE</span>
          {outboxCount > 0 && (
            <>
              <span className="text-border-subtle">|</span>
              <span className="text-nexus-warning">SYNC:{outboxCount}</span>
            </>
          )}
        </div>
      </div>

      {/* Reminder Banner */}
      <ReminderBanner t={t} />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-20 relative z-10" role="main">
        <ErrorBoundary>
          {activeTab === "charging" && (
            <>
              {activeSession ? (
                <LiveChargingScreen
                  t={t}
                  onComplete={handleChargingComplete}
                />
              ) : (
                <StartChargingForm t={t} />
              )}
            </>
          )}

          <Suspense fallback={<div className="flex justify-center py-10"><div className="spinner" /></div>}>
            {activeTab === "history" && <HistoryList t={t} />}
            {activeTab === "vehicle" && <VehicleTab t={t} />}
            {activeTab === "stats" && <StatsDashboard t={t} />}
            {activeTab === "settings" && <SettingsPanel t={t} />}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} t={t} />

      {/* Completion Summary */}
      {completionRecord && (
        <CompletionSummary
          record={completionRecord}
          onDismiss={() => setCompletionRecord(null)}
          t={t}
        />
      )}

      {/* PWA Update Banner */}
      {needRefresh && (
        <div className="fixed top-0 left-0 right-0 z-[110] flex items-center justify-center p-2">
          <div className="glass-panel px-4 py-2.5 flex items-center gap-3 border-border-glow">
            <span className="text-nexus-cyan text-sm font-medium font-display tracking-wide">
              {t.newVersionAvail}
            </span>
            <button
              onClick={update}
              className="btn-plasma text-xs px-3 py-1 rounded-lg"
            >
              {t.update}
            </button>
            <button
              onClick={dismiss}
              className="text-text-dim hover:text-text-mid text-xs transition-colors"
            >
              {t.later}
            </button>
          </div>
        </div>
      )}

      {/* Help Panel */}
      {showHelp && <HelpPanel t={t} onClose={() => setShowHelp(false)} />}

      {/* Toast */}
      <ToastContainer />
    </div>
  );
}
