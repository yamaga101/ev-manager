import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GasPayload, SyncEnvelope } from "../types/index.ts";
import { sendToGas } from "../../shared/utils/gas-sync.ts";
import { useSettingsStore } from "./useSettingsStore.ts";

let _isFlushing = false;

function generateId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createEnvelope(payload: GasPayload): SyncEnvelope {
  return {
    envelopeId: generateId(),
    idempotencyKey: `${payload.type}-${payload.type === "ping" ? "ping" : payload.id}-${Date.now()}`,
    payload,
    status: "pending",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
}

interface SyncState {
  outbox: SyncEnvelope[];
  syncSend: (gasUrl: string, payload: GasPayload) => Promise<boolean>;
  flushOutbox: (gasUrl: string) => Promise<{ ackedCount: number; failedCount: number }>;
  importLegacyQueue: (items: GasPayload[]) => void;
  clearOutbox: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      outbox: [],
      syncSend: async (gasUrl, payload) => {
        const envelope = createEnvelope(payload);
        const gasToken = useSettingsStore.getState().settings.gasSharedToken;

        set((state) => ({ outbox: [...state.outbox, envelope] }));
        if (!gasUrl) return false;

        set((state) => ({
          outbox: state.outbox.map((e) =>
            e.envelopeId === envelope.envelopeId
              ? {
                  ...e,
                  status: "sending" as const,
                  lastAttemptAt: new Date().toISOString(),
                }
              : e,
          ),
        }));

        try {
          const ok = await sendToGas(gasUrl, payload, {
            idempotencyKey: envelope.idempotencyKey,
            token: gasToken,
          });
          if (ok) {
            set((state) => ({
              outbox: state.outbox.filter((e) => e.envelopeId !== envelope.envelopeId),
            }));
            return true;
          }
          set((state) => ({
            outbox: state.outbox.map((e) =>
              e.envelopeId === envelope.envelopeId
                ? {
                    ...e,
                    status: "failed" as const,
                    lastError: "GAS returned error",
                    retryCount: e.retryCount + 1,
                  }
                : e,
            ),
          }));
          return false;
        } catch (err) {
          set((state) => ({
            outbox: state.outbox.map((e) =>
              e.envelopeId === envelope.envelopeId
                ? {
                    ...e,
                    status: "failed" as const,
                    lastError: String(err),
                    retryCount: e.retryCount + 1,
                  }
                : e,
            ),
          }));
          return false;
        }
      },
      flushOutbox: async (gasUrl) => {
        if (_isFlushing || !gasUrl) {
          return { ackedCount: 0, failedCount: 0 };
        }

        _isFlushing = true;
        const gasToken = useSettingsStore.getState().settings.gasSharedToken;
        let ackedCount = 0;
        let failedCount = 0;

        try {
          set((state) => ({
            outbox: state.outbox.map((e) =>
              e.status === "sending" ? { ...e, status: "pending" as const } : e,
            ),
          }));

          const items = get().outbox.filter(
            (e) => e.status === "pending" || e.status === "failed",
          );

          for (const envelope of items) {
            set((state) => ({
              outbox: state.outbox.map((e) =>
                e.envelopeId === envelope.envelopeId
                  ? {
                      ...e,
                      status: "sending" as const,
                      lastAttemptAt: new Date().toISOString(),
                    }
                  : e,
              ),
            }));

            try {
              const ok = await sendToGas(gasUrl, envelope.payload, {
                idempotencyKey: envelope.idempotencyKey,
                token: gasToken,
              });
              if (ok) {
                set((state) => ({
                  outbox: state.outbox.filter((e) => e.envelopeId !== envelope.envelopeId),
                }));
                ackedCount++;
              } else {
                set((state) => ({
                  outbox: state.outbox.map((e) =>
                    e.envelopeId === envelope.envelopeId
                      ? {
                          ...e,
                          status: "failed" as const,
                          lastError: "GAS returned error",
                          retryCount: e.retryCount + 1,
                        }
                      : e,
                  ),
                }));
                failedCount++;
              }
            } catch (err) {
              set((state) => ({
                outbox: state.outbox.map((e) =>
                  e.envelopeId === envelope.envelopeId
                    ? {
                        ...e,
                        status: "failed" as const,
                        lastError: String(err),
                        retryCount: e.retryCount + 1,
                      }
                    : e,
                ),
              }));
              failedCount++;
            }
          }
        } finally {
          _isFlushing = false;
        }

        return { ackedCount, failedCount };
      },
      importLegacyQueue: (items) => {
        if (items.length === 0) return;
        const envelopes = items.map(createEnvelope);
        set((state) => ({ outbox: [...state.outbox, ...envelopes] }));
      },
      clearOutbox: () => set({ outbox: [] }),
    }),
    {
      name: "ev-sync-outbox",
      partialize: (state) => ({ outbox: state.outbox }),
    },
  ),
);
