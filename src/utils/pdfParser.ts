import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedTextItem, PDFDocumentData, PDFPageInfo } from '../types';
import { runOcrOnPage } from './ocrPipeline';
import { inpaintRegionOnCanvas } from './inpaintingEngine';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface RawTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  fontName: string;
  color?: string;
}

/**
 * Extracts active text fill colors mapped to text rendering operations from the PDF operator list.
 */
function extractTextColorsFromOperatorList(opList: any): string[] {
  let currentColor = '#111827';
  const colors: string[] = [];
  const textOps = new Set([
    (pdfjsLib as any).OPS?.showText,
    (pdfjsLib as any).OPS?.showSpacedText,
    (pdfjsLib as any).OPS?.nextLineShowText,
    (pdfjsLib as any).OPS?.nextLineSetSpacingShowText,
  ].filter(Boolean));

  if (!opList || !opList.fnArray) return colors;

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === (pdfjsLib as any).OPS?.setFillRGBColor) {
      if (typeof args[0] === 'string') {
        currentColor = args[0];
      } else if (typeof args[0] === 'number') {
        const r = Math.min(255, Math.max(0, Math.round(args[0])));
        const g = Math.min(255, Math.max(0, Math.round(args[1])));
        const b = Math.min(255, Math.max(0, Math.round(args[2])));
        currentColor = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      }
    } else if (fn === (pdfjsLib as any).OPS?.setFillCMYKColor) {
      if (args && args.length >= 4) {
        const c = args[0] / 255;
        const m = args[1] / 255;
        const y = args[2] / 255;
        const k = args[3] / 255;
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));
        currentColor =
          '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
      }
    } else if (fn === (pdfjsLib as any).OPS?.setGray && args && typeof args[0] === 'number') {
      const g = Math.min(255, Math.max(0, Math.round(args[0])));
      currentColor = '#' + [g, g, g].map((x) => x.toString(16).padStart(2, '0')).join('');
    } else if (textOps.has(fn)) {
      colors.push(currentColor);
    }
  }
  return colors;
}

/**
 * Parse every extracted text node at its exact native baseline coordinates (x, y),
 * maintaining its original bounding box dimensions, text alignment, and line spacing.
 * Prevents any automatic layout restructuring, auto-alignment, or paragraph reflow during conversion.
 */
function parseExtractedTextNodes(
  rawItems: RawTextItem[],
  viewport: any
): ExtractedTextItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const extractedNodes: ExtractedTextItem[] = [];
  let nodeIdx = 1;

  for (const item of rawItems) {
    if (!item.str || item.str.trim().length === 0) continue;

    const tx = item.transform[4];
    const ty = item.transform[5];

    // Accurate font point size directly from the transformation matrix
    const scaleY = Math.hypot(item.transform[2], item.transform[3]);
    const scaleX = Math.hypot(item.transform[0], item.transform[1]);
    const fontSize = scaleY || scaleX || 12;

    // PDF coordinate to viewport point (PDF (0,0) is bottom-left; viewport (0,0) is top-left)
    const point = viewport.convertToViewportPoint(tx, ty);
    const baselineX = point[0];
    const baselineY = point[1];

    // In Fabric Text (with originX 'left', originY 'top', strokeWidth 0, padding 0, lineHeight 1.0):
    // rendered baseline = top + fontSize * 1.13 * (1 - 0.222)
    // Locked top coordinate ensures the rendered text baseline sits exactly at baselineY:
    const baselineOffset = fontSize * 1.13 * (1 - 0.222);
    const x = baselineX;
    const y = baselineY - baselineOffset;

    // Maintain original bounding box dimensions
    const width = item.width > 0 ? item.width : (item.str.length * (fontSize * 0.55));
    const height = item.height > 0 ? item.height : (fontSize * 1.13);

    // Maintain original text alignment and line spacing
    const textAlign = (item as any).dir === 'rtl' ? 'right' : 'left';
    const lineHeight = 1.0;

    const isBold = item.fontName?.toLowerCase().includes('bold') || false;
    const isItalic = item.fontName?.toLowerCase().includes('italic') || item.fontName?.toLowerCase().includes('oblique') || false;

    extractedNodes.push({
      id: `text-${nodeIdx++}`,
      text: item.str,
      x,
      y,
      baselineX,
      baselineY,
      width,
      height,
      fontSize,
      unscaledX: x,
      unscaledY: y,
      unscaledBaselineX: baselineX,
      unscaledBaselineY: baselineY,
      unscaledWidth: width,
      unscaledHeight: height,
      unscaledFontSize: fontSize,
      rawFontName: item.fontName,
      fontFamily: sanitizeFontFamily(item.fontName),
      color: item.color || '#111827',
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textAlign,
      lineHeight,
      pdfX: tx,
      pdfY: ty,
      pdfWidth: item.width,
      pdfHeight: item.height,
    });
  }

  return extractedNodes;
}

