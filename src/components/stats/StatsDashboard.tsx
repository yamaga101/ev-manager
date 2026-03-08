import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Star, MapPin } from "lucide-react";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useMaintenanceStore } from "../../store/useMaintenanceStore.ts";
import { useVehicleStore } from "../../store/useVehicleStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { calcChargedKwh, calcCost } from "../../utils/calculations.ts";
import {
  DEFAULT_BATTERY_CAPACITY,
  DEFAULT_ELECTRICITY_RATE,
} from "../../constants/defaults.ts";
import type { Translations } from "../../i18n/index.ts";

interface StatsDashboardProps {
  t: Translations;
}

type Period = "1M" | "3M" | "6M" | "ALL";

export function StatsDashboard({ t }: StatsDashboardProps) {
  const history = useChargingStore((s) => s.history);
  const maintenanceRecords = useMaintenanceStore((s) => s.maintenanceRecords);
  const insuranceRecords = useVehicleStore((s) => s.insuranceRecords);
  const taxRecords = useVehicleStore((s) => s.taxRecords);
  const settings = useSettingsStore((s) => s.settings);
  const [period, setPeriod] = useState<Period>("ALL");

  const capacity = settings.batteryCapacity || DEFAULT_BATTERY_CAPACITY;
  const rate = settings.electricityRate || DEFAULT_ELECTRICITY_RATE;

  const filteredHistory = useMemo(() => {
    if (period === "ALL") return history;
    const months = { "1M": 1, "3M": 3, "6M": 6 }[period];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return history.filter(
      (h) => new Date(h.startTime || h.timestamp || "") >= cutoff,
    );
  }, [history, period]);

  const stats = useMemo(() => {
    let totalKwh = 0;
    let totalCost = 0;
    let totalEff = 0;
    let effCount = 0;

    filteredHistory.forEach((h) => {
      const kwh = calcChargedKwh(
        capacity,
        h.startBattery || 0,
        h.endBattery || h.batteryAfter || 0,
      );
      totalKwh += kwh;
      totalCost += calcCost(kwh, rate);
      if (h.efficiency && h.efficiency > 0) {
        totalEff += h.efficiency;
        effCount++;
      }
    });

    return {
      count: filteredHistory.length,
      totalKwh: totalKwh.toFixed(1),
      totalCost: Math.round(totalCost),
      avgEfficiency: effCount > 0 ? (totalEff / effCount).toFixed(1) : "-",
    };
  }, [filteredHistory, capacity, rate]);

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const d = new Date(h.startTime || h.timestamp || "");
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({ month: month.slice(5), count }));
  }, [filteredHistory]);

  // Efficiency trend data
  const efficiencyData = useMemo(() => {
    return [...filteredHistory]
      .reverse()
      .filter((h) => h.efficiency && h.efficiency > 0)
      .slice(-20)
      .map((h, i) => ({
        index: i + 1,
        efficiency: h.efficiency,
      }));
  }, [filteredHistory]);

  // Monthly cost data
  const monthlyCostData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const d = new Date(h.startTime || h.timestamp || "");
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const kwh = calcChargedKwh(
        capacity,
        h.startBattery || 0,
        h.endBattery || h.batteryAfter || 0,
      );
      monthMap[key] = (monthMap[key] || 0) + calcCost(kwh, rate);
    });
    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, cost]) => ({ month: month.slice(5), cost }));
  }, [filteredHistory, capacity, rate]);

  // Total cost trend: stacked bar chart by month (charging + maintenance + insurance + tax)
  const totalCostTrendData = useMemo(() => {
    // Determine date range from period filter
    const cutoffDate = (() => {
      if (period === "ALL") return null;
      const months = { "1M": 1, "3M": 3, "6M": 6 }[period];
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      return d;
    })();

    const isInRange = (dateStr: string): boolean => {
      if (!cutoffDate) return true;
      return new Date(dateStr) >= cutoffDate;
    };

    const monthKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    };

    const map: Record<
      string,
      { charging: number; maintenance: number; insurance: number; tax: number }
    > = {};

    const ensureKey = (key: string) => {
      if (!map[key]) map[key] = { charging: 0, maintenance: 0, insurance: 0, tax: 0 };
    };

    // Charging cost
    filteredHistory.forEach((h) => {
      const dateStr = h.startTime || h.timestamp || "";
      if (!dateStr) return;
      const key = monthKey(dateStr);
      ensureKey(key);
      const kwh = calcChargedKwh(
        capacity,
        h.startBattery || 0,
        h.endBattery || h.batteryAfter || 0,
      );
      map[key].charging += calcCost(kwh, rate);
    });

    // Maintenance cost
    maintenanceRecords.forEach((r) => {
      if (!r.date || !isInRange(r.date)) return;
      const key = monthKey(r.date);
      ensureKey(key);
      map[key].maintenance += r.cost || 0;
    });

    // Insurance cost (spread premium evenly over months of coverage)
    insuranceRecords.forEach((r) => {
      if (!r.startDate) return;
      const start = new Date(r.startDate);
      const end = r.endDate ? new Date(r.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
      const totalMonths = Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()),
      );
      const monthlyPremium = (r.premium || 0) / totalMonths;

      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= endMonth) {
        const dateStr = cursor.toISOString();
        if (isInRange(dateStr)) {
          const key = `${cursor.getFullYear()}-${(cursor.getMonth() + 1).toString().padStart(2, "0")}`;
          ensureKey(key);
          map[key].insurance += monthlyPremium;
        }
        cursor.setMonth(cursor.getMonth() + 1);
      }
    });

    // Tax cost (placed in the month of dueDate)
    taxRecords.forEach((r) => {
      if (!r.dueDate || !isInRange(r.dueDate)) return;
      const key = monthKey(r.dueDate);
      ensureKey(key);
      map[key].tax += r.amount || 0;
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, costs]) => ({
        month: month.slice(5),
        charging: Math.round(costs.charging),
        maintenance: Math.round(costs.maintenance),
        insurance: Math.round(costs.insurance),
        tax: Math.round(costs.tax),
      }));
  }, [filteredHistory, maintenanceRecords, insuranceRecords, taxRecords, period, capacity, rate]);

  // Favorite spots: top 5 locations by usage with kWh and avg cost
  const favoriteSpotsData = useMemo(() => {
    const locMap: Record<
      string,
      { count: number; totalKwh: number; totalCost: number }
    > = {};
    filteredHistory.forEach((h) => {
      const name = h.locationName || "Unknown";
      if (!locMap[name]) locMap[name] = { count: 0, totalKwh: 0, totalCost: 0 };
      const kwh = calcChargedKwh(
        capacity,
        h.startBattery || 0,
        h.endBattery || h.batteryAfter || 0,
      );
      locMap[name].count++;
      locMap[name].totalKwh += kwh;
      locMap[name].totalCost += calcCost(kwh, rate);
    });
    return Object.entries(locMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data], index) => ({
        rank: index + 1,
        name,
        count: data.count,
        totalKwh: parseFloat(data.totalKwh.toFixed(1)),
        avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0,
      }));
  }, [filteredHistory, capacity, rate]);

  // SOH trend data (only records that have soh field)
  const sohData = useMemo(() => {
    return [...filteredHistory]
      .reverse()
      .filter((h) => h.soh !== undefined && h.soh !== null && h.soh > 0)
      .slice(-20)
      .map((h, i) => ({
        index: i + 1,
        soh: h.soh as number,
      }));
  }, [filteredHistory]);

  // Location detailed stats
  const locationDetailData = useMemo(() => {
    const locMap: Record<
      string,
      { count: number; totalDuration: number; totalCost: number }
    > = {};
    filteredHistory.forEach((h) => {
      const name = h.locationName || "Unknown";
      if (!locMap[name]) locMap[name] = { count: 0, totalDuration: 0, totalCost: 0 };
      locMap[name].count++;
      locMap[name].totalDuration += h.duration || 0;
      const kwh = calcChargedKwh(capacity, h.startBattery || 0, h.endBattery || h.batteryAfter || 0);
      locMap[name].totalCost += calcCost(kwh, rate);
    });
    return Object.entries(locMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name: name.slice(0, 12),
        count: data.count,
        avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
        avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0,
      }));
  }, [filteredHistory, capacity, rate]);

  return (
    <div className="h-full overflow-y-auto custom-scroll pb-4">
      {/* Period filter */}
      <div className="flex gap-2 mb-4">
        {(["1M", "3M", "6M", "ALL"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              period === p
                ? "bg-ev-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-dark-surface rounded-xl p-3 text-center shadow-sm border border-border dark:border-dark-border">
          <div className="text-2xl font-semibold text-text-primary dark:text-dark-text">
            {stats.count}
          </div>
          <div className="text-xs text-text-muted">{t.totalSessions}</div>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-xl p-3 text-center shadow-sm border border-border dark:border-dark-border">
          <div className="text-2xl font-semibold text-ev-primary">
            {stats.totalKwh}
          </div>
          <div className="text-xs text-text-muted">{t.totalKwh}</div>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-xl p-3 text-center shadow-sm border border-border dark:border-dark-border">
          <div className="text-2xl font-semibold text-ev-success">
            &yen;{stats.totalCost}
          </div>
          <div className="text-xs text-text-muted">{t.totalCost}</div>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-xl p-3 text-center shadow-sm border border-border dark:border-dark-border">
          <div className="text-2xl font-semibold text-text-primary dark:text-dark-text">
            {stats.avgEfficiency}
          </div>
          <div className="text-xs text-text-muted">{t.avgEfficiency}</div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center text-text-muted py-10">
          {t.noDataPeriod}
        </div>
      ) : (
        <>
          {/* Monthly Chart */}
          {monthlyData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.monthlyCharges}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Efficiency Trend */}
          {efficiencyData.length >= 2 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.efficiencyTrend}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={efficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#0EA5E9"
                      strokeWidth={2}
                      dot={{ fill: "#0EA5E9", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SOH Trend */}
          {sohData.length >= 2 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.sohTrend}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={sohData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fontSize: 11 }}
                      unit="%"
                    />
                    <Tooltip formatter={(value: number) => [`${value}%`, "SOH"]} />
                    <Line
                      type="monotone"
                      dataKey="soh"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ fill: "#8B5CF6", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Favorite Spots */}
          {favoriteSpotsData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.favoriteSpots}
              </h3>
              <div className="flex flex-col gap-2">
                {favoriteSpotsData.map((spot) => (
                  <div
                    key={spot.name}
                    className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      {spot.rank === 1 ? (
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      ) : (
                        <MapPin size={16} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary dark:text-dark-text truncate">
                        {spot.name}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {spot.totalKwh} kWh
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold text-ev-primary">
                        {spot.count} {t.timesUsed}
                      </div>
                      <div className="text-xs text-ev-success">
                        avg ¥{spot.avgCost}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Cost Chart */}
          {monthlyCostData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.monthlyCost}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthlyCostData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`¥${Math.round(value)}`, t.cost]} />
                    <Bar dataKey="cost" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Total Cost Trend - Stacked bar chart */}
          {totalCostTrendData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.costTrend}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-border dark:border-dark-border">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={totalCostTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const labelMap: Record<string, string> = {
                          charging: t.chargingCost,
                          maintenance: t.maintenanceCostLabel,
                          insurance: t.insuranceCost,
                          tax: t.taxCost,
                        };
                        return [`¥${Math.round(value)}`, labelMap[name] ?? name];
                      }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const labelMap: Record<string, string> = {
                          charging: t.chargingCost,
                          maintenance: t.maintenanceCostLabel,
                          insurance: t.insuranceCost,
                          tax: t.taxCost,
                        };
                        return labelMap[value] ?? value;
                      }}
                      wrapperStyle={{ fontSize: 10 }}
                    />
                    <Bar dataKey="charging" stackId="a" fill="#10B981" />
                    <Bar dataKey="maintenance" stackId="a" fill="#F97316" />
                    <Bar dataKey="insurance" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="tax" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Location Detail Stats */}
          {locationDetailData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase">
                {t.locationStats}
              </h3>
              <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-border dark:border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border dark:border-dark-border bg-surface-alt dark:bg-gray-800/50">
                      <th className="text-left p-2 text-text-muted font-medium">{t.chargingLocation}</th>
                      <th className="text-right p-2 text-text-muted font-medium">{t.totalCharges}</th>
                      <th className="text-right p-2 text-text-muted font-medium">{t.avgDuration}</th>
                      <th className="text-right p-2 text-text-muted font-medium">{t.avgCost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationDetailData.map((loc) => (
                      <tr key={loc.name} className="border-b border-border/50 dark:border-dark-border/50 last:border-0">
                        <td className="p-2 text-text-primary dark:text-dark-text font-medium">{loc.name}</td>
                        <td className="p-2 text-right text-text-primary dark:text-dark-text">{loc.count}</td>
                        <td className="p-2 text-right text-text-muted">{loc.avgDuration}min</td>
                        <td className="p-2 text-right text-ev-success">¥{loc.avgCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
