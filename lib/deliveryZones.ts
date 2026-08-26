// Resolves a delivery zone key from a city/state (as returned by
// lib/pincode.ts's India Post lookup), and reads the admin-configured
// charge for that zone from site_settings. Charges are always resolved
// server-side at order time — the client only uses this to preview the
// charge live on the checkout page.

export type DeliveryZoneKey =
  | "pune_local"
  | "mumbai"
  | "metro"
  | "nagpur"
  | "maharashtra"
  | "rest_of_india";

export interface DeliveryZoneConfig {
  label: string;
  charge: number;
}

export type DeliveryZoneSettings = Record<DeliveryZoneKey, DeliveryZoneConfig>;

export const DEFAULT_DELIVERY_ZONES: DeliveryZoneSettings = {
  pune_local: { label: "Pune (Local)", charge: 0 },
  mumbai: { label: "Mumbai", charge: 80 },
  metro: { label: "Other Metro Cities", charge: 100 },
  nagpur: { label: "Nagpur", charge: 80 },
  maharashtra: { label: "Rest of Maharashtra", charge: 60 },
  rest_of_india: { label: "Rest of India", charge: 150 },
};

// Other major metro cities (besides Mumbai/Pune/Nagpur, which get their own
// dedicated zones). District names as returned by the India Post API.
const METRO_CITIES = [
  "delhi",
  "new delhi",
  "bangalore",
  "bengaluru",
  "chennai",
  "kolkata",
  "hyderabad",
  "ahmedabad",
];

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

/**
 * Determines which delivery zone a city/state combination falls into.
 * `city` is expected to be the District/city name from the pincode lookup.
 */
export function resolveDeliveryZone(city: string, state: string): DeliveryZoneKey {
  const c = norm(city);
  const s = norm(state);

  if (c.includes("pune")) return "pune_local";
  if (c.includes("mumbai")) return "mumbai";
  if (c.includes("nagpur")) return "nagpur";
  if (METRO_CITIES.some((m) => c.includes(m))) return "metro";
  if (s === "maharashtra") return "maharashtra";
  return "rest_of_india";
}

export function getZoneCharge(
  zones: DeliveryZoneSettings | null | undefined,
  zoneKey: DeliveryZoneKey
): number {
  const settings = zones || DEFAULT_DELIVERY_ZONES;
  return settings[zoneKey]?.charge ?? DEFAULT_DELIVERY_ZONES[zoneKey].charge;
}

export function getZoneLabel(
  zones: DeliveryZoneSettings | null | undefined,
  zoneKey: DeliveryZoneKey
): string {
  const settings = zones || DEFAULT_DELIVERY_ZONES;
  return settings[zoneKey]?.label ?? DEFAULT_DELIVERY_ZONES[zoneKey].label;
}
