import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DriveLogRecord } from "../types/index.ts";

interface DriveLogState {
  records: DriveLogRecord[];
  addRecord: (record: DriveLogRecord) => void;
  updateRecord: (record: DriveLogRecord) => void;
  deleteRecord: (id: string) => void;
}

export const useDriveLogStore = create<DriveLogState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records],
        })),

      updateRecord: (record) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === record.id ? record : r,
          ),
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "ev-drivelog-v1",
      partialize: (state) => ({ records: state.records }),
    },
  ),
);
