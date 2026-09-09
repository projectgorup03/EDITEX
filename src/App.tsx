import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ActiveObjectProperties,
  AIFontMatch,
  PDFDocumentData,
  PDFPageInfo,
  ToolMode,
} from './types';
import { parsePDFDocument } from './utils/pdfParser';
import { readFileAsUint8Array } from './utils/fileReaderHelper';
import { createSamplePDF, createFlattenedSamplePDF } from './utils/samplePdf';
import { exportEditedPDF, triggerFileDownload } from './utils/pdfExporter';
import {
  addTextbox,
  addRectangle,
  addCircle,
  addImage,
  deleteActiveObject,
  duplicateActiveObject,
  bringObjectForward,
  sendObjectBackward,
  bringObjectToFront,
  sendObjectToBack,
} from './utils/fabricHelpers';
import { identifyAndMatchFonts, applyFontMatchesToCanvas, loadGoogleFont } from './utils/fontManager';
import { isCanvasAlive, populateNormalizedTextItems, syncFabricCanvasToPage } from './utils/pdfCanvasManager';
import { inpaintRegionOnCanvas, extractContourStrokes } from './utils/inpaintingEngine';
import { runOcrOnPage } from './utils/ocrPipeline';
import { calculateFitToPageZoom, calculateFitToWidthZoom } from './utils/zoomHelpers';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { FooterBar } from './components/FooterBar';
import { CanvasEditor } from './components/CanvasEditor';
import { UploadDropzone } from './components/UploadDropzone';
import { SignatureModal } from './components/SignatureModal';
import { AIFontModal } from './components/AIFontModal';
import { RealtimeSyncModal } from './components/RealtimeSyncModal';
import { MobileTouchControls } from './components/MobileTouchControls';
import { realtimeSync, ConnectionStatus } from './utils/realtimeSync';
import { ClientPlatform, SyncPeer } from './types';
import { Layers, Sliders, X, Sparkles, Check, ScanText } from 'lucide-react';

