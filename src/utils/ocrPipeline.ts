import { createWorker, PSM } from 'tesseract.js';
import { ExtractedTextItem, PDFPageInfo } from '../types';
import { sampleSurroundingBackground, sampleForegroundTextColor } from './inpaintingEngine';

let cachedWorker: any = null;
let workerInitPromise: Promise<any> | null = null;

/**
 * Returns a cached, initialized Tesseract Worker.
 * Reuses the same worker instance across all pages for optimal performance.
 */
export async function getOcrWorker(onStatus?: (msg: string) => void): Promise<any> {
  if (cachedWorker) return cachedWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      onStatus?.('Initializing OCR engine (Tesseract.js)...');
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/tesseract-core-simd-lstm.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m) => {
          if (m.status && typeof m.progress === 'number' && onStatus) {
            const pct = Math.round(m.progress * 100);
            onStatus(`OCR: ${m.status} (${pct}%)`);
          }
        },
      });

      // Configure OCR parameters for document page reading
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
      });

      cachedWorker = worker;
      return worker;
    } catch (err) {
      console.warn('Fallback initializing basic tesseract worker:', err);
      try {
        const worker = await createWorker('eng');
        cachedWorker = worker;
        return worker;
      } catch (fallbackErr) {
        console.error('Failed to initialize OCR worker:', fallbackErr);
        throw fallbackErr;
      }
    } finally {
      workerInitPromise = null;
    }
  })();

  return workerInitPromise;
}

/**
 * Detects if a PDF page appears flattened, scanned, or image-based with no or minimal selectable text.
 */
export function isPageFlattenedOrImageBased(page: PDFPageInfo): boolean {
  if (!page.textItems || page.textItems.length === 0) return true;
  // If fewer than 4 text items exist, check total text length
  if (page.textItems.length < 4) {
    const totalChars = page.textItems.reduce((acc, item) => acc + (item.text?.trim()?.length || 0), 0);
    return totalChars < 25;
  }
  return false;
}

/**
 * Parses TSV output from Tesseract to extract line or word bounding boxes.
 */
function parseTsvToTextItems(
  tsv: string,
  scaleX: number,
  scaleY: number,
  pageNumber: number
): ExtractedTextItem[] {
  if (!tsv) return [];
  const lines = tsv.split('\n');
  const items: ExtractedTextItem[] = [];

  // TSV columns: level, page_num, block_num, par_num, line_num, word_num, left, top, width, height, conf, text
  // We aggregate words on the same line (matching line_num and par_num)
  interface LineGroup {
    left: number;
    top: number;
    right: number;
    bottom: number;
    words: string[];
    confs: number[];
  }

  const lineGroups = new Map<string, LineGroup>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cols = row.split('\t');
    if (cols.length < 12) continue;

    const level = parseInt(cols[0], 10);
    if (level !== 5) continue; // word level

    const blockNum = cols[2];
    const parNum = cols[3];
    const lineNum = cols[4];
    const left = parseInt(cols[6], 10);
    const top = parseInt(cols[7], 10);
    const width = parseInt(cols[8], 10);
    const height = parseInt(cols[9], 10);
    const conf = parseFloat(cols[10]);
    const text = cols.slice(11).join('\t').trim();

    if (!text || conf < 15) continue;

    const lineKey = `${blockNum}-${parNum}-${lineNum}`;
    const existing = lineGroups.get(lineKey);
    if (!existing) {
      lineGroups.set(lineKey, {
        left,
        top,
        right: left + width,
        bottom: top + height,
        words: [text],
        confs: [conf],
      });
    } else {
      existing.left = Math.min(existing.left, left);
      existing.top = Math.min(existing.top, top);
      existing.right = Math.max(existing.right, left + width);
      existing.bottom = Math.max(existing.bottom, top + height);
      existing.words.push(text);
      existing.confs.push(conf);
    }
  }

  let idx = 1;
  lineGroups.forEach((group) => {
    const fullText = group.words.join(' ').trim();
    if (!fullText) return;

    const pixelWidth = group.right - group.left;
    const pixelHeight = group.bottom - group.top;

    const unscaledX = group.left / scaleX;
    const unscaledY = group.top / scaleY;
    const unscaledWidth = pixelWidth / scaleX;
    const unscaledHeight = pixelHeight / scaleY;
    const unscaledFontSize = unscaledHeight * 0.82;
    const unscaledBaselineX = unscaledX;
    const unscaledBaselineY = unscaledY + unscaledFontSize * 0.87914;

    const avgConf = Math.round(
      group.confs.reduce((a, b) => a + b, 0) / Math.max(1, group.confs.length)
    );

    const isUppercaseHeading =
      fullText.length > 2 && fullText === fullText.toUpperCase() && /[A-Z]/.test(fullText);
    const isLarge = unscaledFontSize >= 18;

    items.push({
      id: `ocr-${pageNumber}-${idx++}`,
      text: fullText,
      x: unscaledX,
      y: unscaledY,
      baselineX: unscaledBaselineX,
      baselineY: unscaledBaselineY,
      width: unscaledWidth,
      height: unscaledHeight,
      fontSize: unscaledFontSize,
      unscaledX,
      unscaledY,
      unscaledBaselineX,
      unscaledBaselineY,
      unscaledWidth,
      unscaledHeight,
      unscaledFontSize,
      fontFamily: 'Helvetica, Arial, sans-serif',
      color: '#111827',
      fontWeight: isUppercaseHeading || isLarge ? 'bold' : 'normal',
      fontStyle: 'normal',
      pdfX: unscaledX,
      pdfY: unscaledY,
      pdfWidth: unscaledWidth,
      pdfHeight: unscaledHeight,
      isOcr: true,
      ocrConfidence: avgConf,
    });
  });

  return items;
}

