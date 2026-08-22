// Looks up city/state for an Indian PIN code using India Post's free public
// API (no key required): https://api.postalpincode.in
// State defaults to Maharashtra since the shop only delivers locally, but
// whatever the API returns is used when available.

export interface PincodeResult {
  city: string;
  state: string;
  found: boolean;
}

export async function lookupPincode(pincode: string): Promise<PincodeResult> {
  const fallback: PincodeResult = { city: "", state: "Maharashtra", found: false };

  if (!/^\d{6}$/.test(pincode)) return fallback;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return fallback;

    const data = await res.json();
    const record = Array.isArray(data) ? data[0] : null;

    if (record?.Status === "Success" && Array.isArray(record.PostOffice) && record.PostOffice.length > 0) {
      const office = record.PostOffice[0];
      return {
        city: office.District || office.Block || office.Name || "",
        state: office.State || "Maharashtra",
        found: true,
      };
    }

    return fallback;
  } catch (e) {
    console.error("pincode lookup failed", e);
    return fallback;
  }
}
