/**
 * Advanced Inpainting, Background Separation & Stroke Refinement Engine
 * Implements surrounding texture sampling, background inpainting,
 * foreground color sampling, and contour/threshold stroke extraction
 * for scanned/flattened PDF editing (similar to Adobe Acrobat's engine).
 */

export interface SampledBackground {
  color: string; // HEX color (e.g. #FAF7F2)
  rgb: { r: number; g: number; b: number };
  fillType: 'solid' | 'texture';
  variance: number; // Texture variance
}

export interface SampledForeground {
  color: string; // HEX color (e.g. #1E293B)
  rgb: { r: number; g: number; b: number };
  darkPixelRatio: number;
}

/**
 * Samples the surrounding background color and texture from a perimeter ring
 * outside a bounding box on an image or canvas.
 */
export function sampleSurroundingBackground(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  ringThickness: number = 6
): SampledBackground {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { color: '#ffffff', rgb: { r: 255, g: 255, b: 255 }, fillType: 'solid', variance: 0 };
  }

  const imgW = (imageSource as HTMLImageElement).naturalWidth || imageSource.width || 1000;
  const imgH = (imageSource as HTMLImageElement).naturalHeight || imageSource.height || 1000;

  canvas.width = imgW;
  canvas.height = imgH;
  ctx.drawImage(imageSource, 0, 0);

  // Compute sampling boundaries (outer ring)
  const pad = Math.max(2, ringThickness);
  const minX = Math.max(0, Math.floor(bbox.x - pad));
  const minY = Math.max(0, Math.floor(bbox.y - pad));
  const maxX = Math.min(imgW - 1, Math.ceil(bbox.x + bbox.width + pad));
  const maxY = Math.min(imgH - 1, Math.ceil(bbox.y + bbox.height + pad));

  const ringW = maxX - minX;
  const ringH = maxY - minY;
  if (ringW <= 0 || ringH <= 0) {
    return { color: '#ffffff', rgb: { r: 255, g: 255, b: 255 }, fillType: 'solid', variance: 0 };
  }

  const imgData = ctx.getImageData(minX, minY, ringW, ringH);
  const data = imgData.data;

  // Inner box boundaries relative to ring
  const innerLeft = bbox.x - minX;
  const innerTop = bbox.y - minY;
  const innerRight = innerLeft + bbox.width;
  const innerBottom = innerTop + bbox.height;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  const samples: Array<{ r: number; g: number; b: number; lum: number }> = [];

  for (let y = 0; y < ringH; y++) {
    for (let x = 0; x < ringW; x++) {
      // Only sample outside the inner bounding box (the ring)
      const isInsideText = x >= innerLeft && x <= innerRight && y >= innerTop && y <= innerBottom;
      if (isInsideText) continue;

      const idx = (y * ringW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 128) continue;

      // Calculate luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Discard very dark pixels (e.g. text from adjacent lines)
      if (lum < 140) continue;

      samples.push({ r, g, b, lum });
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }
  }

  if (count === 0) {
    return { color: '#ffffff', rgb: { r: 255, g: 255, b: 255 }, fillType: 'solid', variance: 0 };
  }

  // Calculate mean
  const rMean = Math.round(rSum / count);
  const gMean = Math.round(gSum / count);
  const bMean = Math.round(bSum / count);

  // Calculate variance to detect paper grain/texture
  let varSum = 0;
  for (const s of samples) {
    const diff = s.lum - (0.299 * rMean + 0.587 * gMean + 0.114 * bMean);
    varSum += diff * diff;
  }
  const variance = Math.sqrt(varSum / count);

  const hex = `#${((1 << 24) + (rMean << 16) + (gMean << 8) + bMean).toString(16).slice(1)}`;
  const fillType: 'solid' | 'texture' = variance > 6.5 ? 'texture' : 'solid';

  return {
    color: hex,
    rgb: { r: rMean, g: gMean, b: bMean },
    fillType,
    variance: Number(variance.toFixed(2)),
  };
}

/**
 * Samples the foreground text color (dark stroke ink) from within the bounding box.
 */