export default function App() {
  // Document State
  const [pdfData, setPdfData] = useState<PDFDocumentData | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [scrollToPageNumber, setScrollToPageNumber] = useState<number | null>(null);

  // Cross-Platform Cloud Realtime Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<ConnectionStatus>('disconnected');
  const [syncPeers, setSyncPeers] = useState<SyncPeer[]>([]);
  const [myPlatform, setMyPlatform] = useState<ClientPlatform>(realtimeSync.getPlatform());
  const [syncRoomId, setSyncRoomId] = useState<string>(realtimeSync.getRoomId());

  // Active Selected Object
  const [activeObjectProps, setActiveObjectProps] = useState<ActiveObjectProperties | null>(null);

  // Document upload / load timestamp trigger for auto Fit to Page
  const [documentLoadId, setDocumentLoadId] = useState<number>(0);

  // History Stack Triggers
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [undoTrigger, setUndoTrigger] = useState<number>(0);
  const [redoTrigger, setRedoTrigger] = useState<number>(0);

  // Loading & Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Automated OCR Pipeline State
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);

  // AI Font Matching State
  const [aiFontMatches, setAiFontMatches] = useState<AIFontMatch[]>([]);
  const [isAiMatchingFonts, setIsAiMatchingFonts] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [fontToast, setFontToast] = useState<string | null>(null);

  // UI Modals & Responsive Drawer
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'left' | 'right'>('none');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isInpaintingLoading, setIsInpaintingLoading] = useState<boolean>(false);
  const [isReconstructingAI, setIsReconstructingAI] = useState<boolean>(false);

  // Keep references to active Fabric canvases per page
  const canvasesMapRef = useRef<Map<number, fabric.Canvas>>(new Map());
  const activeCanvasRef = useRef<fabric.Canvas | null>(null);

  // Dark Mode Sync with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Connect Real-time Sync on Mount
  useEffect(() => {
    realtimeSync.connect();

    const unsubStatus = realtimeSync.onStatusChange((status) => {
      setSyncStatus(status);
    });

    const unsubPeers = realtimeSync.onPeersChange((peers) => {
      setSyncPeers(peers);
    });

    return () => {
      unsubStatus();
      unsubPeers();
    };
  }, []);

  const handleRoomChange = (newRoomId: string) => {
    setSyncRoomId(newRoomId);
    realtimeSync.disconnect();
    realtimeSync.connect(newRoomId, pdfData?.fileName || 'Document.pdf');
  };

  const handlePlatformChange = (newPlatform: ClientPlatform) => {
    setMyPlatform(newPlatform);
    realtimeSync.setSimulatedPlatform(newPlatform);
  };

  // Handle PDF File Parsing
  const processPdfBuffer = async (
    buffer: ArrayBuffer | File | Uint8Array | Blob,
    defaultName: string = 'document.pdf'
  ) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setProgressMessage('Opening PDF file...');

      const result = await parsePDFDocument(buffer, (percent, msg) => {
        setProgressPercent(percent);
        setProgressMessage(msg);
      });

      if (buffer instanceof File) {
        result.fileName = buffer.name;
      } else {
        result.fileName = defaultName;
      }

      canvasesMapRef.current.clear();
      setPdfData(result);
      setActivePageIndex(0);
      setActiveTool('select');

      // Auto fit zoom to 'Fit to Page' immediately so the user can see the entire page and all content
      if (result.pages.length > 0) {
        const firstPage = result.pages[0];
        const container = typeof document !== 'undefined' ? document.getElementById('canvas-viewport-container') : null;
        const initialZoom = calculateFitToPageZoom(firstPage.width, firstPage.height, container);
        setZoom(initialZoom);
      }
      setDocumentLoadId(Date.now());

      // Automatically run AI Font Identification & Typeface Matching
      runAIFontMatching(result.pages, result.fileName);

      // Check if OCR converted flattened pages
      const ocrPages = result.pages.filter((p) => p.hasOcrProcessed);
      const totalOcrCount = result.pages.reduce((acc, p) => acc + (p.ocrTextCount || 0), 0);
      if (ocrPages.length > 0 && totalOcrCount > 0) {
        setFontToast(
          `Automated OCR: Converted ${totalOcrCount} flattened text blocks across ${ocrPages.length} scanned page(s) into editable canvas text.`
        );
        setTimeout(() => setFontToast(null), 8000);
      }
    } catch (err: any) {
      console.error('PDF parsing failure:', err);
      setErrorMessage(
        err?.message || 'Failed to parse PDF document. Ensure file is not encrypted or corrupted.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Automated OCR Trigger on Current Page
  const handleRunOcrOnActivePage = async () => {
    if (!pdfData || isOcrRunning) return;
    const currentPage = pdfData.pages[activePageIndex];
    if (!currentPage) return;

    try {
      setIsOcrRunning(true);
      setFontToast(`Running automated OCR on Page ${currentPage.pageNumber}...`);

      const ocrItems = await runOcrOnPage(currentPage, (msg) => {
        setFontToast(`OCR Page ${currentPage.pageNumber}: ${msg}`);
      });

      if (ocrItems && ocrItems.length > 0) {
        const canvas = canvasesMapRef.current.get(currentPage.pageNumber);
        if (canvas && isCanvasAlive(canvas)) {
          // Erase/inpaint the underlying raster text on the background image
          // so no duplicate text exists underneath the new editable text items
          try {
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              bgImg.onload = resolve;
              bgImg.onerror = reject;
              bgImg.src = currentPage.bgDataUrl;
            });
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = bgImg.naturalWidth;
            tempCanvas.height = bgImg.naturalHeight;
            const tctx = tempCanvas.getContext('2d');
            if (tctx) {
              tctx.drawImage(bgImg, 0, 0);
              const scaleRatio = bgImg.naturalWidth / (currentPage.unscaledWidth || currentPage.width || 612);
              for (const ocrItem of ocrItems) {
                inpaintRegionOnCanvas(
                  tempCanvas,
                  {
                    x: Math.round(ocrItem.x * scaleRatio),
                    y: Math.round(ocrItem.y * scaleRatio),
                    width: Math.round(ocrItem.width * scaleRatio),
                    height: Math.round(ocrItem.height * scaleRatio),
                  },
                  { sampledColor: ocrItem.inpaintColor, pad: 4 }
                );
              }
              const cleanBgUrl = tempCanvas.toDataURL('image/png');
              currentPage.bgDataUrl = cleanBgUrl;
              await syncFabricCanvasToPage(canvas, canvas.getWidth(), canvas.getHeight(), cleanBgUrl);
            }
          } catch (inpaintErr) {
            console.warn('OCR background inpainting fallback:', inpaintErr);
          }

          const canvasScale = canvas.getWidth() / (currentPage.unscaledWidth || currentPage.pdfWidth || 612);
          populateNormalizedTextItems(canvas, ocrItems, canvasScale);
        }
        currentPage.hasOcrProcessed = true;
        currentPage.ocrTextCount = (currentPage.ocrTextCount || 0) + ocrItems.length;
        currentPage.textItems = [...currentPage.textItems, ...ocrItems];
        setPdfData({ ...pdfData });
        setFontToast(
          `OCR Complete: Converted and in-place replaced ${ocrItems.length} text objects on Page ${currentPage.pageNumber}!`
        );
      } else {
        setFontToast(`OCR Pipeline: No text blocks detected on Page ${currentPage.pageNumber}.`);
      }
    } catch (err: any) {
      console.error('OCR pipeline error:', err);
      setFontToast(`OCR failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsOcrRunning(false);
      setTimeout(() => setFontToast(null), 7000);
    }
  };

  // AI Font Matching Workflow
  const runAIFontMatching = async (pages: PDFPageInfo[], fileName: string) => {
    try {
      setIsAiMatchingFonts(true);
      const matches = await identifyAndMatchFonts(pages, fileName);
      setAiFontMatches(matches);

      // Apply matches to all initialized canvases
      let updatedCount = 0;
      canvasesMapRef.current.forEach((canvas) => {
        if (isCanvasAlive(canvas)) {
          updatedCount += applyFontMatchesToCanvas(canvas, matches);
        }
      });

      if (matches.length > 0) {
        const fontNames = Array.from(new Set(matches.map((m) => m.matchedFont))).slice(0, 3).join(', ');
        setFontToast(`AI Identified & Matched: ${fontNames} across document`);
        setTimeout(() => setFontToast(null), 7000);
      }
    } catch (err) {
      console.warn('AI font matching error:', err);
    } finally {
      setIsAiMatchingFonts(false);
    }
  };

  // Upload Handlers - strictly parses files via FileReader Uint8Array buffers
  const handleFileSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      setProgressPercent(5);
      setProgressMessage('Reading file via FileReader Uint8Array buffer...');
      const uint8Array = await readFileAsUint8Array(file);
      await processPdfBuffer(uint8Array, file.name);
    } catch (err: any) {
      console.error('FileReader failure:', err);
      setErrorMessage(err?.message || 'Failed to read file via FileReader.');
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setProgressPercent(10);
      setProgressMessage('Generating sample business invoice & agreement...');
      const sampleBytes = await createSamplePDF();
      await processPdfBuffer(sampleBytes, 'Vertex_Invoice_Agreement.pdf');
    } catch (err: any) {
      console.error('Failed to create sample PDF:', err);
      setErrorMessage('Could not load sample document: ' + err?.message);
      setIsProcessing(false);
    }
  };

  const handleLoadFlattenedSample = async () => {
    try {
      setIsProcessing(true);
      setProgressPercent(10);
      setProgressMessage('Generating purely flattened scanned document (zero native text)...');
      const sampleBytes = await createFlattenedSamplePDF();
      await processPdfBuffer(sampleBytes, 'Scanned_Affidavit_OCR_Demo.pdf');
    } catch (err: any) {
      console.error('Failed to create scanned sample PDF:', err);
      setErrorMessage('Could not load scanned document: ' + err?.message);
      setIsProcessing(false);
    }
  };

  const handleNewDocument = () => {
    canvasesMapRef.current.clear();
    activeCanvasRef.current = null;
    setPdfData(null);
    setActivePageIndex(0);
    setActiveObjectProps(null);
    setAiFontMatches([]);
    setFontToast(null);
    setActiveTool('select');
    setErrorMessage(null);
    setIsProcessing(false);
  };

  // Canvas Ready Callback for continuous multi-page rendering
  const handleCanvasReady = useCallback((pageNumber: number, canvas: fabric.Canvas) => {
    canvasesMapRef.current.set(pageNumber, canvas);
    if (pageNumber === activePageIndex + 1 || !activeCanvasRef.current) {
      activeCanvasRef.current = canvas;
    }
  }, [activePageIndex]);

  // Page Navigation & Smooth Scroll Trigger
  const handlePageChange = (newPageNumber: number) => {
    if (!pdfData) return;
    const targetIdx = newPageNumber - 1;
    if (targetIdx < 0 || targetIdx >= pdfData.pages.length) return;

    setActivePageIndex(targetIdx);
    setScrollToPageNumber(newPageNumber);

    const targetCanvas = canvasesMapRef.current.get(newPageNumber);
    if (targetCanvas) {
      activeCanvasRef.current = targetCanvas;
    }

    // Reset scroll trigger after short tick
    setTimeout(() => setScrollToPageNumber(null), 300);
  };

  // Add Blank Page (at end)
  const handleAddBlankPage = () => {
    if (!pdfData) return;
    const newPageNum = pdfData.pages.length + 1;
    const newPage: PDFPageInfo = {
      pageNumber: newPageNum,
      width: 595,
      height: 842,
      pdfWidth: 595.28,
      pdfHeight: 841.89,
      bgDataUrl: '',
      textItems: [],
    };

    setPdfData({
      ...pdfData,
      numPages: pdfData.numPages + 1,
      pages: [...pdfData.pages, newPage],
    });
    handlePageChange(newPageNum);
  };

  // Add Blank Page After specific page
  const handleAddBlankPageAfter = (afterPageNumber: number) => {
    if (!pdfData) return;
    const targetIdx = afterPageNumber;
    const newPage: PDFPageInfo = {
      pageNumber: afterPageNumber + 1,
      width: 595,
      height: 842,
      pdfWidth: 595.28,
      pdfHeight: 841.89,
      bgDataUrl: '',
      textItems: [],
    };

    const newPages = [...pdfData.pages];
    newPages.splice(targetIdx, 0, newPage);
    const reindexed = newPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    setPdfData({
      ...pdfData,
      numPages: reindexed.length,
      pages: reindexed,
    });
    handlePageChange(afterPageNumber + 1);
  };

  // Duplicate Page
  const handleDuplicatePage = (pageNumber: number) => {
    if (!pdfData) return;
    const originalPage = pdfData.pages.find((p) => p.pageNumber === pageNumber);
    if (!originalPage) return;

    const sourceCanvas = canvasesMapRef.current.get(pageNumber);
    const canvasJson = sourceCanvas ? JSON.stringify(sourceCanvas.toJSON()) : originalPage.canvasJson;

    const duplicatedPage: PDFPageInfo = {
      ...originalPage,
      pageNumber: pageNumber + 1,
      canvasJson,
    };

    const newPages = [...pdfData.pages];
    newPages.splice(pageNumber, 0, duplicatedPage);
    const reindexed = newPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    setPdfData({
      ...pdfData,
      numPages: reindexed.length,
      pages: reindexed,
    });
    handlePageChange(pageNumber + 1);
  };

  // Delete Page
  const handleDeletePage = (pageNumber: number) => {
    if (!pdfData || pdfData.pages.length <= 1) return;

    const filtered = pdfData.pages
      .filter((p) => p.pageNumber !== pageNumber)
      .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    canvasesMapRef.current.delete(pageNumber);

    setPdfData({
      ...pdfData,
      numPages: filtered.length,
      pages: filtered,
    });

    const nextIndex = Math.min(activePageIndex, filtered.length - 1);
    setActivePageIndex(nextIndex);
  };

  // Insert Object Actions
  const handleAddText = (type: 'title' | 'body') => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    if (type === 'title') {
      addTextbox(canvas, 'Heading Title', {
        fontSize: 24,
        fontWeight: 'bold',
        width: 260,
      });
    } else {
      addTextbox(canvas, 'Enter paragraph or description text here...', {
        fontSize: 13,
        fontWeight: 'normal',
        width: 280,
      });
    }
  };

  const handleAddShape = (type: 'rect' | 'circle' | 'highlight') => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    if (type === 'rect') {
      addRectangle(canvas, false);
    } else if (type === 'circle') {
      addCircle(canvas);
    } else if (type === 'highlight') {
      addRectangle(canvas, true);
    }
  };

  const handleUploadImage = (file: File) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await addImage(canvas, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInsertSignature = (dataUrl: string) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    addImage(canvas, dataUrl);
  };

  // Active Object Formatting Updates
  const handleUpdateActiveObject = (updates: Partial<ActiveObjectProperties>) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || (active as any).isPdfBackground) return;

    const isText = active.type === 'textbox' || active.type === 'i-text' || active.type === 'text';

    if (updates.fontSize !== undefined && isText) {
      (active as fabric.Textbox).set('fontSize', updates.fontSize);
    }
    if (updates.fontFamily !== undefined && isText) {
      (active as fabric.Textbox).set('fontFamily', updates.fontFamily);
    }
    if (updates.fontWeight !== undefined && isText) {
      (active as fabric.Textbox).set('fontWeight', updates.fontWeight as any);
    }
    if (updates.fontStyle !== undefined && isText) {
      (active as fabric.Textbox).set('fontStyle', updates.fontStyle as any);
    }
    if (updates.underline !== undefined && isText) {
      (active as fabric.Textbox).set('underline', updates.underline);
    }
    if (updates.textAlign !== undefined && isText) {
      (active as fabric.Textbox).set('textAlign', updates.textAlign);
    }
    if (updates.fill !== undefined) {
      active.set('fill', updates.fill);
    }
    if (updates.stroke !== undefined) {
      active.set('stroke', updates.stroke);
    }
    if (updates.strokeWidth !== undefined) {
      active.set('strokeWidth', updates.strokeWidth);
    }
    if (updates.opacity !== undefined) {
      active.set('opacity', updates.opacity);
    }
    if (updates.inpaintColor !== undefined) {
      (active as any).inpaintColor = updates.inpaintColor;
      if (isText) {
        (active as fabric.Textbox).set('backgroundColor', updates.inpaintColor);
      }
    }
    if (updates.charSpacing !== undefined && isText) {
      (active as fabric.Textbox).set('charSpacing', updates.charSpacing);
    }
    if (updates.letterSpacing !== undefined && isText) {
      const charSpacing = Math.round(updates.letterSpacing * 50);
      (active as fabric.Textbox).set('charSpacing', charSpacing);
    }
    if (updates.lineHeight !== undefined && isText) {
      (active as fabric.Textbox).set('lineHeight', updates.lineHeight);
    }
    if (updates.isInpainted !== undefined) {
      (active as any).isInpainted = updates.isInpainted;
    }

    canvas.requestRenderAll();
    setActiveObjectProps((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Advanced Inpainting Pipeline: Clean underlying scanned/flattened raster text
  const handleInpaintBackground = async () => {
    const canvas = activeCanvasRef.current;
    if (!canvas || !pdfData) return;
    const active = canvas.getActiveObject();
    if (!active || (active as any).isPdfBackground) return;

    const page = pdfData.pages[activePageIndex];
    if (!page || !page.bgDataUrl) return;

    setIsInpaintingLoading(true);
    try {
      const img = new Image();
      img.src = page.bgDataUrl;
      await new Promise<void>((resolve, reject) => {
        if (img.complete) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = reject;
        }
      });

      const offscreen = document.createElement('canvas');
      const imgW = img.naturalWidth || page.width * 2;
      const imgH = img.naturalHeight || page.height * 2;
      offscreen.width = imgW;
      offscreen.height = imgH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      // Scale factor between active Fabric canvas display size and background bitmap resolution
      const scaleFactorX = imgW / canvas.getWidth();
      const scaleFactorY = imgH / canvas.getHeight();

      const bbox = {
        x: Math.round((active.left || 0) * scaleFactorX),
        y: Math.round((active.top || 0) * scaleFactorY),
        width: Math.round((active.getScaledWidth() || 50) * scaleFactorX),
        height: Math.round((active.getScaledHeight() || 20) * scaleFactorY),
      };

      const inpaintFillColor = (active as any).inpaintColor || activeObjectProps?.inpaintColor || '#ffffff';
      inpaintRegionOnCanvas(offscreen, bbox, {
        sampledColor: inpaintFillColor,
        addGrain: true,
        feather: 3,
        pad: 4,
      });

      const newBgDataUrl = offscreen.toDataURL('image/png');
      page.bgDataUrl = newBgDataUrl;

      // Update docData state
      setPdfData((prev) => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[activePageIndex] = { ...page, bgDataUrl: newBgDataUrl };
        return { ...prev, pages: newPages };
      });

      // Update fabric background
      await syncFabricCanvasToPage(canvas, canvas.getWidth(), canvas.getHeight(), newBgDataUrl);

      // Mark object as inpaint-applied
      (active as any).isInpainted = true;
      setActiveObjectProps((prev) => (prev ? { ...prev, isInpainted: true } : null));

      canvas.fire('object:modified');
      canvas.requestRenderAll();
    } catch (err) {
      console.error('Inpainting error:', err);
    } finally {
      setIsInpaintingLoading(false);
    }
  };

  // Stroke & Contour Extraction: Separates signatures, stamps, and seals with transparent background
  const handleExtractStrokeContour = async () => {
    const canvas = activeCanvasRef.current;
    if (!canvas || !pdfData) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const page = pdfData.pages[activePageIndex];
    if (!page || !page.bgDataUrl) return;

    try {
      const img = new Image();
      img.src = page.bgDataUrl;
      await new Promise<void>((resolve, reject) => {
        if (img.complete) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = reject;
        }
      });

      const imgW = img.naturalWidth || page.width * 2;
      const imgH = img.naturalHeight || page.height * 2;
      const scaleFactorX = imgW / canvas.getWidth();
      const scaleFactorY = imgH / canvas.getHeight();

      const bbox = {
        x: Math.round((active.left || 0) * scaleFactorX),
        y: Math.round((active.top || 0) * scaleFactorY),
        width: Math.round((active.getScaledWidth() || 60) * scaleFactorX),
        height: Math.round((active.getScaledHeight() || 30) * scaleFactorY),
      };

      const strokePngUrl = extractContourStrokes(img, bbox, {
        threshold: 195,
        preserveInkColor: true,
      });

      if (strokePngUrl) {
        addImage(canvas, strokePngUrl);
      }
    } catch (err) {
      console.error('Stroke contour extraction failed:', err);
    }
  };

  // AI-Powered Document Reconstruction Pipeline
  const handleReconstructRegionAI = async () => {
    const canvas = activeCanvasRef.current;
    if (!canvas || !pdfData) return;
    const active = canvas.getActiveObject();
    if (!active || (active as any).isPdfBackground) return;

    const page = pdfData.pages[activePageIndex];
    if (!page || !page.bgDataUrl) return;

    setIsReconstructingAI(true);
    try {
      const activeText = (active as any).text || '';
      const normW = canvas.getWidth();
      const normH = canvas.getHeight();
      const box = [
        Math.round(((active.top || 0) / normH) * 1000),
        Math.round(((active.left || 0) / normW) * 1000),
        Math.round((((active.top || 0) + (active.getScaledHeight() || 20)) / normH) * 1000),
        Math.round((((active.left || 0) + (active.getScaledWidth() || 100)) / normW) * 1000),
      ];

      const resp = await fetch('/api/document/reconstruct-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: page.bgDataUrl,
          boundingBox: box,
          currentText: activeText,
          canvasLayerId: (active as any).extractedId || 'layer_edit_01',
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.reconstruction) {
          const rec = data.reconstruction;
          const target = rec.target_region;
          const font = target?.detected_font;
          const inpaint = rec.background_inpainting;

          if (font?.family) {
            await loadGoogleFont(font.family);
            (active as any).set('fontFamily', font.family);
          }
          if (font?.weight) {
            (active as any).set('fontWeight', font.weight);
          }
          if (font?.size_pt) {
            (active as any).set('fontSize', Math.max(8, Math.round(font.size_pt * (canvas.getWidth() / 612))));
          }
          if (font?.color) {
            (active as any).set('fill', font.color);
          }
          if (font?.letter_spacing) {
            (active as any).set('charSpacing', Math.round(font.letter_spacing * 50));
          }
          if (inpaint?.color) {
            (active as any).inpaintColor = inpaint.color;
            (active as any).set('backgroundColor', inpaint.color);
          }

          canvas.requestRenderAll();
          setActiveObjectProps((prev) =>
            prev
              ? {
                  ...prev,
                  fontFamily: font?.family || prev.fontFamily,
                  fontWeight: font?.weight || prev.fontWeight,
                  fontSize: font?.size_pt ? Math.round(font.size_pt * (canvas.getWidth() / 612)) : prev.fontSize,
                  fill: font?.color || prev.fill,
                  letterSpacing: font?.letter_spacing ?? prev.letterSpacing,
                  inpaintColor: inpaint?.color || prev.inpaintColor,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.warn('AI Reconstruction failed:', err);
    } finally {
      setIsReconstructingAI(false);
    }
  };

  // Layer Ordering and Manipulation Handlers
  const handleDeleteActive = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) deleteActiveObject(canvas);
  };

  const handleDuplicateActive = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) duplicateActiveObject(canvas);
  };

  const handleBringForward = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) bringObjectForward(canvas);
  };

  const handleSendBackward = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) sendObjectBackward(canvas);
  };

  const handleBringToFront = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) bringObjectToFront(canvas);
  };

  const handleSendToBack = () => {
    const canvas = activeCanvasRef.current;
    if (canvas) sendObjectToBack(canvas);
  };

  // Zoom helpers
  const handleZoomFitWidth = () => {
    if (!pdfData || !pdfData.pages[activePageIndex]) return;
    const page = pdfData.pages[activePageIndex];
    const container = typeof document !== 'undefined' ? document.getElementById('canvas-viewport-container') : null;
    const newZoom = calculateFitToWidthZoom(page.width, container);
    setZoom(newZoom);
  };

  const handleZoomFitPage = () => {
    if (!pdfData || !pdfData.pages[activePageIndex]) return;
    const page = pdfData.pages[activePageIndex];
    const container = typeof document !== 'undefined' ? document.getElementById('canvas-viewport-container') : null;
    const newZoom = calculateFitToPageZoom(page.width, page.height, container);
    setZoom(newZoom);
    if (container) {
      const pageEl = document.getElementById(`pdf-page-${page.pageNumber}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Tool Mode Selector
  const handleToolSelect = (tool: ToolMode) => {
    setActiveTool(tool);
    if (tool === 'text') {
      handleAddText('body');
      setActiveTool('select');
    } else if (tool === 'rect') {
      handleAddShape('rect');
      setActiveTool('select');
    } else if (tool === 'circle') {
      handleAddShape('circle');
      setActiveTool('select');
    } else if (tool === 'highlight') {
      handleAddShape('highlight');
      setActiveTool('select');
    }
  };

  // Export PDF Handler
  const handleExport = async (mode: 'hybrid' | 'flatten') => {
    if (!pdfData) return;

    try {
      setIsExporting(true);

      // Snapshot all active canvas states into pageInfo
      canvasesMapRef.current.forEach((canvas, pageNum) => {
        const pageInfo = pdfData.pages.find((p) => p.pageNumber === pageNum);
        if (pageInfo) {
          pageInfo.canvasJson = JSON.stringify(canvas.toJSON());
        }
      });

      const cleanFileName = pdfData.fileName.replace(/\.pdf$/i, '') + '-edited.pdf';

      const exportedBytes = await exportEditedPDF({
        fileName: cleanFileName,
        originalBytes: pdfData.originalBytes,
        pages: pdfData.pages,
        canvasesMap: canvasesMapRef.current,
        exportMode: mode,
      });

      const blob = new Blob([exportedBytes], { type: 'application/pdf' });
      triggerFileDownload(blob, cleanFileName);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Error exporting PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, textarea, or contentEditable element, do not hijack
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check if active fabric textbox is currently in editing mode
      const canvas = activeCanvasRef.current;
      const activeObj = canvas?.getActiveObject();
      if (activeObj && (activeObj as any).isEditing) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          setRedoTrigger((prev) => prev + 1);
        } else {
          setUndoTrigger((prev) => prev + 1);
        }
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setRedoTrigger((prev) => prev + 1);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObj && !(activeObj as any).isPdfBackground) {
          e.preventDefault();
          handleDeleteActive();
        }
      } else if (e.key === 'Escape') {
        canvas?.discardActiveObject();
        canvas?.requestRenderAll();
        setActiveObjectProps(null);
      } else if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExport('hybrid');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfData, activePageIndex]);

  const currentPageInfo = pdfData?.pages[activePageIndex];
  const totalOcrCount = pdfData?.pages.reduce((acc, p) => acc + (p.ocrTextCount || 0), 0) || 0;

  return (
    <div
      id="pdf-editor-root"
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F0F11] text-[#E0E0E0] select-none"
    >
      {!pdfData ? (
        // Dropzone & Ingestion Screen
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
          <UploadDropzone
            onFileSelected={handleFileSelected}
            onLoadSample={handleLoadSample}
            onLoadFlattenedSample={handleLoadFlattenedSample}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            progressMessage={progressMessage}
            errorMessage={errorMessage}
          />
        </div>
      ) : (
        // Main PDF Editor Workspace
        <>
          <TopBar
            fileName={pdfData.fileName}
            onFileNameChange={(newName) => setPdfData({ ...pdfData, fileName: newName })}
            currentPage={activePageIndex + 1}
            totalPages={pdfData.pages.length}
            onPageChange={handlePageChange}
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomFitWidth={handleZoomFitWidth}
            onZoomFitPage={handleZoomFitPage}
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => setUndoTrigger((prev) => prev + 1)}
            onRedo={() => setRedoTrigger((prev) => prev + 1)}
            onExport={handleExport}
            onNewDocument={handleNewDocument}
            isExporting={isExporting}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onOpenAiFontModal={() => setIsAiModalOpen(true)}
            isAiMatchingFonts={isAiMatchingFonts}
            aiMatchesCount={aiFontMatches.length}
            onRunOcr={handleRunOcrOnActivePage}
            isOcrRunning={isOcrRunning}
            ocrCount={totalOcrCount}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            syncPeerCount={syncPeers.length}
            syncStatus={syncStatus}
          />

          <div id="editor-workspace" className="flex-1 flex overflow-hidden relative">
            {/* Desktop Left Sidebar: Pages & Insert Tools */}
            <div className="hidden md:flex">
              <LeftSidebar
                pages={pdfData.pages}
                currentPage={activePageIndex + 1}
                onSelectPage={handlePageChange}
                onAddBlankPage={handleAddBlankPage}
                onDeletePage={handleDeletePage}
                onAddText={handleAddText}
                onAddShape={handleAddShape}
                onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
                onUploadImage={handleUploadImage}
              />
            </div>

            {/* Continuous Multi-Page Canvas Viewport */}
            <CanvasEditor
              pages={pdfData.pages}
              activePageIndex={activePageIndex}
              onPageVisibleChange={(idx) => setActivePageIndex(idx)}
              onPageSelect={(idx) => {
                setActivePageIndex(idx);
                const targetCanvas = canvasesMapRef.current.get(idx + 1);
                if (targetCanvas) activeCanvasRef.current = targetCanvas;
              }}
              zoom={zoom}
              activeTool={activeTool}
              onObjectSelected={(props) => {
                setActiveObjectProps(props);
                if (props && props.pageNumber) {
                  setActivePageIndex(props.pageNumber - 1);
                  const targetCanvas = canvasesMapRef.current.get(props.pageNumber);
                  if (targetCanvas) activeCanvasRef.current = targetCanvas;
                }
              }}
              onCanvasReady={handleCanvasReady}
              onCanvasDisposed={(pageNum) => {
                canvasesMapRef.current.delete(pageNum);
              }}
              onHistoryChange={(undoable, redoable) => {
                setCanUndo(undoable);
                setCanRedo(redoable);
              }}
              onZoomChange={setZoom}
              undoTrigger={undoTrigger}
              redoTrigger={redoTrigger}
              onAddBlankPageAfter={handleAddBlankPageAfter}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              scrollToPageNumber={scrollToPageNumber}
              aiFontMatches={aiFontMatches}
              documentLoadId={documentLoadId}
            />

            {/* Desktop Right Sidebar: Object Formatting, Layers, Coordinates */}
            <div className="hidden lg:flex">
              <RightSidebar
                activeObject={activeObjectProps}
                onUpdateActiveObject={handleUpdateActiveObject}
                onDeleteActiveObject={handleDeleteActive}
                onDuplicateActiveObject={handleDuplicateActive}
                onBringForward={handleBringForward}
                onSendBackward={handleSendBackward}
                onBringToFront={handleBringToFront}
                onSendToBack={handleSendToBack}
                onInpaintBackground={handleInpaintBackground}
                onExtractStrokeContour={handleExtractStrokeContour}
                onReconstructRegionAI={handleReconstructRegionAI}
                isInpaintingLoading={isInpaintingLoading}
                isReconstructingAI={isReconstructingAI}
              />
            </div>

            {/* Mobile Drawer Floating Buttons (< lg) */}
            <div className="lg:hidden absolute bottom-3 right-3 z-30 flex items-center gap-2">
              <button
                id="btn-mobile-open-pages"
                type="button"
                onClick={() => setMobileDrawer(mobileDrawer === 'left' ? 'none' : 'left')}
                className="px-2.5 py-1.5 bg-[#161618] border border-white/10 text-white rounded text-xs font-semibold shadow-lg flex items-center gap-1.5 active:bg-white/10"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Pages / Insert
              </button>
              {activeObjectProps && (
                <button
                  id="btn-mobile-open-props"
                  type="button"
                  onClick={() => setMobileDrawer(mobileDrawer === 'right' ? 'none' : 'right')}
                  className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold shadow-lg flex items-center gap-1.5 active:bg-blue-700"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Format
                </button>
              )}
            </div>

            {/* Mobile Drawer Overlay */}
            {mobileDrawer !== 'none' && (
              <div
                className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end"
                onClick={() => setMobileDrawer('none')}
              >
                <div
                  className="w-80 max-w-[85vw] h-full bg-[#161618] border-l border-white/10 flex flex-col shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {mobileDrawer === 'left' ? 'Document Pages & Tools' : 'Object Properties'}
                    </span>
                    <button
                      onClick={() => setMobileDrawer('none')}
                      className="p-1 text-white/50 hover:text-white rounded hover:bg-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {mobileDrawer === 'left' ? (
                      <LeftSidebar
                        pages={pdfData.pages}
                        currentPage={activePageIndex + 1}
                        onSelectPage={(p) => {
                          handlePageChange(p);
                          setMobileDrawer('none');
                        }}
                        onAddBlankPage={handleAddBlankPage}
                        onDeletePage={handleDeletePage}
                        onAddText={(t) => {
                          handleAddText(t);
                          setMobileDrawer('none');
                        }}
                        onAddShape={(s) => {
                          handleAddShape(s);
                          setMobileDrawer('none');
                        }}
                        onOpenSignatureModal={() => {
                          setIsSignatureModalOpen(true);
                          setMobileDrawer('none');
                        }}
                        onUploadImage={(f) => {
                          handleUploadImage(f);
                          setMobileDrawer('none');
                        }}
                      />
                    ) : (
                      <RightSidebar
                        activeObject={activeObjectProps}
                        onUpdateActiveObject={handleUpdateActiveObject}
                        onDeleteActiveObject={handleDeleteActive}
                        onDuplicateActiveObject={handleDuplicateActive}
                        onBringForward={handleBringForward}
                        onSendBackward={handleSendBackward}
                        onBringToFront={handleBringToFront}
                        onSendToBack={handleSendToBack}
                        onInpaintBackground={handleInpaintBackground}
                        onExtractStrokeContour={handleExtractStrokeContour}
                        onReconstructRegionAI={handleReconstructRegionAI}
                        isInpaintingLoading={isInpaintingLoading}
                        isReconstructingAI={isReconstructingAI}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* High Density Footer Bar */}
          <FooterBar
            currentPage={activePageIndex + 1}
            totalPages={pdfData.pages.length}
            zoom={zoom}
            activeObject={activeObjectProps}
          />

          {/* Floating Mobile Touch Controls for Responsive Viewports (iOS / Android / Touch Screens) */}
          <MobileTouchControls
            activeTool={activeTool}
            onToolChange={handleToolSelect}
            zoom={zoom}
            onZoomChange={setZoom}
            onFitPage={handleZoomFitPage}
            syncStatus={syncStatus}
            peers={syncPeers}
            myPlatform={myPlatform}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
          />
        </>
      )}

      {/* Cross-Platform Real-Time Cloud Sync Modal */}
      <RealtimeSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        roomId={syncRoomId}
        status={syncStatus}
        peers={syncPeers}
        myPlatform={myPlatform}
        myClientId={realtimeSync.getClientId()}
        onRoomChange={handleRoomChange}
        onPlatformChange={handlePlatformChange}
      />

      {/* Signature Drawing / Typing Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onInsertSignature={handleInsertSignature}
      />

      {/* AI Font Identification & Typeface Intelligence Modal */}
      <AIFontModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        matches={aiFontMatches}
        isMatching={isAiMatchingFonts}
        onReanalyze={() => {
          if (pdfData) runAIFontMatching(pdfData.pages, pdfData.fileName);
        }}
        onApplyMatches={() => {
          if (pdfData && aiFontMatches.length > 0) {
            let count = 0;
            canvasesMapRef.current.forEach((canvas) => {
              if (isCanvasAlive(canvas)) {
                count += applyFontMatchesToCanvas(canvas, aiFontMatches);
              }
            });
            setFontToast(`Applied AI matched fonts to ${count} text blocks.`);
            setTimeout(() => setFontToast(null), 4000);
          }
        }}
      />

      {/* Floating AI Typography Toast Notification */}
      {fontToast && (
        <div className="fixed bottom-10 left-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#161618] border border-blue-500/40 text-blue-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          <div className="w-5 h-5 rounded-md bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-white/90">{fontToast}</span>
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="ml-2 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer"
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={() => setFontToast(null)}
            className="text-white/40 hover:text-white ml-1 p-0.5"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
