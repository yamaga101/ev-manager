import type { MeterExtractResult } from "../types/index.ts";

const EXTRACTION_PROMPT = `You are analyzing a Nissan Leaf electric vehicle instrument cluster photo.

## Nissan Leaf Instrument Cluster Reference

### AZE0 (2013-2017, 30kWh) Layout:
- CENTER: analog speedometer
- RIGHT ARC (inner, blue/green): battery charge gauge (SOC)
- RIGHT ARC (outer, small white bars): 12 battery capacity bars showing State of Health (SOH) — ALWAYS visible
- LOWER CENTER: odometer LCD labeled "ODO" (total km)
- CENTER MFD: driving range in km. May show TWO values: AC OFF (top/primary) and AC ON (bottom, with snowflake icon)
- MFD PAGES: energy economy page shows km/kWh

### ZE1 (2018+, 40kWh) Layout:
- LARGE TFT DISPLAY with digital speedometer
- Blue bar = SOC with % number
- Range estimate near charge bar
- Battery Capacity menu screen: 12-segment battery icon (only visible if navigated to this menu)
- Odometer: small digits at bottom

## Extract these values:

1. **Odometer**: Look for "ODO" label + 5-6 digit number. Do NOT confuse with "TRIP A/B".
2. **Efficiency**: Number near "km/kWh". Typical: 4.0–10.0 km/kWh.
3. **Range AC OFF**: Primary/top range number on MFD. Unit: km.
4. **Range AC ON**: Second/lower range with snowflake icon. If only ONE range shown, return null.
5. **Battery %**: SOC percentage (0-100%).
6. **SOH Segments**: Count lit white bars on the FAR RIGHT outer arc (AZE0). Max 12. These are SEPARATE from blue charge bars. If ZE1 or not visible, return null.

Return ONLY valid JSON:
{
  "odometer": <integer or null>,
  "efficiencyKmPerKwh": <float to 1 decimal or null>,
  "rangeKm": <integer km or null>,
  "rangeAcOnKm": <integer km or null>,
  "batteryPct": <integer 0-100 or null>,
  "segmentCount": <integer 1-12 or null>,
  "confidence": {
    "odometer": "high" | "low" | "not_visible",
    "efficiencyKmPerKwh": "high" | "low" | "not_visible",
    "rangeKm": "high" | "low" | "not_visible",
    "rangeAcOnKm": "high" | "low" | "not_visible",
    "batteryPct": "high" | "low" | "not_visible",
    "segmentCount": "high" | "low" | "not_visible"
  }
}

Rules:
- Return null for any value not clearly readable — NEVER guess
- "high" = clearly readable, "low" = partially obscured, "not_visible" = not present
- rangeKm = AC OFF range (the larger number). rangeAcOnKm = AC ON range (smaller, with snowflake)
- If display shows miles, convert to km (× 1.60934), round to integer`;

export async function extractMeterData(
  imageBase64: string,
  apiKey: string,
): Promise<MeterExtractResult> {
  const capturedAt = new Date().toISOString();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini API");
  }

  const parsed = JSON.parse(text);
  return validateResult(parsed, capturedAt);
}

function validateResult(raw: Record<string, unknown>, capturedAt: string): MeterExtractResult {
  const r = raw as Record<string, number | null>;
  const conf = (raw.confidence ?? {}) as Record<string, string>;

  const validConfidence = (v: string | undefined): "high" | "low" | "not_visible" => {
    if (v === "high" || v === "low" || v === "not_visible") return v;
    return "not_visible";
  };

  return {
    odometer:
      r.odometer != null && (r.odometer as number) >= 0 && (r.odometer as number) <= 999999
        ? Math.round(r.odometer as number)
        : null,
    batteryPct:
      r.batteryPct != null && (r.batteryPct as number) >= 0 && (r.batteryPct as number) <= 100
        ? Math.round(r.batteryPct as number)
        : null,
    rangeKm:
      r.rangeKm != null && (r.rangeKm as number) >= 0 && (r.rangeKm as number) <= 999
        ? Math.round(r.rangeKm as number)
        : null,
    rangeAcOnKm:
      r.rangeAcOnKm != null && (r.rangeAcOnKm as number) >= 0 && (r.rangeAcOnKm as number) <= 999
        ? Math.round(r.rangeAcOnKm as number)
        : null,
    efficiencyKmPerKwh:
      r.efficiencyKmPerKwh != null &&
      (r.efficiencyKmPerKwh as number) > 0 &&
      (r.efficiencyKmPerKwh as number) <= 20
        ? Math.round((r.efficiencyKmPerKwh as number) * 10) / 10
        : null,
    segmentCount:
      r.segmentCount != null && (r.segmentCount as number) >= 0 && (r.segmentCount as number) <= 12
        ? Math.round(r.segmentCount as number)
        : null,
    capturedAt,
    confidence: {
      odometer: validConfidence(conf.odometer),
      batteryPct: validConfidence(conf.batteryPct),
      rangeKm: validConfidence(conf.rangeKm),
      rangeAcOnKm: validConfidence(conf.rangeAcOnKm),
      efficiencyKmPerKwh: validConfidence(conf.efficiencyKmPerKwh),
      segmentCount: validConfidence(conf.segmentCount),
    },
  };
}
