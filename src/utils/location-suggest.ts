import type { ChargingLocation } from "../types/index.ts";

export interface LocationCandidate {
  locationId: string;
  distanceMeters: number;
  accuracyMeters: number;
  autoSelected: boolean;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(x));
}

export function suggestNearestLocation(
  current: { lat: number; lng: number; accuracy: number },
  locations: ChargingLocation[],
  lastUsedLocationId?: string,
): { selectedId?: string; candidates: LocationCandidate[] } {
  const candidates = locations
    .filter(
      (loc): loc is ChargingLocation & { lat: number; lng: number } =>
        typeof loc.lat === "number" && typeof loc.lng === "number",
    )
    .map((loc) => ({
      locationId: loc.id,
      distanceMeters: Math.round(
        haversineMeters(current, { lat: loc.lat, lng: loc.lng }),
      ),
      accuracyMeters: Math.round(current.accuracy),
      radiusMeters: loc.radiusMeters ?? 120,
      lastUsedAt: loc.lastUsedAt ?? "",
    }))
    .sort((a, b) => {
      if (a.distanceMeters !== b.distanceMeters) {
        return a.distanceMeters - b.distanceMeters;
      }
      return b.lastUsedAt.localeCompare(a.lastUsedAt);
    });

  const nearest = candidates[0];
  const second = candidates[1];

  if (!nearest) {
    return {
      selectedId: lastUsedLocationId,
      candidates: [],
    };
  }

  const confident =
    current.accuracy <= 80 &&
    nearest.distanceMeters <= nearest.radiusMeters &&
    (!second || second.distanceMeters - nearest.distanceMeters >= current.accuracy / 2);

  return {
    selectedId: confident ? nearest.locationId : lastUsedLocationId,
    candidates: candidates.slice(0, 3).map((candidate, index) => ({
      locationId: candidate.locationId,
      distanceMeters: candidate.distanceMeters,
      accuracyMeters: candidate.accuracyMeters,
      autoSelected: confident && index === 0,
    })),
  };
}
