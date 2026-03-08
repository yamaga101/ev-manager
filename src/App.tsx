import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BottomNav } from "./components/ui/BottomNav.tsx";
import { ToastContainer } from "./components/ui/Toast.tsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.tsx";
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

  const activeSession = useChargingStore((s) => s.activeSession);
  const offlineQueue = useChargingStore((s) => s.offlineQueue);
  const setQueue = useChargingStore((s) => s.setQueue);

  const lang = useSettingsStore((s) => s.lang);
  const theme = useSettingsStore((s) => s.theme);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const gasUrl = useSettingsStore((s) => s.settings.gasUrl);

  const showToast = useToastStore((s) => s.showToast);
  const { needRefresh, update, dismiss } = useServiceWorker();

  const t = getTranslations(lang);

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
    <div className="min-h-screen bg-surface-alt dark:bg-dark-bg text-text-primary dark:text-dark-text">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-border dark:border-dark-border px-4 py-3" role="banner">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">
            EV<span className="text-ev-primary">Manager</span>
          </h1>
        </div>
      </header>

      {/* Reminder Banner */}
      <ReminderBanner t={t} />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-20" role="main">
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
          <div className="bg-white dark:bg-dark-surface rounded-xl px-4 py-2 flex items-center gap-3 border border-ev-primary/30 shadow-lg">
            <span className="text-ev-primary text-sm font-medium">
              {t.newVersionAvail}
            </span>
            <button
              onClick={update}
              className="bg-ev-primary text-white text-xs font-semibold px-3 py-1 rounded-lg hover:bg-ev-primary-dark transition-colors"
            >
              {t.update}
            </button>
            <button
              onClick={dismiss}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              {t.later}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastContainer />
    </div>
  );
}