function sanitizeFontFamily(rawName: string): string {
  if (!rawName) return 'Helvetica, Arial, sans-serif';
  const clean = rawName.replace(/^[A-Z0-9]{6}\+/, ''); // strip PDF font subset prefix e.g. ABCDEF+
  if (/times|roman/i.test(clean)) return 'Times New Roman, serif';
  if (/courier|mono/i.test(clean)) return 'Courier, monospace';
  if (/georgia/i.test(clean)) return 'Georgia, serif';
  if (/helvetica|arial|sans/i.test(clean)) return 'Helvetica, Arial, sans-serif';
  return 'Helvetica, Arial, sans-serif';
}

export interface ParsePDFOptions {
  autoOcr?: boolean;
  forceOcr?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Parses a PDF file from an ArrayBuffer or File
 */
export async function parsePDFDocument(
  fileOrBuffer: File | ArrayBuffer,
  onProgressOrOptions?: ((progress: number, message: string) => void) | ParsePDFOptions
): Promise<PDFDocumentData> {
  const onProgress =
    typeof onProgressOrOptions === 'function'
      ? onProgressOrOptions
      : onProgressOrOptions?.onProgress;
  const autoOcr =
    typeof onProgressOrOptions === 'object' && onProgressOrOptions?.autoOcr !== undefined
      ? onProgressOrOptions.autoOcr
      : true; // Default to automated OCR pipeline enabled
  const forceOcr =
    typeof onProgressOrOptions === 'object' && onProgressOrOptions?.forceOcr !== undefined
      ? onProgressOrOptions.forceOcr
      : false;

  let arrayBuffer: ArrayBuffer;
  let fileName = 'document.pdf';
  let fileSize = 0;

  if (fileOrBuffer instanceof File) {
    fileName = fileOrBuffer.name;
    fileSize = fileOrBuffer.size;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
    fileSize = arrayBuffer.byteLength;
  }

  onProgress?.(10, 'Loading PDF document...');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PDFPageInfo[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      Math.round(15 + (pageNum / numPages) * 60),
      `Parsing page ${pageNum} of ${numPages}...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const standardViewport = page.getViewport({ scale: 1.0 });

    // 1. Extract native text content and operator list first
    const textContent = await page.getTextContent();
    const rawItems = (textContent.items as RawTextItem[]) || [];

    let opList: any = null;
    try {
      opList = await page.getOperatorList();
    } catch (e) {
      console.warn(`Could not get operator list for page ${pageNum}:`, e);
    }

    // Correlate active PDF fill colors to raw text items from the operator list
    if (opList) {
      const opColors = extractTextColorsFromOperatorList(opList);
      let colorIdx = 0;
      for (const item of rawItems) {
        if (item.str && item.str.trim().length > 0) {
          if (colorIdx < opColors.length) {
            item.color = opColors[colorIdx++];
          }
        }
      }
    }

    let textItems = parseExtractedTextNodes(rawItems, standardViewport);
    const hasNativeText = textItems.length > 0;

    // 2. Text Suppression Filter:
    // When processing the PDF, do not create duplicate text overlays on top of the base image.
    // Instead, extract and replace the native PDF text objects in-place:
    // We suppress native text-drawing operators (showText, showSpacedText, nextLineShowText, etc.)
    // during base image rendering so the background contains solely shapes, vectors, lines,
    // colors, charts, and images, without burned-in duplicate text glyphs.
    const textOps = new Set([
      (pdfjsLib as any).OPS?.showText,
      (pdfjsLib as any).OPS?.showSpacedText,
      (pdfjsLib as any).OPS?.nextLineShowText,
      (pdfjsLib as any).OPS?.nextLineSetSpacingShowText,
    ].filter(Boolean));

    const operationsFilter =
      hasNativeText && opList?.fnArray
        ? (opIdx: number) => !textOps.has(opList.fnArray[opIdx])
        : undefined;

    // Render high-DPI raster background (2x for retina sharpness)
    const renderScale = 2.0;
    const highDpiViewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(highDpiViewport.width);
    canvas.height = Math.round(highDpiViewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let bgDataUrl = '';
    if (ctx) {
      // Crisp white background fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: highDpiViewport,
        canvas: canvas,
        operationsFilter,
      }).promise;

      bgDataUrl = canvas.toDataURL('image/png');
    }

    // Generate small thumbnail for sidebar
    const thumbScale = 0.25;
    const thumbViewport = page.getViewport({ scale: thumbScale });
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.round(thumbViewport.width);
    thumbCanvas.height = Math.round(thumbViewport.height);
    const thumbCtx = thumbCanvas.getContext('2d');
    let thumbnailUrl = '';
    if (thumbCtx) {
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      await page.render({
        canvasContext: thumbCtx,
        viewport: thumbViewport,
        canvas: thumbCanvas,
        operationsFilter,
      }).promise;
      thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
    }

    let hasOcrProcessed = false;
    let isScannedOrFlattened = false;
    let ocrTextCount = 0;

    // Automated OCR Pipeline Trigger immediately upon upload:
    // If page has no native text (flattened / scanned / image-based) or forceOcr is enabled
    const isFlattened = rawItems.length === 0 || textItems.length === 0;
    if ((isFlattened && autoOcr) || forceOcr) {
      isScannedOrFlattened = true;
      const progressBase = Math.round(15 + (pageNum / numPages) * 70);
      onProgress?.(
        progressBase,
        `Running automated OCR on page ${pageNum}: detecting spatial text objects...`
      );

      try {
        const pageStub: PDFPageInfo = {
          pageNumber: pageNum,
          width: Math.round(standardViewport.width),
          height: Math.round(standardViewport.height),
          pdfWidth: standardViewport.width,
          pdfHeight: standardViewport.height,
          unscaledWidth: standardViewport.width,
          unscaledHeight: standardViewport.height,
          bgDataUrl,
          textItems: [],
        };

        const ocrItems = await runOcrOnPage(pageStub, (statusMsg) => {
          onProgress?.(progressBase, statusMsg);
        });

        if (ocrItems && ocrItems.length > 0) {
          textItems = forceOcr && textItems.length > 0 ? [...textItems, ...ocrItems] : ocrItems;
          hasOcrProcessed = true;
          ocrTextCount = ocrItems.length;

          // Erase/inpaint the raster text underneath on the base image so duplicate text is removed
          if (ctx) {
            for (const ocrItem of ocrItems) {
              inpaintRegionOnCanvas(
                canvas,
                {
                  x: Math.round(ocrItem.x * renderScale),
                  y: Math.round(ocrItem.y * renderScale),
                  width: Math.round(ocrItem.width * renderScale),
                  height: Math.round(ocrItem.height * renderScale),
                },
                { sampledColor: ocrItem.inpaintColor, pad: 4 }
              );
            }
            bgDataUrl = canvas.toDataURL('image/png');
          }

          onProgress?.(
            progressBase + 5,
            `OCR converted ${ocrItems.length} text objects on page ${pageNum}`
          );
        }
      } catch (ocrErr) {
        console.warn(`Automated OCR skipped/failed for page ${pageNum}:`, ocrErr);
      }
    }

    pages.push({
      pageNumber: pageNum,
      width: Math.round(standardViewport.width),
      height: Math.round(standardViewport.height),
      pdfWidth: standardViewport.width,
      pdfHeight: standardViewport.height,
      unscaledWidth: standardViewport.width,
      unscaledHeight: standardViewport.height,
      bgDataUrl,
      thumbnailUrl: thumbnailUrl || bgDataUrl,
      textItems,
      pageProxy: page,
      hasOcrProcessed,
      isScannedOrFlattened,
      ocrTextCount,
    });
  }

  onProgress?.(100, 'Document ready');

  return {
    fileName,
    fileSize,
    numPages,
    pages,
    originalBytes: arrayBuffer,
    pdfDocProxy: pdfDoc,
  };
}
