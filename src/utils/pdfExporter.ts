import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as fabric from 'fabric';
import { PDFPageInfo } from '../types';

interface ExportOptions {
  fileName?: string;
  originalBytes?: ArrayBuffer;
  pages: PDFPageInfo[];
  canvasesMap?: Map<number, fabric.Canvas>;
  exportMode?: 'hybrid' | 'flatten'; // hybrid uses vector + raster overlays; flatten embeds high-res canvas render
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex || hex === 'transparent') return { r: 1, g: 1, b: 1 };
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Downloads a Blob as a file in the browser
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Exports the edited PDF document using pdf-lib.
 */
export async function exportEditedPDF({
  fileName = 'document-edited.pdf',
  originalBytes,
  pages,
  canvasesMap,
  exportMode = 'hybrid',
}: ExportOptions): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  if (originalBytes && originalBytes.byteLength > 0) {
    try {
      pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    } catch {
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  // Embed standard PDF fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  const getPdfFont = (fontFamily?: string, fontWeight?: string | number): PDFFont => {
    const isBold = fontWeight === 'bold' || fontWeight === 700 || fontWeight === '700';
    if (/times|roman|playfair|merriweather|lora|serif|cinzel|garamond|georgia/i.test(fontFamily || '')) return fontTimes;
    if (/courier|mono|fira|code/i.test(fontFamily || '')) return fontCourier;
    return isBold ? fontHelveticaBold : fontHelvetica;
  };

  // Process each page
  for (let idx = 0; idx < pages.length; idx++) {
    const pageInfo = pages[idx];
    let pdfPage: PDFPage;

    if (idx < pdfDoc.getPageCount()) {
      pdfPage = pdfDoc.getPage(idx);
    } else {
      pdfPage = pdfDoc.addPage([pageInfo.pdfWidth, pageInfo.pdfHeight]);
    }

    const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
    const canvas = canvasesMap?.get(pageInfo.pageNumber);

    if (canvas) {
      const objects = canvas.getObjects();

      if (exportMode === 'flatten') {
        // High-DPI raster flatten export
        const dataUrl = canvas.toDataURL({
          format: 'png',
          multiplier: 2,
        });
        const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
        const embeddedImg = await pdfDoc.embedPng(pngBytes);
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pdfWidth,
          height: pdfHeight,
        });
      } else {
        // Hybrid Vector Export: draw shapes, white masks, text, and images directly onto PDF page stream
        const scaleX = pdfWidth / canvas.getWidth();
        const scaleY = pdfHeight / canvas.getHeight();

        for (const obj of objects) {
          // Skip internal background image if canvas had one
          if ((obj as any).isPdfBackground) continue;

          const objType = obj.type;
          const left = (obj.left || 0) * scaleX;
          const top = (obj.top || 0) * scaleY;
          const width = (obj.getScaledWidth ? obj.getScaledWidth() : obj.width || 0) * scaleX;
          const height = (obj.getScaledHeight ? obj.getScaledHeight() : obj.height || 0) * scaleY;
          // PDF coordinate space: bottom-left is (0,0)
          const pdfY = pdfHeight - top - height;

          if (objType === 'textbox' || objType === 'i-text' || objType === 'text') {
            const textObj = obj as fabric.Textbox;
            const textStr = textObj.text || '';
            const fontSize = ((textObj.fontSize || 12) * scaleY);
            const chosenFont = getPdfFont(textObj.fontFamily, textObj.fontWeight);
            const fillRgb = hexToRgb(typeof textObj.fill === 'string' ? textObj.fill : '#111827');

            // 1. Draw background mask if object has an opaque background (e.g. OCR inpainting)
            if (textObj.backgroundColor && textObj.backgroundColor !== 'transparent') {
              const bgRgb = hexToRgb(textObj.backgroundColor);
              pdfPage.drawRectangle({
                x: left - 1,
                y: pdfHeight - top - height - 1,
                width: width + 2,
                height: height + 2,
                color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
                opacity: textObj.opacity !== undefined ? textObj.opacity : 1,
              });
            }

            // 2. Exact baseline coordinates:
            // In Fabric Text with padding 0, strokeWidth 0:
            // Canvas baseline Y = top + (fontSize / scaleY) * 1.13 * (1 - 0.222)
            // Converting to PDF user units (measured from bottom):
            const baselineOffsetCanvas = (textObj.fontSize || 12) * 1.13 * (1 - 0.222);
            const firstLinePdfBaselineY = pdfHeight - ((obj.top || 0) + baselineOffsetCanvas) * scaleY;
            const lineHeight = fontSize * (textObj.lineHeight || 1.0);

            const lines = textStr.split('\n');
            lines.forEach((lineText, lineIdx) => {
              if (!lineText) return;
              const textY = firstLinePdfBaselineY - (lineIdx * lineHeight);
              let textX = left;
              if (textObj.textAlign === 'right') {
                const textWidth = chosenFont.widthOfTextAtSize(lineText, Math.max(4, fontSize));
                textX = Math.max(left, left + width - textWidth);
              } else if (textObj.textAlign === 'center') {
                const textWidth = chosenFont.widthOfTextAtSize(lineText, Math.max(4, fontSize));
                textX = left + Math.max(0, (width - textWidth) / 2);
              }
              try {
                pdfPage.drawText(lineText, {
                  x: textX,
                  y: Math.max(0, textY),
                  size: Math.max(4, fontSize),
                  font: chosenFont,
                  color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                });
              } catch {
                // If special characters fail standard font encoding, fallback to safe ascii
                const sanitized = lineText.replace(/[^\x00-\x7F]/g, '');
                if (sanitized) {
                  pdfPage.drawText(sanitized, {
                    x: textX,
                    y: Math.max(0, textY),
                    size: Math.max(4, fontSize),
                    font: chosenFont,
                    color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                  });
                }
              }
            });
          } else if (objType === 'rect') {
            const rectObj = obj as fabric.Rect;
            const fillRgb = hexToRgb(typeof rectObj.fill === 'string' ? rectObj.fill : '#ffffff');
            const strokeRgb = hexToRgb(typeof rectObj.stroke === 'string' ? rectObj.stroke : '#000000');
            const isFilled = rectObj.fill && rectObj.fill !== 'transparent';
            const isStroked = rectObj.stroke && rectObj.stroke !== 'transparent' && (rectObj.strokeWidth || 0) > 0;

            pdfPage.drawRectangle({
              x: left,
              y: pdfY,
              width,
              height,
              color: isFilled ? rgb(fillRgb.r, fillRgb.g, fillRgb.b) : undefined,
              borderColor: isStroked ? rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b) : undefined,
              borderWidth: (rectObj.strokeWidth || 0) * scaleX,
              opacity: rectObj.opacity ?? 1,
            });
          } else if (objType === 'circle') {
            const circleObj = obj as fabric.Circle;
            const fillRgb = hexToRgb(typeof circleObj.fill === 'string' ? circleObj.fill : '#ffffff');
            const strokeRgb = hexToRgb(typeof circleObj.stroke === 'string' ? circleObj.stroke : '#000000');
            const isFilled = circleObj.fill && circleObj.fill !== 'transparent';
            const isStroked = circleObj.stroke && circleObj.stroke !== 'transparent' && (circleObj.strokeWidth || 0) > 0;

            pdfPage.drawEllipse({
              x: left + width / 2,
              y: pdfY + height / 2,
              xScale: width / 2,
              yScale: height / 2,
              color: isFilled ? rgb(fillRgb.r, fillRgb.g, fillRgb.b) : undefined,
              borderColor: isStroked ? rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b) : undefined,
              borderWidth: (circleObj.strokeWidth || 0) * scaleX,
              opacity: circleObj.opacity ?? 1,
            });
          } else {
            // For complex paths, pen drawings, signatures, or images:
            // Render object to PNG data URL and embed cleanly
            try {
              const objDataUrl = obj.toDataURL({
                format: 'png',
                multiplier: 2,
              });
              const imgBytes = await fetch(objDataUrl).then((r) => r.arrayBuffer());
              const embedded = await pdfDoc.embedPng(imgBytes);
              pdfPage.drawImage(embedded, {
                x: left,
                y: pdfY,
                width,
                height,
                opacity: obj.opacity ?? 1,
              });
            } catch (err) {
              console.warn('Could not embed custom object:', err);
            }
          }
        }
      }
    }
  }

  const outputBytes = await pdfDoc.save();
  return outputBytes;
}
