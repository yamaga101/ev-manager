import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VehicleSettings, Language, Theme } from "../types/index.ts";
import {
  PRE_CONFIGURED_GAS_URL,
  DEFAULT_GEMINI_API_KEY,
  DEFAULT_BATTERY_CAPACITY,
  DEFAULT_ELECTRICITY_RATE,
  DEFAULT_NIGHT_RATE,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_LANG,
  STORAGE_KEY_ONBOARDING,
} from "../constants/defaults.ts";

interface SettingsState {
  settings: VehicleSettings;
  lang: Language;
  theme: Theme;
  onboardingDone: boolean;
  updateSettings: (partial: Partial<VehicleSettings>) => void;
  setLang: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  completeOnboarding: () => void;
  initFromLegacy: (
    settings: Partial<VehicleSettings>,
    lang: Language,
    onboardingDone: boolean,
  ) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        batteryCapacity: DEFAULT_BATTERY_CAPACITY,
        electricityRate: DEFAULT_ELECTRICITY_RATE,
        nightRate: DEFAULT_NIGHT_RATE,
        useNightRate: false,
        gasUrl: PRE_CONFIGURED_GAS_URL,
        geminiApiKey: DEFAULT_GEMINI_API_KEY,
      },
      lang: "en",
      theme: "system",
      onboardingDone: false,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      setLang: (lang) => set({ lang }),

      setTheme: (theme) => set({ theme }),

      completeOnboarding: () => set({ onboardingDone: true }),

      initFromLegacy: (legacySettings, lang, onboardingDone) =>
        set((state) => ({
          settings: { ...state.settings, ...legacySettings },
          lang,
          onboardingDone,
        })),
    }),
    {
      name: "ev-settings-v3",
      partialize: (state) => ({
        settings: state.settings,
        lang: state.lang,
        theme: state.theme,
        onboardingDone: state.onboardingDone,
      }),
      migrate: (_persisted, version) => {
        if (version === 0) {
          // Check for legacy data on first load
          const legacyOnboarding = localStorage.getItem(STORAGE_KEY_ONBOARDING);
          const legacyLang = localStorage.getItem(STORAGE_KEY_LANG);
          let legacySettings: Partial<VehicleSettings> = {};
          try {
            const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (raw) legacySettings = JSON.parse(raw);
          } catch {
            // ignore
          }

          return {
            settings: {
              batteryCapacity:
                legacySettings.batteryCapacity || DEFAULT_BATTERY_CAPACITY,
              electricityRate:
                legacySettings.electricityRate || DEFAULT_ELECTRICITY_RATE,
              nightRate: legacySettings.nightRate || DEFAULT_NIGHT_RATE,
              useNightRate: legacySettings.useNightRate || false,
              gasUrl: legacySettings.gasUrl || PRE_CONFIGURED_GAS_URL,
              geminiApiKey: DEFAULT_GEMINI_API_KEY,
            },
            lang: (legacyLang as Language) || "en",
            theme: "system" as Theme,
            onboardingDone: legacyOnboarding === "true",
          };
        }
        return _persisted;
      },
      version: 1,
    },
  ),
);
