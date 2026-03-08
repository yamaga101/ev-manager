import { useState, useMemo } from "react";
import { Bell, AlertTriangle, X } from "lucide-react";
import { useMaintenanceStore } from "../../store/useMaintenanceStore.ts";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import type { Translations } from "../../i18n/index.ts";

interface ReminderBannerProps {
  t: Translations;
}

type ReminderSeverity = "upcoming" | "overdue";

interface Reminder {
  id: string;
  label: string;
  daysFromNow: number;
  severity: ReminderSeverity;
}

const DAYS_THRESHOLD = 30;

function getDaysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyDays(days: number): ReminderSeverity | null {
  if (days < 0) return "overdue";
  if (days <= DAYS_THRESHOLD) return "upcoming";
  return null;
}

export function ReminderBanner({ t }: ReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const maintenanceRecords = useMaintenanceStore((s) => s.maintenanceRecords);
  const inspectionRecords = useMaintenanceStore((s) => s.inspectionRecords);
  const insuranceRecords = useVehicleStore((s) => s.insuranceRecords);
  const taxRecords = useVehicleStore((s) => s.taxRecords);

  const reminders = useMemo<Reminder[]>(() => {
    const result: Reminder[] = [];

    // Maintenance records with nextDueDate
    for (const rec of maintenanceRecords) {
      if (!rec.nextDueDate) continue;
      const days = getDaysFromNow(rec.nextDueDate);
      const severity = classifyDays(days);
      if (severity) {
        result.push({
          id: `maintenance-${rec.id}`,
          label: `${t.maintenance}: ${rec.description}`,
          daysFromNow: days,
          severity,
        });
      }
    }

    // Inspection records with nextDueDate
    for (const rec of inspectionRecords) {
      const days = getDaysFromNow(rec.nextDueDate);
      const severity = classifyDays(days);
      if (severity) {
        const typeLabel =
          rec.type === "shaken"
            ? "車検"
            : rec.type === "12month"
              ? "12ヶ月点検"
              : "6ヶ月点検";
        result.push({
          id: `inspection-${rec.id}`,
          label: `${t.inspectionLog}: ${typeLabel}`,
          daysFromNow: days,
          severity,
        });
      }
    }

    // Insurance records - check endDate
    for (const rec of insuranceRecords) {
      const days = getDaysFromNow(rec.endDate);
      const severity = classifyDays(days);
      if (severity) {
        result.push({
          id: `insurance-${rec.id}`,
          label: `${t.insurance}: ${rec.provider}`,
          daysFromNow: days,
          severity,
        });
      }
    }

    // Tax records - unpaid only, check dueDate
    for (const rec of taxRecords) {
      if (rec.paidDate) continue;
      const days = getDaysFromNow(rec.dueDate);
      const severity = classifyDays(days);
      if (severity) {
        result.push({
          id: `tax-${rec.id}`,
          label: `${t.tax}: ${rec.fiscalYear}年度`,
          daysFromNow: days,
          severity,
        });
      }
    }

    // Sort: overdue first, then by days ascending
    return result.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "overdue" ? -1 : 1;
      }
      return a.daysFromNow - b.daysFromNow;
    });
  }, [maintenanceRecords, inspectionRecords, insuranceRecords, taxRecords, t]);

  if (dismissed || reminders.length === 0) return null;

  const hasOverdue = reminders.some((r) => r.severity === "overdue");

  return (
    <div
      className={`w-full border-b ${
        hasOverdue
          ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
          : "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-lg mx-auto px-4 py-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {hasOverdue ? (
              <AlertTriangle
                size={15}
                className="text-red-500 dark:text-red-400 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Bell
                size={15}
                className="text-yellow-600 dark:text-yellow-400 shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              className={`text-xs font-semibold ${
                hasOverdue
                  ? "text-red-700 dark:text-red-300"
                  : "text-yellow-700 dark:text-yellow-300"
              }`}
            >
              {t.reminders}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="dismiss reminders"
            className={`p-0.5 rounded transition-colors ${
              hasOverdue
                ? "text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                : "text-yellow-500 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-300"
            }`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Reminder items */}
        <ul className="flex flex-col gap-1" role="list">
          {reminders.map((reminder) => (
            <ReminderItem key={reminder.id} reminder={reminder} t={t} />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ReminderItemProps {
  reminder: Reminder;
  t: Translations;
}

function ReminderItem({ reminder, t }: ReminderItemProps) {
  const isOverdue = reminder.severity === "overdue";
  const absDays = Math.abs(reminder.daysFromNow);

  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span
        className={`truncate ${
          isOverdue
            ? "text-red-700 dark:text-red-300"
            : "text-yellow-700 dark:text-yellow-300"
        }`}
      >
        {reminder.label}
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-[10px] ${
          isOverdue
            ? "bg-red-500 text-white dark:bg-red-600"
            : "bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-950"
        }`}
      >
        {isOverdue
          ? `${absDays} ${t.daysOverdue}`
          : reminder.daysFromNow === 0
            ? t.overdue
            : `${absDays} ${t.daysLeft}`}
      </span>
    </li>
  );
}
