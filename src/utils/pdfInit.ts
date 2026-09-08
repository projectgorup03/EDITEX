import * as pdfjsLib from 'pdfjs-dist';

/**
 * Mandatory Override of PDF Parsing Pipeline
 * Disallows default pdfjs-dist initialization and enforces legacy WebKit worker configurations.
 */

let isConfigured = false;

/**
 * Executes legacy WebKit worker configuration.
 * Resolves explicit absolute worker path, guards worker communication, and disables
 * unsupported dynamic module workers in legacy WebKit engines.
 */
export function configureLegacyWebKitPdfWorker(): void {
  if (typeof window === 'undefined') return;

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWebKit = /AppleWebKit/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

  console.info(
    `[PDF Pipeline Override] Enforcing legacy WebKit worker configuration (WebKit: ${isWebKit}, Safari: ${isSafari}).`
  );

  // Determine origin safely
  const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;

  // Use explicit local worker asset
  const workerPath = '/pdf.worker.min.mjs';
  const resolvedWorkerUrl = new URL(workerPath, origin).toString();

  // Override default GlobalWorkerOptions
  pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedWorkerUrl;

  // In legacy WebKit, custom worker ports or direct MessagePort bindings can fault.
  // Reset workerPort to enforce standard worker execution.
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerPort = null;
  } catch {
    // Non-fatal
  }

  // Set global execution tracking flags
  (window as any).__PDFJS_PIPELINE_OVERRIDDEN__ = true;
  (window as any).__PDFJS_LEGACY_WEBKIT_WORKER_INITIALIZED__ = true;

  isConfigured = true;
}

/**
 * Returns tailored getDocument parameters configured for legacy WebKit:
 * - data: strictly provided Uint8Array
 * - disableRange: true (avoids WebKit byte-range bugs with buffers)
 * - disableStream: true (avoids WebKit stream pipeline failures)
 * - disableAutoFetch: true (forces complete in-memory load)
 * - isEvalSupported: false (prevents CSP / WebKit worker eval failures)
 */
export function getLegacyWebKitDocumentOptions(uint8Array: Uint8Array): any {
  if (!isConfigured) {
    configureLegacyWebKitPdfWorker();
  }

  return {
    data: uint8Array,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    isEvalSupported: false,
    useSystemFonts: true,
    enableXfa: false,
  };
}

// Execute legacy worker configuration immediately upon import
configureLegacyWebKitPdfWorker();
