import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
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
import { useChargingStore } from "./store/useChargingStore.ts";
import { useSettingsStore } from "./store/useSettingsStore.ts";
import { useToastStore } from "./store/useToastStore.ts";
import { useServiceWorker } from "./hooks/useServiceWorker.ts";
import { retryQueue } from "./utils/gas-sync.ts";
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
  const offlineQueue = useChargingStore((s) => s.offlineQueue);
  const setQueue = useChargingStore((s) => s.setQueue);

  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);
  const theme = useSettingsStore((s) => s.theme);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);

  const showToast = useToastStore((s) => s.showToast);
  const { needRefresh, update, dismiss } = useServiceWorker();

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

  // Offline queue retry
  const retryOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || !navigator.onLine || !gasUrl) return;
    const { remaining, sentCount } = await retryQueue(gasUrl, offlineQueue);
    setQueue(remaining);
    if (sentCount > 0) {
      showToast(t.toastQueueSent.replace("{n}", String(sentCount)), "success");
    }
  }, [offlineQueue, gasUrl, setQueue, showToast, t]);

  useEffect(() => {
    window.addEventListener("online", retryOfflineQueue);
    retryOfflineQueue();
    return () => window.removeEventListener("online", retryOfflineQueue);
  }, [retryOfflineQueue]);

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
      {/* Animated Grid Background */}
      <div className="nexus-grid-bg" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border-glow px-4 py-3" role="banner" style={{ background: "linear-gradient(180deg, rgba(0, 240, 255, 0.03) 0%, rgba(10, 15, 30, 0.95) 100%)" }}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-nexus-cyan glow-breathe" style={{ boxShadow: "0 0 8px rgba(0, 240, 255, 0.6)" }} />
              <h1 className="font-display text-base font-bold tracking-widest" style={{ background: "linear-gradient(90deg, #00F0FF, #7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 12px rgba(0, 240, 255, 0.3))" }}>
                EV CHARGE LOG
              </h1>
            </div>
            <span className="font-mono text-[9px] text-nexus-cyan/40 tracking-wider border border-nexus-cyan/20 px-1.5 py-0.5 rounded">
              v{APP_VERSION}
            </span>
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
      </header>

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
