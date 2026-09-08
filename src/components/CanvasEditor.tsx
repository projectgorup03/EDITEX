import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ActiveObjectProperties,
  AIFontMatch,
  PDFPageInfo,
  ToolMode,
} from '../types';
import {
  createEditorCanvas,
} from '../utils/fabricHelpers';
import {
  calculateDynamicPageScale,
  renderHighDpiPageBackground,
  syncFabricCanvasToPage,
  populateNormalizedTextItems,
  isCanvasAlive,
  safeDisposeCanvas,
} from '../utils/pdfCanvasManager';
import { applyFontMatchesToCanvas } from '../utils/fontManager';
import { calculateFitToPageZoom } from '../utils/zoomHelpers';
import { Plus, Trash2, Copy } from 'lucide-react';

interface CanvasEditorProps {
  pages: PDFPageInfo[];
  activePageIndex: number;
  onPageVisibleChange: (pageIndex: number) => void;
  onPageSelect: (pageIndex: number) => void;
  zoom: number;
  activeTool: ToolMode;
  onObjectSelected: (props: ActiveObjectProperties | null) => void;
  onCanvasReady: (pageNumber: number, canvas: fabric.Canvas) => void;
  onCanvasDisposed?: (pageNumber: number) => void;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onZoomChange: (newZoom: number) => void;
  undoTrigger: number;
  redoTrigger: number;
  onAddBlankPageAfter?: (pageNumber: number) => void;
  onDeletePage?: (pageNumber: number) => void;
  onDuplicatePage?: (pageNumber: number) => void;
  scrollToPageNumber?: number | null;
  aiFontMatches?: AIFontMatch[];
  documentLoadId?: number;
}

/**
 * Single Continuous Page Canvas Card
 */
interface SinglePageProps {
  pageInfo: PDFPageInfo;
  totalPages: number;
  zoom: number;
  containerWidth: number;
  containerHeight: number;
  isActive: number;
  activeTool: ToolMode;
  aiFontMatches?: AIFontMatch[];
  onSelectThisPage: () => void;
  onObjectSelected: (props: ActiveObjectProperties | null) => void;
  onCanvasReady: (pageNumber: number, canvas: fabric.Canvas) => void;
  onCanvasDisposed?: (pageNumber: number) => void;
  onPushHistory: (pageNumber: number, json: string) => void;
  onAddBlankPageAfter?: (pageNumber: number) => void;
  onDeletePage?: (pageNumber: number) => void;
  onDuplicatePage?: (pageNumber: number) => void;
  onDeselectOthers: (currentPageNumber: number) => void;
}

