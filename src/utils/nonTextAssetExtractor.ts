import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedNonTextAsset } from '../types';

interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  pixelCount: number;
}

/**
 * Finds discrete graphic regions from the transparent non-text raster canvas.
 * Uses a spatial grid and connected component analysis to group coherent shapes,
 * stamps, vector graphics, and figures into discrete bounding boxes.
 */
function findDiscreteGraphicRegions(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  gridStep: number = 4,
  mergeThreshold: number = 14
): Region[] {
  const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imgData.data;

  const cols = Math.ceil(canvasWidth / gridStep);
  const rows = Math.ceil(canvasHeight / gridStep);
  const grid = new Uint8Array(cols * rows);

  // Mark grid cells containing non-background, non-transparent pixels
  for (let gy = 0; gy < rows; gy++) {
    const startY = gy * gridStep;
    const endY = Math.min(canvasHeight, startY + gridStep);

    for (let gx = 0; gx < cols; gx++) {
      const startX = gx * gridStep;
      const endX = Math.min(canvasWidth, startX + gridStep);

      let hasAssetPixel = false;

      // Sample pixels in this cell
      for (let y = startY; y < endY; y += 2) {
        const rowOffset = y * canvasWidth;
        for (let x = startX; x < endX; x += 2) {
          const idx = (rowOffset + x) * 4;
          const a = data[idx + 3];

          // If pixel has alpha and is not an opaque pure-white page wash
          if (a > 20) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Ignore pure-white page washes (r > 248, g > 248, b > 248)
            const isWhiteWash = r > 248 && g > 248 && b > 248 && a === 255;
            if (!isWhiteWash) {
              hasAssetPixel = true;
              break;
            }
          }
        }
        if (hasAssetPixel) break;
      }

      if (hasAssetPixel) {
        grid[gy * cols + gx] = 1;
      }
    }
  }

  // Connected Component Analysis (BFS with 8-connectivity)
  const visited = new Uint8Array(cols * rows);
  const initialRegions: Region[] = [];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const idx = gy * cols + gx;
      if (visited[idx] || !grid[idx]) continue;

      let minGx = gx;
      let maxGx = gx;
      let minGy = gy;
      let maxGy = gy;
      let count = 0;

      const queue: number[] = [gx, gy];
      visited[idx] = 1;

      let head = 0;
      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];
        count++;

        if (cx < minGx) minGx = cx;
        if (cx > maxGx) maxGx = cx;
        if (cy < minGy) minGy = cy;
        if (cy > maxGy) maxGy = cy;

        // 8-directional neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const nIdx = ny * cols + nx;
              if (!visited[nIdx] && grid[nIdx]) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      // Convert back to canvas pixels
      const minX = Math.max(0, minGx * gridStep);
      const minY = Math.max(0, minGy * gridStep);
      const maxX = Math.min(canvasWidth - 1, (maxGx + 1) * gridStep);
      const maxY = Math.min(canvasHeight - 1, (maxGy + 1) * gridStep);
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;

      // Filter out tiny single-pixel noise
      if (count >= 2 && (width >= 6 || height >= 6)) {
        initialRegions.push({
          minX,
          minY,
          maxX,
          maxY,
          width,
          height,
          pixelCount: count,
        });
      }
    }
  }

  if (initialRegions.length <= 1) {
    return initialRegions;
  }

  // Iterative merge pass: Group nearby parts that belong to the same stamp / figure / shape
  let mergedList = [...initialRegions];
  let changed = true;

  while (changed) {
    changed = false;
    const nextList: Region[] = [];
    const used = new Uint8Array(mergedList.length);

    for (let i = 0; i < mergedList.length; i++) {
      if (used[i]) continue;
      let cur = { ...mergedList[i] };

      for (let j = i + 1; j < mergedList.length; j++) {
        if (used[j]) continue;
        const other = mergedList[j];

        // Check if bounding boxes overlap or are within mergeThreshold
        const xDist = Math.max(0, Math.max(cur.minX, other.minX) - Math.min(cur.maxX, other.maxX));
        const yDist = Math.max(0, Math.max(cur.minY, other.minY) - Math.min(cur.maxY, other.maxY));

        if (xDist <= mergeThreshold && yDist <= mergeThreshold) {
          cur.minX = Math.min(cur.minX, other.minX);
          cur.minY = Math.min(cur.minY, other.minY);
          cur.maxX = Math.max(cur.maxX, other.maxX);
          cur.maxY = Math.max(cur.maxY, other.maxY);
          cur.width = cur.maxX - cur.minX + 1;
          cur.height = cur.maxY - cur.minY + 1;
          cur.pixelCount += other.pixelCount;
          used[j] = 1;
          changed = true;
        }
      }
      nextList.push(cur);
    }
    mergedList = nextList;
  }

  return mergedList;
}