/**
 * Runs OCR on a single page's raster background and converts all flattened or image text
 * into interactive, editable canvas text objects at their precise spatial coordinates.
 */
export async function runOcrOnPage(
  page: PDFPageInfo,
  onProgress?: (msg: string) => void
): Promise<ExtractedTextItem[]> {
  if (!page.bgDataUrl) {
    console.warn(`Cannot run OCR on page ${page.pageNumber}: missing bgDataUrl`);
    return [];
  }

  onProgress?.(`Starting OCR recognition on Page ${page.pageNumber}...`);

  // First, check if Cloud OCR endpoint (/api/ocr) is available and functioning
  try {
    const cloudResp = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: page.bgDataUrl,
        pageNumber: page.pageNumber,
        width: page.unscaledWidth || page.pdfWidth || page.width,
        height: page.unscaledHeight || page.pdfHeight || page.height,
      }),
    });

    if (cloudResp.ok) {
      const cloudData = await cloudResp.json();
      if (cloudData.success && Array.isArray(cloudData.items) && cloudData.items.length > 0) {
        onProgress?.(`Cloud OCR converted ${cloudData.items.length} text items on Page ${page.pageNumber}`);
        return cloudData.items;
      }
    }
  } catch (cloudErr) {
    // Graceful fallback to client-side Tesseract.js
    console.log('Cloud OCR endpoint bypassed/failed, executing Tesseract.js client OCR:', cloudErr);
  }

  // Client-Side Tesseract.js OCR Execution
  const worker = await getOcrWorker(onProgress);

  // Measure actual image pixel dimensions to calculate coordinate scale factor
  const img = new Image();
  img.src = page.bgDataUrl;
  await new Promise<void>((resolve) => {
    if (img.complete) resolve();
    else img.onload = () => resolve();
  });

  const imgWidth = img.naturalWidth || page.width * 2;
  const imgHeight = img.naturalHeight || page.height * 2;

  const unscaledW = page.unscaledWidth || page.pdfWidth || page.width || 612;
  const unscaledH = page.unscaledHeight || page.pdfHeight || page.height || 792;

  const scaleX = imgWidth / unscaledW;
  const scaleY = imgHeight / unscaledH;

  onProgress?.(`Analyzing text blocks and spatial coordinates on Page ${page.pageNumber}...`);

  const result = await worker.recognize(
    page.bgDataUrl,
    {},
    {
      blocks: true,
      tsv: true,
      text: true,
    }
  );

  let items: ExtractedTextItem[] = [];

  // Attempt extraction from structured blocks first
  if (result.data && result.data.blocks && result.data.blocks.length > 0) {
    let ocrIndex = 1;
    for (const block of result.data.blocks) {
      if (!block.paragraphs) continue;
      for (const par of block.paragraphs) {
        if (!par.lines) continue;
        for (const line of par.lines) {
          const rawText = line.text?.replace(/[\r\n]+/g, ' ')?.trim();
          if (!rawText || rawText.length === 0) continue;
          if (rawText.length <= 1 && line.confidence < 25) continue;

          const bbox = line.bbox;
          if (!bbox) continue;

          const unscaledX = bbox.x0 / scaleX;
          const unscaledY = bbox.y0 / scaleY;
          const unscaledWidth = (bbox.x1 - bbox.x0) / scaleX;
          const unscaledHeight = (bbox.y1 - bbox.y0) / scaleY;
          const unscaledFontSize = unscaledHeight * 0.82;
          const unscaledBaselineX = unscaledX;
          const unscaledBaselineY = line.baseline
            ? (line.baseline.y0 / scaleY)
            : unscaledY + unscaledFontSize * 0.87914;

          const isUppercaseHeading =
            rawText.length > 2 && rawText === rawText.toUpperCase() && /[A-Z]/.test(rawText);
          const isLarge = unscaledFontSize >= 18;

          // Sample surrounding background and foreground ink colors from the document image
          let sampledBgColor = '#ffffff';
          let sampledFillType: 'solid' | 'texture' = 'solid';
          let sampledInkColor = '#111827';

          try {
            const bgSample = sampleSurroundingBackground(img, {
              x: bbox.x0,
              y: bbox.y0,
              width: bbox.x1 - bbox.x0,
              height: bbox.y1 - bbox.y0,
            });
            sampledBgColor = bgSample.color;
            sampledFillType = bgSample.fillType;

            const fgSample = sampleForegroundTextColor(img, {
              x: bbox.x0,
              y: bbox.y0,
              width: bbox.x1 - bbox.x0,
              height: bbox.y1 - bbox.y0,
            });
            sampledInkColor = fgSample.color;
          } catch {
            // Safe fallback
          }

          items.push({
            id: `ocr-${page.pageNumber}-${ocrIndex++}`,
            text: rawText,
            x: unscaledX,
            y: unscaledY,
            baselineX: unscaledBaselineX,
            baselineY: unscaledBaselineY,
            width: unscaledWidth,
            height: unscaledHeight,
            fontSize: unscaledFontSize,
            unscaledX,
            unscaledY,
            unscaledBaselineX,
            unscaledBaselineY,
            unscaledWidth,
            unscaledHeight,
            unscaledFontSize,
            fontFamily: 'Helvetica, Arial, sans-serif',
            color: sampledInkColor,
            inpaintColor: sampledBgColor,
            inpaintFillType: sampledFillType,
            letterSpacing: 0.25,
            fontWeight: isUppercaseHeading || isLarge ? 'bold' : 'normal',
            fontStyle: 'normal',
            pdfX: unscaledX,
            pdfY: unscaledY,
            pdfWidth: unscaledWidth,
            pdfHeight: unscaledHeight,
            isOcr: true,
            ocrConfidence: Math.round(line.confidence || 85),
          });
        }
      }
    }
  }

  // Fallback to TSV parsing if blocks were empty
  if (items.length === 0 && result.data.tsv) {
    items = parseTsvToTextItems(result.data.tsv, scaleX, scaleY, page.pageNumber);
  }

  // Also enrich any Cloud OCR or TSV items that lack inpaintColor
  for (const it of items) {
    if (!it.inpaintColor) {
      try {
        const bgSample = sampleSurroundingBackground(img, {
          x: Math.round((it.unscaledX || it.x) * scaleX),
          y: Math.round((it.unscaledY || it.y) * scaleY),
          width: Math.round((it.unscaledWidth || it.width) * scaleX),
          height: Math.round((it.unscaledHeight || it.height) * scaleY),
        });
        it.inpaintColor = bgSample.color;
        it.inpaintFillType = bgSample.fillType;
      } catch {
        it.inpaintColor = '#ffffff';
        it.inpaintFillType = 'solid';
      }
    }
  }

  onProgress?.(`OCR complete: Converted ${items.length} text elements on Page ${page.pageNumber}`);
  return items;
}

