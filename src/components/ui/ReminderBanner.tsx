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
          ? "bg-nexus-error/5 border-nexus-error/20"
          : "bg-nexus-warning/5 border-nexus-warning/20"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {hasOverdue ? (
              <AlertTriangle
                size={13}
                className="text-nexus-error shrink-0"
                style={{ filter: "drop-shadow(0 0 4px rgba(255, 61, 87, 0.5))" }}
                aria-hidden="true"
              />
            ) : (
              <Bell
                size={13}
                className="text-nexus-warning shrink-0"
                style={{ filter: "drop-shadow(0 0 4px rgba(255, 184, 0, 0.5))" }}
                aria-hidden="true"
              />
            )}
            <span
              className={`font-display text-[9px] font-semibold tracking-[0.15em] uppercase ${
                hasOverdue ? "text-nexus-error" : "text-nexus-warning"
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
                ? "text-nexus-error/50 hover:text-nexus-error"
                : "text-nexus-warning/50 hover:text-nexus-warning"
            }`}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>

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
    <li className="flex items-center justify-between gap-2 text-[11px]">
      <span
        className={`truncate ${
          isOverdue ? "text-nexus-error/80" : "text-nexus-warning/80"
        }`}
      >
        {reminder.label}
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 font-mono-data font-medium text-[9px] ${
          isOverdue
            ? "bg-nexus-error/15 text-nexus-error border border-nexus-error/20"
            : "bg-nexus-warning/15 text-nexus-warning border border-nexus-warning/20"
        }`}
      >
        {isOverdue
          ? `${absDays} ${t.daysOverdue}`
          : reminder.daysFromNow === 0
            ? t.upcoming
            : `${absDays} ${t.daysLeft}`}
      </span>
    </li>
  );
}
