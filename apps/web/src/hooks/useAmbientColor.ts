import { useEffect } from 'react';

const SAMPLE_SIZE = 12;
const cache = new Map<string, string>();

/**
 * Picks a vivid representative colour: averages pixels weighted by
 * saturation so a colourful cover on a black background still reads as its
 * colour, not as murky grey.
 */
function pickColor(data: Uint8ClampedArray): string | null {
  let r = 0, g = 0, b = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i]!, pg = data[i + 1]!, pb = data[i + 2]!;
    const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
    const lightness = (max + min) / 510;
    if (lightness < 0.08 || lightness > 0.94) continue;
    const weight = 0.15 + (max - min) / 255;
    r += pr * weight; g += pg * weight; b += pb * weight; total += weight;
  }
  if (!total) return null;
  return `rgb(${Math.round(r / total)} ${Math.round(g / total)} ${Math.round(b / total)})`;
}

function sample(artworkUrl: string): Promise<string | null> {
  const cached = cache.get(artworkUrl);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const image = new Image();
    // Same-origin optimiser output keeps the canvas readable for remote art.
    image.src = `/_next/image?url=${encodeURIComponent(artworkUrl)}&w=32&q=40`;
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const color = pickColor(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
        if (color) cache.set(artworkUrl, color);
        resolve(color);
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
  });
}

/** Publishes the artwork's colour as the app-wide `--ambient` CSS variable. */
export function useAmbientColor(artworkUrl: string | undefined | null) {
  useEffect(() => {
    if (!artworkUrl) {
      document.documentElement.style.removeProperty('--ambient');
      return;
    }
    let cancelled = false;
    void sample(artworkUrl).then((color) => {
      if (cancelled || !color) return;
      document.documentElement.style.setProperty('--ambient', color);
    });
    return () => { cancelled = true; };
  }, [artworkUrl]);
}
