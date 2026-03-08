import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VehicleRegistration, InsuranceRecord, TaxRecord } from "../types/index.ts";

interface VehicleState {
  registration: VehicleRegistration | null;
  insuranceRecords: InsuranceRecord[];
  taxRecords: TaxRecord[];

  // Registration
  setRegistration: (reg: VehicleRegistration) => void;

  // Insurance CRUD
  addInsurance: (record: InsuranceRecord) => void;
  updateInsurance: (record: InsuranceRecord) => void;
  deleteInsurance: (id: string) => void;

  // Tax CRUD
  addTax: (record: TaxRecord) => void;
  updateTax: (record: TaxRecord) => void;
  deleteTax: (id: string) => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      registration: null,
      insuranceRecords: [],
      taxRecords: [],

      setRegistration: (reg) => set({ registration: reg }),

      addInsurance: (record) =>
        set((state) => ({
          insuranceRecords: [record, ...state.insuranceRecords],
        })),

      updateInsurance: (record) =>
        set((state) => ({
          insuranceRecords: state.insuranceRecords.map((r) =>
            r.id === record.id ? record : r,
          ),
        })),

      deleteInsurance: (id) =>
        set((state) => ({
          insuranceRecords: state.insuranceRecords.filter((r) => r.id !== id),
        })),

      addTax: (record) =>
        set((state) => ({
          taxRecords: [record, ...state.taxRecords],
        })),

      updateTax: (record) =>
        set((state) => ({
          taxRecords: state.taxRecords.map((r) =>
            r.id === record.id ? record : r,
          ),
        })),

      deleteTax: (id) =>
        set((state) => ({
          taxRecords: state.taxRecords.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "ev-vehicle-v1",
      partialize: (state) => ({
        registration: state.registration,
        insuranceRecords: state.insuranceRecords,
        taxRecords: state.taxRecords,
      }),
    },
  ),
);
