// Generate a simple canvas fingerprint hash
async function getCanvasHash(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('unknown');
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('wenzapay,fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('wenzapay,fingerprint', 4, 17);

      const dataURL = canvas.toDataURL();
      
      // Simple hash function for string
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        const char = dataURL.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      resolve(hash.toString(16));
    } catch {
      resolve('error');
    }
  });
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch {}
  return 'unknown';
}

function getFontCount(): number {
  // Simple heuristic checking widths of typical fonts
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Comic Sans MS', 'Impact', 'Georgia'];
  let detected = 0;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const testString = 'mmmmmmmmmmlli';
    
    for (const font of testFonts) {
      let matched = false;
      for (const baseFont of baseFonts) {
        ctx.font = `72px ${baseFont}`;
        const defaultWidth = ctx.measureText(testString).width;
        
        ctx.font = `72px "${font}", ${baseFont}`;
        const testWidth = ctx.measureText(testString).width;
        
        if (testWidth !== defaultWidth) {
          matched = true;
          break;
        }
      }
      if (matched) detected++;
    }
  } catch {}
  return detected;
}

export async function collectFingerprint() {
  return {
    canvasHash: await getCanvasHash(),
    webglRenderer: getWebGLRenderer(),
    screenRes: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language || 'unknown',
    platform: navigator.platform || 'unknown',
    fontCount: getFontCount()
  };
}
