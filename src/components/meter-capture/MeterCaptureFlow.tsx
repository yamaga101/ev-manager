import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, Check, AlertTriangle, X, RotateCcw } from "lucide-react";
import { compressImage } from "../../utils/image-compress.ts";
import { extractMeterData } from "../../utils/meter-ocr.ts";
import { segmentCountToSoh } from "../../utils/calculations.ts";
import type { MeterExtractResult, ConfidenceLevel } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

type Status = "idle" | "processing" | "confirming" | "error";

interface MeterCaptureFlowProps {
  apiKey: string;
  t: Translations;
  onApply: (data: MeterExtractResult) => void;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  low: "text-amber-500 dark:text-amber-400",
  not_visible: "text-gray-400 dark:text-slate-500",
};

const CONFIDENCE_ICONS: Record<ConfidenceLevel, typeof Check> = {
  high: Check,
  low: AlertTriangle,
  not_visible: X,
};

const ROW_STYLES: Record<ConfidenceLevel, string> = {
  high: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20",
  low: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20",
  not_visible: "border-border dark:border-dark-border bg-gray-50 dark:bg-gray-800/50",
};

function SegmentBar({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-4 rounded-sm ${
            i < count
              ? "bg-ev-primary"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

export function MeterCaptureFlow({ apiKey, t, onApply }: MeterCaptureFlowProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<MeterExtractResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanup = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      cleanup();
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStatus("processing");
      setErrorMsg("");

      try {
        const base64 = await compressImage(file);
        const data = await extractMeterData(base64, apiKey);
        setResult(data);
        setStatus("confirming");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    },
    [apiKey, cleanup],
  );

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result);
      cleanup();
      setStatus("idle");
      setResult(null);
    }
  }, [result, onApply, cleanup]);

  const handleRetry = useCallback(() => {
    cleanup();
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setTimeout(() => fileInputRef.current?.click(), 100);
  }, [cleanup]);

  const handleDismiss = useCallback(() => {
    cleanup();
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  }, [cleanup]);

  type FieldDef = {
    key: string;
    confKey: keyof MeterExtractResult["confidence"];
    label: string;
    unit: string;
    value: number | null;
  };

  const primaryFields: FieldDef[] = result
    ? [
        { key: "odometer", confKey: "odometer", label: t.odometer, unit: "km", value: result.odometer },
        { key: "batteryPct", confKey: "batteryPct", label: t.batteryPct, unit: "%", value: result.batteryPct },
        { key: "rangeKm", confKey: "rangeKm", label: t.rangeAcOff, unit: "km", value: result.rangeKm },
        { key: "efficiencyKmPerKwh", confKey: "efficiencyKmPerKwh", label: t.efficiency, unit: "km/kWh", value: result.efficiencyKmPerKwh },
      ]
    : [];

  const hasLeafFields = result && (result.rangeAcOnKm != null || result.segmentCount != null);

  const formatCapturedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={handleCapture}
        disabled={status === "processing"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ev-primary/50 text-ev-primary hover:bg-ev-primary/5 transition-colors disabled:opacity-50"
        title={t.meterCapture}
      >
        {status === "processing" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} />
        )}
        {t.meterCapture}
      </button>

      {/* Processing overlay */}
      {status === "processing" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 mx-4 text-center shadow-xl">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Meter"
                className="w-48 h-32 object-cover rounded-lg mx-auto mb-4 dark:brightness-90 dark:contrast-110"
              />
            )}
            <Loader2 size={32} className="animate-spin text-ev-primary mx-auto mb-3" />
            <p className="text-sm text-text-primary dark:text-dark-text">{t.meterProcessing}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl p-5 mx-0 sm:mx-4 w-full sm:max-w-sm shadow-xl">
            <div className="flex items-center gap-2 text-ev-error mb-3">
              <AlertTriangle size={18} />
              <span className="font-medium text-sm">{t.meterError}</span>
            </div>
            <p className="text-xs text-text-muted mb-4 break-all">{errorMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 rounded-xl border border-ev-primary text-ev-primary text-sm font-medium hover:bg-ev-primary/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> {t.meterRetry}
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl border border-border dark:border-dark-border text-text-muted text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm results */}
      {status === "confirming" && result && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl p-5 mx-0 sm:mx-4 w-full sm:max-w-sm shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text flex items-center gap-2">
                <Camera size={18} className="text-ev-primary" />
                {t.meterResults}
              </h3>
              <button onClick={handleDismiss} className="text-text-muted hover:text-text-primary dark:hover:text-dark-text">
                <X size={18} />
              </button>
            </div>

            {previewUrl && (
              <div className="relative mb-4">
                <img
                  src={previewUrl}
                  alt="Meter"
                  className="w-full h-32 object-cover rounded-lg dark:brightness-90 dark:contrast-110"
                />
                <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {formatCapturedAt(result.capturedAt)}
                </span>
              </div>
            )}

            {/* Primary fields */}
            <div className="space-y-2 mb-3">
              {primaryFields.map(({ key, confKey, label, unit, value }) => {
                const conf = result.confidence[confKey];
                const ConfIcon = CONFIDENCE_ICONS[conf];

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${ROW_STYLES[conf]}`}
                  >
                    <div>
                      <div className="text-[10px] text-text-muted">{label}</div>
                      <div className="text-lg font-semibold text-text-primary dark:text-dark-text">
                        {value != null ? (
                          <>
                            {value.toLocaleString()}{" "}
                            <span className="text-xs text-text-muted font-normal">{unit}</span>
                          </>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </div>
                    </div>
                    <ConfIcon size={14} className={CONFIDENCE_STYLES[conf]} />
                  </div>
                );
              })}
            </div>

            {/* Leaf-specific fields */}
            {hasLeafFields && (
              <div className="space-y-2 mb-3 pt-2 border-t border-border dark:border-dark-border">
                {/* Range AC ON */}
                {result.rangeAcOnKm != null && (
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${ROW_STYLES[result.confidence.rangeAcOnKm]}`}>
                    <div>
                      <div className="text-[10px] text-text-muted">{t.rangeAcOn}</div>
                      <div className="text-lg font-semibold text-text-primary dark:text-dark-text">
                        {result.rangeAcOnKm} <span className="text-xs text-text-muted font-normal">km</span>
                      </div>
                    </div>
                    {(() => { const I = CONFIDENCE_ICONS[result.confidence.rangeAcOnKm]; return <I size={14} className={CONFIDENCE_STYLES[result.confidence.rangeAcOnKm]} />; })()}
                  </div>
                )}

                {/* Segment count */}
                {result.segmentCount != null && (
                  <div className={`p-2.5 rounded-xl border ${ROW_STYLES[result.confidence.segmentCount]}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[10px] text-text-muted">{t.segmentCount}</div>
                      {(() => { const I = CONFIDENCE_ICONS[result.confidence.segmentCount]; return <I size={14} className={CONFIDENCE_STYLES[result.confidence.segmentCount]} />; })()}
                    </div>
                    <SegmentBar count={result.segmentCount} />
                    <div className="mt-1 text-xs text-text-muted">
                      {result.segmentCount}/12 → {t.sohEstimate} {segmentCountToSoh(result.segmentCount)}%
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 py-3 rounded-xl bg-ev-primary text-white font-medium text-sm hover:bg-ev-primary-dark transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> {t.meterApply}
              </button>
              <button
                onClick={handleRetry}
                className="py-3 px-4 rounded-xl border border-border dark:border-dark-border text-text-muted text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
