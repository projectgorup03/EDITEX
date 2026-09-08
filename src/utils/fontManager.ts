import * as fabric from 'fabric';
import { AIFontMatch, ExtractedTextItem, PDFPageInfo } from '../types';

// Track loaded font families to avoid duplicate <link> elements
const loadedFontsSet = new Set<string>();

/**
 * Dynamically loads a Google Font into the DOM and waits for document.fonts.load
 */
export async function loadGoogleFont(fontFamilyName: string): Promise<boolean> {
  if (!fontFamilyName || typeof document === 'undefined') return false;

  // Clean family name (strip quotes, fallbacks)
  const cleanName = fontFamilyName.split(',')[0].replace(/['"]/g, '').trim();

  // Skip system standard fonts
  const systemFonts = ['helvetica', 'arial', 'times new roman', 'times', 'courier', 'courier new', 'georgia', 'sans-serif', 'serif', 'monospace'];
  if (systemFonts.includes(cleanName.toLowerCase())) {
    return true;
  }

  if (loadedFontsSet.has(cleanName)) {
    return true;
  }

  try {
    const formattedQuery = cleanName.replace(/\s+/g, '+');
    const linkId = `google-font-${formattedQuery.toLowerCase()}`;

    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      // Load standard regular, bold, italic variants
      link.href = `https://fonts.googleapis.com/css2?family=${formattedQuery}:ital,wght@0,400;0,600;0,700;1,400;1,700&display=swap`;
      document.head.appendChild(link);
    }

    // Wait for the font to be ready in the document
    if ('fonts' in document) {
      await Promise.race([
        document.fonts.load(`16px "${cleanName}"`),
        new Promise((resolve) => setTimeout(resolve, 1500)), // timeout fallback
      ]);
    }

    loadedFontsSet.add(cleanName);
    return true;
  } catch (err) {
    console.warn(`Could not load font ${cleanName}:`, err);
    return false;
  }
}

export interface FontSignature {
  rawFontName: string;
  sampleTexts: string[];
  fontSize: number;
  detectedWeight: string;
  detectedStyle: string;
  pageNumber: number;
  count: number;
}

/**
 * Groups extracted text items across all pages into distinct font signatures
 */
export function extractFontSignatures(pages: PDFPageInfo[]): FontSignature[] {
  const map = new Map<string, FontSignature>();

  for (const page of pages) {
    for (const item of page.textItems) {
      const key = item.rawFontName || item.fontFamily || 'default_font';
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          rawFontName: key,
          sampleTexts: item.text ? [item.text.slice(0, 80)] : [],
          fontSize: item.fontSize,
          detectedWeight: item.fontWeight || 'normal',
          detectedStyle: item.fontStyle || 'normal',
          pageNumber: page.pageNumber,
          count: 1,
        });
      } else {
        existing.count += 1;
        if (existing.sampleTexts.length < 4 && item.text && !existing.sampleTexts.includes(item.text)) {
          existing.sampleTexts.push(item.text.slice(0, 80));
        }
        if (item.fontSize > existing.fontSize) {
          existing.fontSize = item.fontSize; // keep larger heading sample if available
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Calls backend Gemini AI endpoint to identify and match typefaces
 */
export async function identifyAndMatchFonts(
  pages: PDFPageInfo[],
  documentContext: string = 'PDF Document'
): Promise<AIFontMatch[]> {
  const signatures = extractFontSignatures(pages);
  if (!signatures.length) return [];

  try {
    const res = await fetch('/api/ai/match-fonts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fontSignatures: signatures,
        documentContext,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI Font Match error HTTP ${res.status}`);
    }

    const data = await res.json();
    const matches: AIFontMatch[] = data.matches || [];

    // Preload all matched Google fonts into the browser in parallel
    await Promise.allSettled(matches.map((m) => loadGoogleFont(m.matchedFont)));

    return matches;
  } catch (err) {
    console.error('Failed to query AI font matching API:', err);
    return [];
  }
}

/**
 * Applies matched fonts to a Fabric Canvas textboxes
 */
export function applyFontMatchesToCanvas(
  canvas: fabric.Canvas,
  matches: AIFontMatch[]
): number {
  if (!canvas || !matches.length) return 0;
  if ((canvas as any).disposed || (canvas as any).destroyed || !(canvas as any).elements?.lower?.el) return 0;

  const matchMap = new Map<string, AIFontMatch>();
  for (const m of matches) {
    matchMap.set(m.rawFontName.toLowerCase(), m);
  }

  let updatedCount = 0;
  const objects = canvas.getObjects();

  for (const obj of objects) {
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      const textObj = obj as fabric.Textbox;
      const rawFont = ((textObj as any).rawFontName || textObj.fontFamily || '').toLowerCase();
      
      // Find match by exact raw name or partial containment
      let match = matchMap.get(rawFont);
      if (!match) {
        for (const [key, val] of matchMap.entries()) {
          if (rawFont.includes(key) || key.includes(rawFont)) {
            match = val;
            break;
          }
        }
      }

      if (match) {
        textObj.set({
          fontFamily: match.cssFontFamily,
        });
        (textObj as any).aiMatchedFont = match.matchedFont;
        (textObj as any).aiConfidence = match.confidence;
        (textObj as any).aiMatchReason = match.matchReason;
        (textObj as any).substitutes = match.substitutes;
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    canvas.requestRenderAll();
  }

  return updatedCount;
}

/**
 * Rich predefined typography choices for manual selection & substitutions
 */
export const CURATED_FONT_OPTIONS = [
  // Serif
  { label: 'Playfair Display (Editorial Serif)', value: "'Playfair Display', Georgia, serif", category: 'serif' },
  { label: 'Merriweather (Readable Serif)', value: "'Merriweather', Georgia, serif", category: 'serif' },
  { label: 'Lora (Calligraphic Serif)', value: "'Lora', serif", category: 'serif' },
  { label: 'Cinzel (Classical Roman Serif)', value: "'Cinzel', serif", category: 'serif' },
  { label: 'Times New Roman (Standard Serif)', value: "'Times New Roman', Times, serif", category: 'serif' },
  { label: 'Georgia (Transitional Serif)', value: "Georgia, serif", category: 'serif' },
  { label: 'EB Garamond (Old-Style Serif)', value: "'EB Garamond', Garamond, serif", category: 'serif' },
  // Sans-serif
  { label: 'Inter (Modern UI Sans)', value: "'Inter', sans-serif", category: 'sans-serif' },
  { label: 'Roboto (Neo-Grotesque Sans)', value: "'Roboto', sans-serif", category: 'sans-serif' },
  { label: 'Montserrat (Geometric Sans)', value: "'Montserrat', sans-serif", category: 'sans-serif' },
  { label: 'Open Sans (Humanist Sans)', value: "'Open Sans', sans-serif", category: 'sans-serif' },
  { label: 'Poppins (Geometric Rounded)', value: "'Poppins', sans-serif", category: 'sans-serif' },
  { label: 'Helvetica / Arial (Standard Sans)', value: "Helvetica, Arial, sans-serif", category: 'sans-serif' },
  { label: 'Plus Jakarta Sans (Crisp Sans)', value: "'Plus Jakarta Sans', sans-serif", category: 'sans-serif' },
  // Monospace
  { label: 'Courier Prime (Typewriter Mono)', value: "'Courier Prime', 'Courier New', monospace", category: 'monospace' },
  { label: 'Fira Code (Modern Monospace)', value: "'Fira Code', monospace", category: 'monospace' },
  { label: 'Courier New (Standard Mono)', value: "'Courier New', Courier, monospace", category: 'monospace' },
];
