import * as fabric from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedTextItem, PDFPageInfo } from '../types';

export interface DynamicScaleResult {
  scale: number;
  width: number;
  height: number;
}

/**
 * 1. Dynamic Scale & "Fit-to-Page" Calculation:
 * Calculates the precise scale factor dynamically to fit the target container.
 * If container is wider than tall, fits to height so full page is visible without scrolling;
 * otherwise fits to container width.
 */
export function calculateDynamicPageScale(
  unscaledWidth: number,
  unscaledHeight: number,
  containerWidth: number,
  containerHeight: number,
  zoomMultiplier: number = 1.0
): DynamicScaleResult {
  // Safe bounds check
  const validUnscaledW = Math.max(10, unscaledWidth || 612);
  const validUnscaledH = Math.max(10, unscaledHeight || 792);

  // Accounting for margin/padding of the viewport container (e.g. 32px horizontally, 48px vertically)
  const padX = containerWidth < 640 ? 16 : 32;
  const padY = containerWidth < 640 ? 32 : 48;

  const availW = Math.max(120, (containerWidth || 800) - padX);
  const availH = Math.max(120, (containerHeight || 800) - padY);

  // Calculate scales for both dimensions
  const scaleW = availW / validUnscaledW;
  const scaleH = availH / validUnscaledH;

  // Fit to Page: pick the bounding fit so entire page is fully visible
  const fitScale = Math.min(scaleW, scaleH);

  // Combine with active zoom multiplier (1.0 = 100% of fit)
  const scale = Number((fitScale * (zoomMultiplier || 1.0)).toFixed(4));
  const width = Math.round(validUnscaledW * scale);
  const height = Math.round(validUnscaledH * scale);

  return { scale, width, height };
}

/**
 * Renders the page background using pdfjs-dist at high-DPI resolution
 * using window.devicePixelRatio for crispness, matching the target scaled dimensions.
 * Optionally suppresses native PDF text operations so no duplicate text is burned into the background.
 */
export async function renderHighDpiPageBackground(
  pageProxy: any,
  scale: number,
  suppressNativeText: boolean = true
): Promise<string> {
  if (!pageProxy) return '';

  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
  // High-DPI render viewport for crisp raster background
  const renderViewport = pageProxy.getViewport({ scale: scale * dpr });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(renderViewport.width);
  canvas.height = Math.round(renderViewport.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let operationsFilter: ((idx: number) => boolean) | undefined = undefined;

  if (suppressNativeText) {
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
    } catch (e) {
      console.warn('Could not construct operationsFilter for high-DPI background:', e);
    }
  }

  await pageProxy.render({
    canvasContext: ctx,
    viewport: renderViewport,
    canvas: canvas,
    operationsFilter,
  }).promise;

  return canvas.toDataURL('image/png');
}

/**
 * Checks if a Fabric Canvas instance is currently active, mounted, and safe to interact with.
 */
export function isCanvasAlive(canvas: any): canvas is fabric.Canvas {
  if (!canvas) return false;
  if (canvas.disposed || canvas.destroyed) return false;
  if (!canvas.elements || !canvas.elements.lower || !canvas.elements.lower.el) return false;
  return true;
}

/**
 * Safely disposes a Fabric Canvas instance without throwing or causing race conditions.
 */
export function safeDisposeCanvas(canvas: any): void {
  if (!canvas) return;
  if (canvas.disposed || canvas.destroyed) return;
  if (!canvas.elements || !canvas.elements.lower || !canvas.elements.lower.el) return;

  try {
    const promise = canvas.dispose();
    if (promise && typeof promise.catch === 'function') {
      promise.catch((err: any) => {
        console.warn('Safely handled canvas.dispose promise rejection:', err);
      });
    }
  } catch (err) {
    console.warn('Safely caught canvas.dispose error:', err);
  }
}

/**
 * 2. Sync Fabric.js Canvas to Page Dimensions:
 * - Sets fabricCanvas width & height dynamically to match the viewport dimensions
 * - Sets background layer to fill 100% of the active page bounds without overflow or gaps
 */
export async function syncFabricCanvasToPage(
  canvas: fabric.Canvas,
  targetWidth: number,
  targetHeight: number,
  bgDataUrl?: string
): Promise<void> {
  if (!isCanvasAlive(canvas)) return;

  // Sync dimensions directly
  try {
    canvas.setDimensions({
      width: targetWidth,
      height: targetHeight,
    });
  } catch (err) {
    console.warn('Could not set canvas dimensions:', err);
    return;
  }

  if (!bgDataUrl) {
    if (isCanvasAlive(canvas)) {
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
    }
    return;
  }

  try {
    const img = await fabric.FabricImage.fromURL(bgDataUrl, { crossOrigin: 'anonymous' });
    if (!isCanvasAlive(canvas)) return;

    img.set({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      scaleX: targetWidth / (img.width || 1),
      scaleY: targetHeight / (img.height || 1),
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    });
    (img as any).isPdfBackground = true;

    // Set background on Fabric Canvas
    canvas.backgroundImage = img;

    // Remove any previously inserted background objects in object list
    const existing = canvas.getObjects().filter((obj) => (obj as any).isPdfBackground);
    existing.forEach((obj) => {
      if (isCanvasAlive(canvas)) canvas.remove(obj);
    });

    // Also insert as first object so it is rendered in SVG/JSON exports seamlessly
    if (isCanvasAlive(canvas)) {
      canvas.insertAt(0, img);
      canvas.requestRenderAll();
    }
  } catch (err) {
    console.error('Failed to sync background image to canvas:', err);
  }
}

