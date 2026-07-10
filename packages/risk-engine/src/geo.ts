/**
 * Geo-fencing module for OFAC compliance.
 */

// Basic stub of sanctioned countries (ISO 2-letter codes)
// In production, this should be dynamically loaded and updated monthly.
const OFAC_SANCTIONED_COUNTRIES = new Set([
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'RU', // Russia (Regions)
  'UA', // Ukraine (Regions like Crimea)
]);

export interface GeoCheckResult {
  allowed: boolean;
  countryCode?: string;
  reason?: string;
}

/**
 * Checks if a given IP address belongs to a sanctioned country.
 */
export async function checkGeoFencing(ipAddress: string): Promise<GeoCheckResult> {
  const isEnabled = process.env.COMPLIANCE_GEOFENCE_ENABLED === 'true';

  if (!isEnabled) {
    return { allowed: true };
  }

  try {
    // In production, call ipinfo.io or similar service
    // const res = await fetch(`https://ipinfo.io/${ipAddress}/json?token=...`);
    // const data = await res.json();
    // const countryCode = data.country;
    
    // For local dev/sandbox, assume allowed unless it's a specific mock IP
    const countryCode = ipAddress === '1.2.3.4' ? 'KP' : 'US';

    if (OFAC_SANCTIONED_COUNTRIES.has(countryCode)) {
      return {
        allowed: false,
        countryCode,
        reason: `Country code ${countryCode} is on the OFAC sanctions list.`
      };
    }

    return { allowed: true, countryCode };
  } catch (error: any) {
    // Fail-closed for compliance: if we can't verify geo, we block it.
    // Or depending on risk appetite, fail-open.
    return { allowed: false, reason: 'Geo-location service unavailable.' };
  }
}
