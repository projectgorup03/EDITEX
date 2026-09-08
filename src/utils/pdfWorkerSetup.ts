// Polyfill Promise.withResolvers before configuring PDF.js
import '../polyfills';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Configure PDF.js worker with fallback support for mobile Safari and WebKit.
 * Avoids cross-origin CDN restriction issues while providing fallbacks.
 */
export function configurePdfWorker(): void {
  if (typeof window === 'undefined') return;

  try {
    const origin = window.location.origin;
    // Prefer local same-origin worker (equipped with Promise.withResolvers polyfill)
    if (origin && !origin.startsWith('null')) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
    } else {
      // Fallback for sandboxed or unique origins
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
  } catch (err) {
    console.warn('Could not set local workerSrc, falling back to CDN:', err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

// Immediately configure worker
configurePdfWorker();

export { pdfjsLib };