/**
 * Extracts all non-text assets (vector graphics, stamps, shapes, and figures)
 * from a PDF page and converts them into discrete, editable image objects.
 */
export async function extractDiscreteNonTextAssets(
  pageProxy: any,
  unscaledWidth: number,
  unscaledHeight: number,
  pageIndex: number = 0,
  renderScale: number = 2.0
): Promise<{
  assets: ExtractedNonTextAsset[];
  cleanBgDataUrl: string;
}> {
  if (!pageProxy) {
    return { assets: [], cleanBgDataUrl: '' };
  }

  // Viewport at high DPI
  const viewport = pageProxy.getViewport({ scale: renderScale });
  const canvasWidth = Math.round(viewport.width);
  const canvasHeight = Math.round(viewport.height);

  // 1. Create a transparent rendering canvas
  const transparentCanvas = document.createElement('canvas');
  transparentCanvas.width = canvasWidth;
  transparentCanvas.height = canvasHeight;
  const ctx = transparentCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { assets: [], cleanBgDataUrl: '' };
  }

  // Start 100% transparent
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 2. Filter out text operations so only non-text assets are rendered
  let operationsFilter: ((idx: number) => boolean) | undefined = undefined;
  try {
    const opList = await pageProxy.getOperatorList();
    const textOps = new Set([
      (pdfjsLib as any).OPS?.showText,
      (pdfjsLib as any).OPS?.showSpacedText,
      (pdfjsLib as any).OPS?.nextLineShowText,
      (pdfjsLib as any).OPS?.nextLineSetSpacingShowText,
    ].filter(Boolean));

    if (textOps.size > 0 && opList && opList.fnArray) {
      operationsFilter = (idx: number) => !textOps.has(opList.fnArray[idx]);
    }
  } catch (err) {
    console.warn('Could not construct operationsFilter for non-text asset extraction:', err);
  }

  // Render non-text operations onto the transparent canvas
  await pageProxy.render({
    canvasContext: ctx,
    viewport: viewport,
    canvas: transparentCanvas,
    operationsFilter,
  }).promise;

  // 3. Find discrete regions for stamps, vector graphics, shapes, and figures
  const regions = findDiscreteGraphicRegions(ctx, canvasWidth, canvasHeight, 4, 16);
  const assets: ExtractedNonTextAsset[] = [];

  let assetIndex = 1;
  for (const region of regions) {
    // Add small 2px padding around bounding box
    const pad = 2;
    const rx = Math.max(0, region.minX - pad);
    const ry = Math.max(0, region.minY - pad);
    const rw = Math.min(canvasWidth - rx, region.width + pad * 2);
    const rh = Math.min(canvasHeight - ry, region.height + pad * 2);

    if (rw < 4 || rh < 4) continue;

    // Create a discrete slice canvas for this asset
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = rw;
    sliceCanvas.height = rh;
    const sliceCtx = sliceCanvas.getContext('2d');
    if (!sliceCtx) continue;

    sliceCtx.drawImage(transparentCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
    const dataUrl = sliceCanvas.toDataURL('image/png');

    // Unscaled PDF coordinates
    const unscaledX = rx / renderScale;
    const unscaledY = ry / renderScale;
    const unscaledW = rw / renderScale;
    const unscaledH = rh / renderScale;

    // Asset classification
    let assetType: 'vector' | 'stamp' | 'shape' | 'figure' | 'image' = 'vector';
    const isSquareLike = Math.abs(unscaledW - unscaledH) < Math.max(unscaledW, unscaledH) * 0.35;

    if (isSquareLike && unscaledW < 180 && unscaledH < 180 && unscaledW > 25) {
      assetType = 'stamp';
    } else if (unscaledW > 180 && unscaledH > 140) {
      assetType = 'figure';
    } else if (
      (unscaledH <= 30 && unscaledW >= 50) ||
      (unscaledW <= 30 && unscaledH >= 50) ||
      (unscaledW > 60 && unscaledH > 20 && unscaledH < 120)
    ) {
      assetType = 'shape';
    } else {
      assetType = 'vector';
    }

    assets.push({
      id: `asset-p${pageIndex + 1}-${assetIndex++}`,
      dataUrl,
      x: unscaledX,
      y: unscaledY,
      width: unscaledW,
      height: unscaledH,
      unscaledX,
      unscaledY,
      unscaledWidth: unscaledW,
      unscaledHeight: unscaledH,
      assetType,
      label: `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} ${assets.length + 1}`,
    });
  }

  // 4. Clean background without the assets (clean pure white)
  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = canvasWidth;
  cleanCanvas.height = canvasHeight;
  const cleanCtx = cleanCanvas.getContext('2d');
  if (cleanCtx) {
    cleanCtx.fillStyle = '#ffffff';
    cleanCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  const cleanBgDataUrl = cleanCanvas.toDataURL('image/png');

  return {
    assets,
    cleanBgDataUrl,
  };
}