/**
 * Runs OCR pipeline across an array of pages.
 * If forceAll is false, only processes flattened or image-based pages.
 */
export async function runOcrPipelineOnDocument(
  pages: PDFPageInfo[],
  options?: {
    forceAll?: boolean;
    onProgress?: (percent: number, message: string) => void;
  }
): Promise<{
  updatedPages: PDFPageInfo[];
  totalOcrItems: number;
  processedPageNumbers: number[];
}> {
  const forceAll = options?.forceAll ?? false;
  const updatedPages: PDFPageInfo[] = [];
  let totalOcrItems = 0;
  const processedPageNumbers: number[] = [];

  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const shouldProcess = forceAll || isPageFlattenedOrImageBased(page);

    if (shouldProcess) {
      options?.onProgress?.(
        Math.round(((i + 0.2) / total) * 100),
        `Running automated OCR on Page ${page.pageNumber} of ${total}...`
      );

      try {
        const ocrItems = await runOcrOnPage(page, (status) => {
          options?.onProgress?.(Math.round(((i + 0.6) / total) * 100), status);
        });

        totalOcrItems += ocrItems.length;
        processedPageNumbers.push(page.pageNumber);

        // Merge or replace: if page had 0 items, use ocrItems; otherwise merge
        const newTextItems =
          page.textItems && page.textItems.length > 0
            ? [...page.textItems, ...ocrItems]
            : ocrItems;

        updatedPages.push({
          ...page,
          textItems: newTextItems,
          hasOcrProcessed: true,
          isScannedOrFlattened: true,
          ocrTextCount: ocrItems.length,
        });
      } catch (err) {
        console.error(`OCR failed on page ${page.pageNumber}:`, err);
        updatedPages.push(page);
      }
    } else {
      updatedPages.push(page);
    }
  }

  options?.onProgress?.(100, `OCR pipeline complete: ${totalOcrItems} text objects created`);

  return {
    updatedPages,
    totalOcrItems,
    processedPageNumbers,
  };
}