const SinglePageCanvas: React.FC<SinglePageProps> = React.memo(({
  pageInfo,
  totalPages,
  zoom,
  containerWidth,
  containerHeight,
  isActive,
  activeTool,
  aiFontMatches,
  onSelectThisPage,
  onObjectSelected,
  onCanvasReady,
  onCanvasDisposed,
  onPushHistory,
  onAddBlankPageAfter,
  onDeletePage,
  onDuplicatePage,
  onDeselectOthers,
}) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isHistoryActionRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const currentScaleRef = useRef<number>(1.0);

  // Unscaled native PDF dimensions
  const unscaledW = pageInfo.unscaledWidth || pageInfo.pdfWidth || pageInfo.width || 612;
  const unscaledH = pageInfo.unscaledHeight || pageInfo.pdfHeight || pageInfo.height || 792;

  // Rule 1: Dynamic Scale & Fit-to-Page Calculation
  const { scale, width: viewportWidth, height: viewportHeight } = calculateDynamicPageScale(
    unscaledW,
    unscaledH,
    containerWidth,
    containerHeight,
    zoom
  );

  // Helper to extract properties from Fabric object
  const extractProperties = useCallback((obj: fabric.FabricObject | null): ActiveObjectProperties | null => {
    if (!obj || (obj as any).isPdfBackground) return null;

    const isText = obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text';
    const textObj = isText ? (obj as fabric.Textbox) : null;

    return {
      type: obj.type,
      pageNumber: pageInfo.pageNumber,
      text: textObj ? textObj.text : undefined,
      fontSize: textObj ? textObj.fontSize : undefined,
      fontFamily: textObj ? textObj.fontFamily : undefined,
      fontWeight: textObj ? textObj.fontWeight : undefined,
      fontStyle: textObj ? textObj.fontStyle : undefined,
      underline: textObj ? textObj.underline : undefined,
      textAlign: textObj ? (textObj.textAlign as any) : undefined,
      fill: typeof obj.fill === 'string' ? obj.fill : undefined,
      stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      angle: obj.angle,
      rawFontName: (obj as any).rawFontName,
      aiMatchedFont: (obj as any).aiMatchedFont,
      aiConfidence: (obj as any).aiConfidence,
      aiMatchReason: (obj as any).aiMatchReason,
      substitutes: (obj as any).substitutes,
      isOcr: (obj as any).isOcr,
      ocrConfidence: (obj as any).ocrConfidence,
      inpaintColor: (obj as any).inpaintColor || (obj as any).backgroundColor || '#ffffff',
      inpaintFillType: (obj as any).inpaintFillType || 'solid',
      letterSpacing: (obj as any).charSpacing ? Number(((obj as any).charSpacing / 50).toFixed(2)) : 0,
      charSpacing: (obj as any).charSpacing || 0,
      lineHeight: textObj?.lineHeight,
      isInpainted: Boolean((obj as any).isInpainted),
    };
  }, [pageInfo.pageNumber]);

  // Initialize Fabric Canvas for this page (Rule 2 & Rule 3)
  useEffect(() => {
    if (!canvasElRef.current) return;

    let isCancelled = false;
    isInitializedRef.current = false;

    if (fabricCanvasRef.current) {
      const prev = fabricCanvasRef.current;
      fabricCanvasRef.current = null;
      safeDisposeCanvas(prev);
    }

    // Underlying HTML5 Canvas matches viewport dimensions exactly
    const canvas = createEditorCanvas(
      canvasElRef.current,
      viewportWidth,
      viewportHeight
    );
    fabricCanvasRef.current = canvas;
    currentScaleRef.current = scale;
    onCanvasReady(pageInfo.pageNumber, canvas);

    const initPage = async () => {
      try {
        if (pageInfo.canvasJson) {
          if (isCancelled || !isCanvasAlive(canvas)) return;
          await canvas.loadFromJSON(pageInfo.canvasJson);
          if (isCancelled || !isCanvasAlive(canvas)) return;
          await syncFabricCanvasToPage(canvas, viewportWidth, viewportHeight, pageInfo.bgDataUrl);
        } else {
          // High-DPI background render or fallback (suppress native text to prevent duplicate overlays)
          let bgUrl = pageInfo.bgDataUrl;
          if (pageInfo.pageProxy) {
            try {
              const hasNativeText = pageInfo.textItems?.some((t) => !t.isOcr) ?? true;
              bgUrl = await renderHighDpiPageBackground(pageInfo.pageProxy, scale, hasNativeText);
            } catch (e) {
              console.warn('Fallback to pre-rendered bg:', e);
            }
          }
          if (isCancelled || !isCanvasAlive(canvas)) return;
          await syncFabricCanvasToPage(canvas, viewportWidth, viewportHeight, bgUrl);

          if (isCancelled || !isCanvasAlive(canvas)) return;
          // Rule 3: Interactive Element Coordinate Normalization
          if (pageInfo.textItems && pageInfo.textItems.length > 0) {
            populateNormalizedTextItems(canvas, pageInfo.textItems, scale);
          }
        }

        if (isCancelled || !isCanvasAlive(canvas)) return;

        // If AI font matches are already available, apply them right away
        if (aiFontMatches && aiFontMatches.length > 0) {
          applyFontMatchesToCanvas(canvas, aiFontMatches);
        }

        isInitializedRef.current = true;

        if (isCancelled || !isCanvasAlive(canvas)) return;

        // Initial history push
        onPushHistory(pageInfo.pageNumber, JSON.stringify(canvas.toJSON()));
        canvas.requestRenderAll();
      } catch (err) {
        console.warn('Error during page canvas initialization:', err);
      }
    };

    initPage();

    // Fabric Event Listeners
    const handleSelection = (e: any) => {
      if (!isCanvasAlive(canvas)) return;
      onSelectThisPage();
      onDeselectOthers(pageInfo.pageNumber);
      const selected = e.selected?.[0] || canvas.getActiveObject();
      onObjectSelected(extractProperties(selected));
    };

    const handleCleared = () => {
      onObjectSelected(null);
    };

    const handleChange = () => {
      if (isCancelled || !isCanvasAlive(canvas)) return;
      if (!isHistoryActionRef.current) {
        onPushHistory(pageInfo.pageNumber, JSON.stringify(canvas.toJSON()));
      }
    };

    let lastTapTime = 0;
    let lastTapTarget: any = null;

    const handleMouseDown = (opt: any) => {
      onSelectThisPage();
      const now = Date.now();
      const target = opt?.target;
      if (target && (target.type === 'textbox' || target.type === 'i-text')) {
        if (lastTapTarget === target && (now - lastTapTime) < 380) {
          // Double tap detected on mobile device: enter editing mode
          if (typeof target.enterEditing === 'function') {
            target.enterEditing();
            if (target.hiddenTextarea && typeof target.hiddenTextarea.focus === 'function') {
              target.hiddenTextarea.focus();
            }
          }
        }
        lastTapTime = now;
        lastTapTarget = target;
      } else {
        lastTapTarget = null;
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);
    canvas.on('object:modified', (e) => {
      if (e.target) {
        (e.target as any).userTransformed = true;
      }
      handleChange();
    });
    canvas.on('object:added', (e) => {
      if (!(e.target as any)?.isPdfBackground) handleChange();
    });
    canvas.on('object:removed', (e) => {
      if (!(e.target as any)?.isPdfBackground) handleChange();
    });

    return () => {
      isCancelled = true;
      isInitializedRef.current = false;
      if (onCanvasDisposed) onCanvasDisposed(pageInfo.pageNumber);
      const c = fabricCanvasRef.current;
      fabricCanvasRef.current = null;
      safeDisposeCanvas(c);
    };
  }, [pageInfo.pageNumber]);

  // Re-sync canvas dimensions and background when scale/viewport changes dynamically
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isCanvasAlive(canvas) || !isInitializedRef.current) return;

    let isCancelled = false;

    const reSyncPage = async () => {
      if (isCancelled || !isCanvasAlive(canvas)) return;

      const prevScale = currentScaleRef.current || scale;
      const ratio = scale / (prevScale || 1);
      currentScaleRef.current = scale;

      let bgUrl = pageInfo.bgDataUrl;
      if (pageInfo.pageProxy) {
        try {
          const hasNativeText = pageInfo.textItems?.some((t) => !t.isOcr) ?? true;
          bgUrl = await renderHighDpiPageBackground(pageInfo.pageProxy, scale, hasNativeText);
        } catch (e) {
          console.warn('Fallback to pre-rendered bg on resize:', e);
        }
      }
      if (isCancelled || !isCanvasAlive(canvas)) return;

      await syncFabricCanvasToPage(canvas, viewportWidth, viewportHeight, bgUrl);
      if (isCancelled || !isCanvasAlive(canvas)) return;

      // Scale existing non-background objects smoothly by ratio
      if (ratio !== 1) {
        const objects = canvas.getObjects();
        for (const obj of objects) {
          if ((obj as any).isPdfBackground) continue;
          if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
            const tb = obj as fabric.Textbox;
            if (!(tb as any).userTransformed && (tb as any).unscaledBaselineY !== undefined) {
              // Engine locks strictly to extracted baseline coordinates and precise font point size
              const baseFontSize = (tb as any).unscaledFontSize ?? tb.fontSize ?? 12;
              const baseBaselineX = (tb as any).unscaledBaselineX ?? (tb as any).unscaledX ?? tb.left;
              const baseBaselineY = (tb as any).unscaledBaselineY;
              const baseWidth = (tb as any).unscaledWidth ?? tb.width;

              tb.fontSize = baseFontSize * scale;
              const baselineOffset = tb.fontSize * 1.13 * (1 - 0.222);
              tb.left = baseBaselineX * scale;
              tb.top = baseBaselineY * scale - baselineOffset;
              tb.width = baseWidth * scale;
              tb.padding = 0;
              tb.lineHeight = (tb as any).unscaledLineHeight || 1.0;
              tb.textAlign = (tb as any).unscaledTextAlign || tb.textAlign || 'left';
              (tb as any)._splitTextIntoLines = fabric.IText.prototype._splitTextIntoLines;
              tb.initDimensions();
            } else {
              // User has explicitly transformed this object: scale user-defined coordinates
              tb.left = (tb.left || 0) * ratio;
              tb.top = (tb.top || 0) * ratio;
              tb.fontSize = (tb.fontSize || 12) * ratio;
              tb.width = (tb.width || 50) * ratio;
            }
          } else {
            obj.left = (obj.left || 0) * ratio;
            obj.top = (obj.top || 0) * ratio;
            obj.scaleX = (obj.scaleX || 1) * ratio;
            obj.scaleY = (obj.scaleY || 1) * ratio;
          }
          obj.setCoords();
        }
      }

      if (isCancelled || !isCanvasAlive(canvas)) return;

      try {
        canvas.calcOffset();
        canvas.requestRenderAll();
      } catch (e) {
        console.warn('Safely handled canvas render error on resize:', e);
      }
    };

    reSyncPage();

    return () => {
      isCancelled = true;
    };
  }, [viewportWidth, viewportHeight, scale]);

  // Update tool mode on this canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isCanvasAlive(canvas)) return;

    if (activeTool === 'draw') {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 3;
      brush.color = '#2563eb';
      canvas.freeDrawingBrush = brush;
      canvas.selection = false;
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = activeTool === 'select';
      if (activeTool === 'pan') {
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
    }
  }, [activeTool]);

  // When AI font matches arrive/update, apply to this page
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && isCanvasAlive(canvas) && aiFontMatches && aiFontMatches.length > 0) {
      applyFontMatchesToCanvas(canvas, aiFontMatches);
    }
  }, [aiFontMatches]);

  const isCurrentPage = isActive === pageInfo.pageNumber - 1;

  return (
    <div
      id={`pdf-page-${pageInfo.pageNumber}`}
      data-page-number={pageInfo.pageNumber}
      onClick={onSelectThisPage}
      className="w-full flex flex-col items-center group/page transition-opacity duration-200"
      style={{
        objectFit: 'contain',
      }}
    >
      {/* Page Header Bar */}
      <div
        className="flex items-center justify-between pb-2 px-1 text-white/50 text-xs select-none"
        style={{ width: `${viewportWidth}px`, maxWidth: '100%' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded transition ${
              isCurrentPage
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#1C1C1E] text-white/70 border border-white/10 hover:border-white/25'
            }`}
          >
            PAGE {pageInfo.pageNumber} OF {totalPages}
          </span>
          <span className="text-[10px] text-white/40 hidden sm:inline font-mono">
            {unscaledW} × {unscaledH} pt
          </span>
        </div>

        {/* Page Quick Actions */}
        <div className="flex items-center gap-1 opacity-60 group-hover/page:opacity-100 transition">
          {onAddBlankPageAfter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddBlankPageAfter(pageInfo.pageNumber);
              }}
              className="p-1 rounded bg-[#1C1C1E] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[10px] flex items-center gap-1 transition"
              title="Add blank page below"
            >
              <Plus className="w-3 h-3 text-blue-400" />
              <span className="hidden md:inline">Add Page</span>
            </button>
          )}

          {onDuplicatePage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicatePage(pageInfo.pageNumber);
              }}
              className="p-1 rounded bg-[#1C1C1E] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition"
              title="Duplicate page"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}

          {totalPages > 1 && onDeletePage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePage(pageInfo.pageNumber);
              }}
              className="p-1 rounded bg-[#1C1C1E] hover:bg-red-500/20 text-white/50 hover:text-red-300 border border-white/10 transition"
              title="Delete this page"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scaled Canvas Frame (Rule 2 & Rule 4: exactly matches viewport dimensions) */}
      <div
        className={`relative bg-white shadow-[0_8px_32px_rgba(0,0,0,0.65)] rounded-xs border transition-all ${
          isCurrentPage
            ? 'ring-2 ring-blue-500 border-blue-500/80'
            : 'border-white/10 hover:border-white/30'
        }`}
        style={{
          width: `${viewportWidth}px`,
          height: `${viewportHeight}px`,
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      >
        <canvas ref={canvasElRef} id={`canvas-page-${pageInfo.pageNumber}`} />
      </div>
    </div>
  );
});

SinglePageCanvas.displayName = 'SinglePageCanvas';

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  pages,
  activePageIndex,
  onPageVisibleChange,
  onPageSelect,
  zoom,
  activeTool,
  onObjectSelected,
  onCanvasReady,
  onCanvasDisposed,
  onHistoryChange,
  onZoomChange,
  undoTrigger,
  redoTrigger,
  onAddBlankPageAfter,
  onDeletePage,
  onDuplicatePage,
  scrollToPageNumber,
  aiFontMatches,
  documentLoadId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageNodesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasesRef = useRef<Map<number, fabric.Canvas>>(new Map());

  // Track viewport container dimensions dynamically for responsive Fit-to-Page calculation
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 300) : 800,
    height: typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 150) : 800,
  });

  // Track documentLoadId to automatically scale to 'Fit to Page' on upload
  const lastFittedDocIdRef = useRef<number | null>(null);

  const applyFitToPage = useCallback(() => {
    if (!pages || pages.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    // Reset scroll positions to top
    container.scrollTop = 0;
    container.scrollLeft = 0;

    const firstPage = pages[0];
    const fitZoom = calculateFitToPageZoom(firstPage.width, firstPage.height, container);
    onZoomChange(fitZoom);
  }, [pages, onZoomChange]);

  // Force scale to Fit to Page immediately upon upload
  useEffect(() => {
    if (!pages || pages.length === 0) return;
    if (documentLoadId !== undefined && lastFittedDocIdRef.current === documentLoadId) return;

    if (documentLoadId !== undefined) {
      lastFittedDocIdRef.current = documentLoadId;
    }

    // Immediately execute fit
    applyFitToPage();

    // Re-verify after layout stabilization
    const animId1 = requestAnimationFrame(() => {
      applyFitToPage();
      const animId2 = requestAnimationFrame(() => {
        applyFitToPage();
      });
      return () => cancelAnimationFrame(animId2);
    });

    return () => cancelAnimationFrame(animId1);
  }, [documentLoadId, pages, applyFitToPage]);

  // Ensure fit is recalibrated once the viewport container receives its initial DOM dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let hasInitiallyFitted = false;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          setContainerDimensions({
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
          });
          if (!hasInitiallyFitted) {
            hasInitiallyFitted = true;
            applyFitToPage();
          }
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [applyFitToPage]);

  // Per-page undo/redo history stacks: pageNumber -> string[]
  const historyMapRef = useRef<Map<number, { stack: string[]; index: number }>>(new Map());

  // Touch tracking for pinch-to-zoom & two-finger pan
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(zoom);
  const touchStartMidRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartSinglePosRef = useRef<{ x: number; y: number } | null>(null);
  const isTwoFingerGestureRef = useRef<boolean>(false);

  // Pan tool mouse dragging
  const isPanningRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update history state for active page
  const updateActiveHistoryStatus = useCallback(() => {
    const activePageNumber = activePageIndex + 1;
    const history = historyMapRef.current.get(activePageNumber);
    if (!history) {
      onHistoryChange(false, false);
      return;
    }
    onHistoryChange(history.index > 0, history.index < history.stack.length - 1);
  }, [activePageIndex, onHistoryChange]);

  const handlePushHistory = useCallback((pageNumber: number, json: string) => {
    let hist = historyMapRef.current.get(pageNumber);
    if (!hist) {
      hist = { stack: [json], index: 0 };
      historyMapRef.current.set(pageNumber, hist);
    } else {
      if (hist.index < hist.stack.length - 1) {
        hist.stack = hist.stack.slice(0, hist.index + 1);
      }
      hist.stack.push(json);
      hist.index = hist.stack.length - 1;
    }

    if (pageNumber === activePageIndex + 1) {
      onHistoryChange(hist.index > 0, hist.index < hist.stack.length - 1);
    }
  }, [activePageIndex, onHistoryChange]);

  // Handle Canvas Ready & Register
  const handleChildCanvasReady = useCallback((pageNumber: number, canvas: fabric.Canvas) => {
    canvasesRef.current.set(pageNumber, canvas);
    onCanvasReady(pageNumber, canvas);
  }, [onCanvasReady]);

  const handleChildCanvasDisposed = useCallback((pageNumber: number) => {
    canvasesRef.current.delete(pageNumber);
    if (onCanvasDisposed) onCanvasDisposed(pageNumber);
  }, [onCanvasDisposed]);

  // Deselect objects on all other canvases when one is selected
  const handleDeselectOthers = useCallback((currentPageNumber: number) => {
    canvasesRef.current.forEach((canvas, pNum) => {
      if (pNum !== currentPageNumber && isCanvasAlive(canvas)) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    });
  }, []);

  // Handle Undo
  useEffect(() => {
    if (undoTrigger <= 0) return;
    const activePageNumber = activePageIndex + 1;
    const canvas = canvasesRef.current.get(activePageNumber);
    const hist = historyMapRef.current.get(activePageNumber);
    if (!canvas || !isCanvasAlive(canvas) || !hist || hist.index <= 0) return;

    hist.index -= 1;
    const prevState = hist.stack[hist.index];
    canvas.loadFromJSON(prevState).then(() => {
      if (!isCanvasAlive(canvas)) return;
      canvas.requestRenderAll();
      onHistoryChange(hist.index > 0, hist.index < hist.stack.length - 1);
      const activeObj = canvas.getActiveObject();
      if (!activeObj) onObjectSelected(null);
    }).catch((err) => console.warn('Undo load error:', err));
  }, [undoTrigger]);

  // Handle Redo
  useEffect(() => {
    if (redoTrigger <= 0) return;
    const activePageNumber = activePageIndex + 1;
    const canvas = canvasesRef.current.get(activePageNumber);
    const hist = historyMapRef.current.get(activePageNumber);
    if (!canvas || !isCanvasAlive(canvas) || !hist || hist.index >= hist.stack.length - 1) return;

    hist.index += 1;
    const nextState = hist.stack[hist.index];
    canvas.loadFromJSON(nextState).then(() => {
      if (!isCanvasAlive(canvas)) return;
      canvas.requestRenderAll();
      onHistoryChange(hist.index > 0, hist.index < hist.stack.length - 1);
      const activeObj = canvas.getActiveObject();
      if (!activeObj) onObjectSelected(null);
    }).catch((err) => console.warn('Redo load error:', err));
  }, [redoTrigger]);

  // IntersectionObserver to detect which page is currently in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find entry with maximum intersection ratio
        let maxEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!maxEntry || entry.intersectionRatio > maxEntry.intersectionRatio) {
              maxEntry = entry;
            }
          }
        }

        if (maxEntry && maxEntry.target) {
          const pNum = Number(maxEntry.target.getAttribute('data-page-number'));
          if (pNum && !isNaN(pNum)) {
            onPageVisibleChange(pNum - 1);
          }
        }
      },
      {
        root: container,
        threshold: [0.2, 0.5, 0.8],
      }
    );

    // Observe each page element
    pages.forEach((p) => {
      const el = document.getElementById(`pdf-page-${p.pageNumber}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages, onPageVisibleChange]);

  // Smooth scroll to page when scrollToPageNumber changes
  useEffect(() => {
    if (scrollToPageNumber === null || scrollToPageNumber === undefined) return;
    const targetEl = document.getElementById(`pdf-page-${scrollToPageNumber}`);
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToPageNumber]);

  // Wheel zoom (Ctrl + Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2.5, Math.max(0.4, Number((zoom + delta).toFixed(2))));
      onZoomChange(newZoom);
    }
  };

  // Multi-Touch Handlers (Pinch-to-zoom, Two-Finger Pan & 1-Finger Pan tool)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isTwoFingerGestureRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartZoomRef.current = zoom;
      touchStartMidRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    } else if (e.touches.length === 1 && activeTool === 'pan') {
      touchStartSinglePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleDelta = currentDist / touchStartDistRef.current;
      const newZoom = Math.min(2.5, Math.max(0.4, Number((touchStartZoomRef.current * scaleDelta).toFixed(2))));
      onZoomChange(newZoom);

      const currentMid = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      if (touchStartMidRef.current && containerRef.current) {
        const deltaX = currentMid.x - touchStartMidRef.current.x;
        const deltaY = currentMid.y - touchStartMidRef.current.y;
        containerRef.current.scrollLeft -= deltaX;
        containerRef.current.scrollTop -= deltaY;
        touchStartMidRef.current = currentMid;
      }
    } else if (e.touches.length === 1 && activeTool === 'pan' && touchStartSinglePosRef.current && containerRef.current) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - touchStartSinglePosRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartSinglePosRef.current.y;
      containerRef.current.scrollLeft -= deltaX;
      containerRef.current.scrollTop -= deltaY;
      touchStartSinglePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartMidRef.current = null;
    touchStartSinglePosRef.current = null;
    isTwoFingerGestureRef.current = false;
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1 || (e.target === containerRef.current && activeTool === 'select')) {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current && containerRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      containerRef.current.scrollLeft -= dx;
      containerRef.current.scrollTop -= dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      id="canvas-viewport-container"
      className="relative flex-1 w-full h-full overflow-auto bg-[#0F0F11] flex flex-col items-center select-none touch-scroll overscroll-contain"
      style={{
        cursor: activeTool === 'pan' ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default',
        touchAction: activeTool === 'draw' || activeTool === 'pan' ? 'none' : 'pan-x pan-y',
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Continuous Vertical Pages Stack */}
      <div className="w-full max-w-full flex flex-col items-center gap-6 py-3 sm:py-4 px-2 sm:px-4 shrink-0 pb-28 lg:pb-8">
        {pages.map((pageInfo) => (
          <SinglePageCanvas
            key={`page-${pageInfo.pageNumber}`}
            pageInfo={pageInfo}
            totalPages={pages.length}
            zoom={zoom}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
            isActive={activePageIndex}
            activeTool={activeTool}
            aiFontMatches={aiFontMatches}
            onSelectThisPage={() => {
              onPageSelect(pageInfo.pageNumber - 1);
              updateActiveHistoryStatus();
            }}
            onObjectSelected={onObjectSelected}
            onCanvasReady={handleChildCanvasReady}
            onCanvasDisposed={handleChildCanvasDisposed}
            onPushHistory={handlePushHistory}
            onAddBlankPageAfter={onAddBlankPageAfter}
            onDeletePage={onDeletePage}
            onDuplicatePage={onDuplicatePage}
            onDeselectOthers={handleDeselectOthers}
          />
        ))}
      </div>
    </div>
  );
};
