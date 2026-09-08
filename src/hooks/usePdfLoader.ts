import { useState, useCallback } from 'react';
import '../polyfills';
import * as pdfjsLib from 'pdfjs-dist';
import '../utils/pdfWorkerSetup';
import { parsePDFDocument, safeExtractArrayBuffer } from '../utils/pdfParser';
import { PDFDocumentData } from '../types';

/**
 * Mobile-safe PDF loader hook for WebKit / Safari and modern desktop browsers.
 * Normalizes file buffer extraction using standard ArrayBuffer methods safe for mobile Safari:
 *   const arrayBuffer = await new Response(file).arrayBuffer();
 * and handles PDF.js document loading with comprehensive error handling.
 */
export function usePdfLoader() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Normalized mobile file loader
   */
  const handleFile = useCallback(
    async (file: File): Promise<PDFDocumentData | null> => {
      try {
        setIsProcessing(true);
        setErrorMessage(null);
        setProgressPercent(10);
        setProgressMessage('Reading document...');

        // Standard ArrayBuffer transformation safe for mobile Safari
        const arrayBuffer = await safeExtractArrayBuffer(file);

        setProgressPercent(20);
        setProgressMessage('Parsing PDF content...');

        // Parse document with worker fallback
        const result = await parsePDFDocument(arrayBuffer, (percent, msg) => {
          setProgressPercent(percent);
          setProgressMessage(msg);
        });

        result.fileName = file.name;
        setIsProcessing(false);
        return result;
      } catch (error: any) {
        console.error('PDF load error:', error);
        setErrorMessage(error?.message || 'Failed to load PDF document.');
        setIsProcessing(false);
        return null;
      }
    },
    []
  );

  return {
    isProcessing,
    progressPercent,
    progressMessage,
    errorMessage,
    setIsProcessing,
    setProgressPercent,
    setProgressMessage,
    setErrorMessage,
    handleFile,
  };
}

export default usePdfLoader;