/**
 * 3. Interactive Element Coordinate Normalization:
 * Locks each converted text block to its extracted baseline coordinates (x, y)
 * and precise font point size. Does not apply default padding, line shifts,
 * or scale adjustments unless explicitly transformed by the user.
 */
export function populateNormalizedTextItems(
  canvas: fabric.Canvas,
  textItems: ExtractedTextItem[],
  scale: number
): void {
  if (!isCanvasAlive(canvas) || !textItems || textItems.length === 0) return;

  // Remove existing auto-extracted text items before re-populating
  const existingExtracted = canvas.getObjects().filter((obj) => (obj as any).extractedId);
  existingExtracted.forEach((obj) => {
    if (isCanvasAlive(canvas)) canvas.remove(obj);
  });

  for (const item of textItems) {
    if (!isCanvasAlive(canvas)) return;
    const isBold = item.fontWeight === 'bold';
    const isItalic = item.fontStyle === 'italic';

    // Source unscaled baseline coordinates and precise font point size
    const baseBaselineX = item.unscaledBaselineX ?? item.baselineX ?? (item.unscaledX !== undefined ? item.unscaledX : item.x);
    const baseBaselineY = item.unscaledBaselineY ?? item.baselineY ?? (item.unscaledY !== undefined ? item.unscaledY : item.y);
    const baseFontSize = item.unscaledFontSize !== undefined ? item.unscaledFontSize : item.fontSize;
    const baseWidth = item.unscaledWidth !== undefined ? item.unscaledWidth : item.width;

    // Strict 100% spatial accuracy: exact mathematical scale, no arbitrary padding or clamping
    const scaledFontSize = baseFontSize * scale;
    const scaledBaselineX = baseBaselineX * scale;
    const scaledBaselineY = baseBaselineY * scale;
    const scaledWidth = baseWidth * scale;

    // In Fabric Text (with originX 'left', originY 'top', strokeWidth 0, padding 0, lineHeight 1.0):
    // rendered baseline = top + fontSize * 1.13 * (1 - 0.222)
    // To lock the rendered text baseline to 100% of scaledBaselineY:
    const baselineOffset = scaledFontSize * 1.13 * (1 - 0.222);
    const lockedTop = scaledBaselineY - baselineOffset;
    const lockedLeft = scaledBaselineX;

    // When processing the PDF, native PDF text objects are replaced in-place:
    // Native text items have already been suppressed from the base image, so backgroundColor
    // is transparent, allowing seamless direct editing without duplicate text underneath.
    // Scanned OCR items use their sampled document texture inpaint color.
    const isNativeText = !item.isOcr;
    const bgColor = isNativeText ? 'transparent' : (item.inpaintColor || '#ffffff');
    const charSpacing = item.letterSpacing ? Math.round(item.letterSpacing * 50) : 0;

    const textbox = new fabric.Textbox(item.text, {
      left: lockedLeft,
      top: lockedTop,
      originX: 'left',
      originY: 'top',
      width: scaledWidth,
      fontSize: scaledFontSize,
      fontFamily: item.aiMatchedFont || item.fontFamily || 'Helvetica, Arial, sans-serif',
      fill: item.color || '#111827',
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textAlign: (item.textAlign as any) || 'left',
      lineHeight: item.lineHeight || 1.0, // Strict 1.0 to prevent unintended line shifts
      charSpacing,
      backgroundColor: bgColor,
      padding: 0, // Strict 0: Do not apply default padding
      strokeWidth: 0, // Strict 0: No border shift
      splitByGrapheme: false,
      editable: true,
      objectCaching: false,
    });

    // Force prevent any automatic layout restructuring, auto-alignment, or paragraph reflow during conversion:
    // Every extracted text node is rendered at its exact native baseline coordinates (x, y).
    (textbox as any)._wrapLine = function (_text: string, lineIndex: number) {
      return [this.textLines[lineIndex] || _text];
    };
    (textbox as any)._splitTextIntoLines = function (text: string) {
      return fabric.IText.prototype._splitTextIntoLines.call(this, text);
    };

    // Maintain original bounding box dimensions without premature line wraps
    const calcW = textbox.calcTextWidth() || 0;
    const finalW = Math.max(scaledWidth, calcW);
    textbox.set('width', finalW);
    textbox.initDimensions();

    (textbox as any).extractedId = item.id;
    (textbox as any).isOcr = Boolean(item.isOcr);
    (textbox as any).ocrConfidence = item.ocrConfidence;
    (textbox as any).inpaintColor = bgColor;
    (textbox as any).inpaintFillType = item.inpaintFillType || 'solid';
    (textbox as any).rawFontName = item.rawFontName;
    (textbox as any).aiMatchedFont = item.aiMatchedFont;
    (textbox as any).aiConfidence = item.aiConfidence;
    (textbox as any).aiMatchReason = item.aiMatchReason;
    (textbox as any).unscaledX = item.unscaledX !== undefined ? item.unscaledX : item.x;
    (textbox as any).unscaledY = item.unscaledY !== undefined ? item.unscaledY : item.y;
    (textbox as any).unscaledBaselineX = baseBaselineX;
    (textbox as any).unscaledBaselineY = baseBaselineY;
    (textbox as any).unscaledFontSize = baseFontSize;
    (textbox as any).unscaledWidth = baseWidth;
    (textbox as any).unscaledHeight = item.unscaledHeight !== undefined ? item.unscaledHeight : item.height;
    (textbox as any).unscaledLineHeight = item.lineHeight || 1.0;
    (textbox as any).unscaledTextAlign = item.textAlign || 'left';

    canvas.add(textbox);
  }

  canvas.requestRenderAll();
}
