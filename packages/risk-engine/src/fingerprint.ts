export interface FingerprintData {
  canvasHash: string;
  webglRenderer: string;
  screenRes: string;
  timezoneOffset: number;
  language: string;
  platform: string;
  fontCount: number;
}

export async function scoreFingerprint(fp: FingerprintData): Promise<{ score: number; signals: Record<string, any> }> {
  let score = 0;
  const signals: Record<string, any> = { ...fp, matchReasons: [] as string[] };

  if (!fp) {
    return { score: 50, signals: { error: 'No fingerprint provided' } };
  }

  // Known bot webgl signatures (Headless Chromium, SwiftShader, etc.)
  const suspiciousRenderers = ['swiftshader', 'llvmpipe', 'google', 'mesa offscreen'];
  if (suspiciousRenderers.some(r => fp.webglRenderer?.toLowerCase().includes(r))) {
    score += 40;
    signals.matchReasons.push('suspicious_webgl_renderer');
  }

  // Incomplete or fake-looking platform/language combos
  if (!fp.language || !fp.platform || fp.platform === 'unknown') {
    score += 15;
    signals.matchReasons.push('missing_basic_properties');
  }

  // Unusually low font count often indicates anti-fingerprinting or headless browser
  if (fp.fontCount < 3) {
    score += 15;
    signals.matchReasons.push('abnormally_low_font_count');
  }

  // Ideally, we would check if canvasHash is seen on >5 merchants in 24h via a database query here.
  // For MVP, we just assign base risk if things look weird.

  return { score: Math.min(100, score), signals };
}