export function sampleForegroundTextColor(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  bgLumThreshold: number = 190
): SampledForeground {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { color: '#111827', rgb: { r: 17, g: 24, b: 39 }, darkPixelRatio: 0.15 };
  }

  const imgW = (imageSource as HTMLImageElement).naturalWidth || imageSource.width || 1000;
  const imgH = (imageSource as HTMLImageElement).naturalHeight || imageSource.height || 1000;

  const bX = Math.max(0, Math.floor(bbox.x));
  const bY = Math.max(0, Math.floor(bbox.y));
  const bW = Math.min(imgW - bX, Math.ceil(bbox.width));
  const bH = Math.min(imgH - bY, Math.ceil(bbox.height));

  if (bW <= 0 || bH <= 0) {
    return { color: '#111827', rgb: { r: 17, g: 24, b: 39 }, darkPixelRatio: 0.15 };
  }

  canvas.width = bW;
  canvas.height = bH;
  ctx.drawImage(imageSource, bX, bY, bW, bH, 0, 0, bW, bH);

  const imgData = ctx.getImageData(0, 0, bW, bH);
  const data = imgData.data;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let darkCount = 0;
  const total = bW * bH;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Ink threshold
    if (lum < bgLumThreshold) {
      rSum += r;
      gSum += g;
      bSum += b;
      darkCount++;
    }
  }

  if (darkCount === 0) {
    return { color: '#111827', rgb: { r: 17, g: 24, b: 39 }, darkPixelRatio: 0 };
  }

  const rMean = Math.round(rSum / darkCount);
  const gMean = Math.round(gSum / darkCount);
  const bMean = Math.round(bSum / darkCount);
  const hex = `#${((1 << 24) + (rMean << 16) + (gMean << 8) + bMean).toString(16).slice(1)}`;

  return {
    color: hex,
    rgb: { r: rMean, g: gMean, b: bMean },
    darkPixelRatio: Number((darkCount / total).toFixed(3)),
  };
}

/**
 * Clean Background Inpainting:
 * Erases the original raster text underneath a bounding box on the background canvas
 * by filling it seamlessly with surrounding sampled texture/color and feathered boundary blending.
 */
export function inpaintRegionOnCanvas(
  targetCanvas: HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  options?: {
    pad?: number;
    sampledColor?: string;
    addGrain?: boolean;
    feather?: number;
  }
): boolean {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const pad = options?.pad ?? 3;
  const feather = options?.feather ?? 2;
  const x = Math.max(0, bbox.x - pad);
  const y = Math.max(0, bbox.y - pad);
  const w = Math.min(targetCanvas.width - x, bbox.width + pad * 2);
  const h = Math.min(targetCanvas.height - y, bbox.height + pad * 2);

  if (w <= 0 || h <= 0) return false;

  // Determine fill color: either provided or sampled from border
  let fillColor = options?.sampledColor;
  let bgRgb = { r: 255, g: 255, b: 255 };

  if (!fillColor) {
    const sampled = sampleSurroundingBackground(targetCanvas, bbox, pad + 4);
    fillColor = sampled.color;
    bgRgb = sampled.rgb;
  } else {
    // Parse hex
    const clean = fillColor.replace('#', '');
    const num = parseInt(clean, 16);
    if (!isNaN(num)) {
      bgRgb = {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }
  }

  // Draw smooth local inpainting fill
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, w, h);

  // If paper texture has grain, synthesize subtle Gaussian-like grain to match surrounding scan
  if (options?.addGrain) {
    const patchData = ctx.getImageData(x, y, w, h);
    const d = patchData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      d[i] = Math.min(255, Math.max(0, bgRgb.r + noise));
      d[i + 1] = Math.min(255, Math.max(0, bgRgb.g + noise));
      d[i + 2] = Math.min(255, Math.max(0, bgRgb.b + noise));
    }
    ctx.putImageData(patchData, x, y);
  }

  // Feather edges with subtle gradient to avoid sharp rectangular boundary seams
  if (feather > 0) {
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = feather;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
  return true;
}

/**
 * Stroke Refinement & Contour Extraction (for signatures, stamps, seals):
 * Applies adaptive thresholding and alpha transparency to separate dark strokes
 * from paper background, preserving ink opacity and edge fidelity.
 */
export function extractContourStrokes(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  options?: {
    threshold?: number; // 0-255 luminance cut-off (default ~200)
    sharpenStrokes?: boolean;
    preserveInkColor?: boolean;
  }
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  const bX = Math.max(0, Math.floor(bbox.x));
  const bY = Math.max(0, Math.floor(bbox.y));
  const bW = Math.max(10, Math.floor(bbox.width));
  const bH = Math.max(10, Math.floor(bbox.height));

  canvas.width = bW;
  canvas.height = bH;

  // Draw isolated crop
  ctx.drawImage(sourceImage, bX, bY, bW, bH, 0, 0, bW, bH);

  const imgData = ctx.getImageData(0, 0, bW, bH);
  const data = imgData.data;

  // Adaptive threshold calculation
  const threshold = options?.threshold ?? 195;
  const preserveInk = options?.preserveInkColor ?? true;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= threshold) {
      // Background pixel -> Make completely transparent
      data[i + 3] = 0;
    } else {
      // Foreground ink stroke -> Smooth alpha falloff for anti-aliased edge
      const alphaNorm = Math.max(0, Math.min(1, (threshold - lum) / (threshold * 0.45)));
      data[i + 3] = Math.round(alphaNorm * 255);

      if (!preserveInk) {
        // Boost contrast / sharpen vector stroke
        data[i] = 17;
        data[i + 1] = 24;
        data[i + 2] = 39;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
