import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  MousePointer,
  Type,
  Square,
  Circle,
  Highlighter,
  PenTool,
  Hand,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  ScanText,
  Radio,
} from 'lucide-react';
import { ToolMode } from '../types';

interface TopBarProps {
  fileName: string;
  onFileNameChange: (newName: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onZoomFitWidth: () => void;
  onZoomFitPage: () => void;
  activeTool: ToolMode;
  onToolSelect: (tool: ToolMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (mode: 'hybrid' | 'flatten') => void;
  onNewDocument: () => void;
  isExporting: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAiFontModal?: () => void;
  isAiMatchingFonts?: boolean;
  aiMatchesCount?: number;
  onRunOcr?: () => void;
  isOcrRunning?: boolean;
  ocrCount?: number;
  onOpenSyncModal?: () => void;
  syncPeerCount?: number;
  syncStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export const TopBar: React.FC<TopBarProps> = ({
  fileName,
  onFileNameChange,
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomChange,
  onZoomFitWidth,
  onZoomFitPage,
  activeTool,
  onToolSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onNewDocument,
  isExporting,
  darkMode,
  onToggleDarkMode,
  onOpenAiFontModal,
  isAiMatchingFonts,
  aiMatchesCount = 0,
  onRunOcr,
  isOcrRunning = false,
  ocrCount = 0,
  onOpenSyncModal,
  syncPeerCount = 1,
  syncStatus = 'connected',
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const zoomOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <header
      id="app-topbar"
      className="h-14 border-b border-white/10 bg-[#161618] px-3 sm:px-4 flex items-center justify-between gap-2 select-none z-30 shrink-0 text-[#E0E0E0]"
    >
      {/* Left Section: Logo & Document Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="btn-new-document"
          type="button"
          onClick={onNewDocument}
          className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded-md text-white transition-colors shrink-0 shadow-xs"
          title="Open another PDF document"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        <div className="flex flex-col min-w-0 max-w-[150px] sm:max-w-[200px] md:max-w-xs">
          <input
            id="input-doc-name"
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="w-full text-xs sm:text-sm font-semibold text-[#E0E0E0] bg-transparent truncate border border-transparent hover:border-white/10 focus:border-blue-500 focus:bg-[#1C1C1E] rounded px-1 py-0.2 focus:outline-hidden transition"
            title="Click to rename document"
          />
          <span className="text-[9px] text-white/40 uppercase tracking-widest px-1 hidden sm:inline-block">
            {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} • Vector Mode
          </span>
        </div>

        {/* Undo / Redo controls */}
        <div className="hidden sm:flex items-center bg-[#1C1C1E] rounded-lg p-0.5 border border-white/5 gap-0.5">
          <button
            id="btn-undo"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2.5 py-1 hover:bg-white/5 rounded text-xs text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[10px] uppercase font-bold tracking-wider">Undo</span>
          </button>
          <button
            id="btn-redo"
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="px-2.5 py-1 hover:bg-white/5 rounded text-xs text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[10px] uppercase font-bold tracking-wider">Redo</span>
          </button>
        </div>
      </div>

      {/* Middle Section: Tool Selector (Desktop) */}
      <div className="hidden xl:flex items-center bg-[#1C1C1E] rounded-lg p-1 border border-white/5 gap-0.5">
        {[
          { id: 'select' as ToolMode, icon: MousePointer, label: 'Select' },
          { id: 'text' as ToolMode, icon: Type, label: 'Text' },
          { id: 'rect' as ToolMode, icon: Square, label: 'Rect' },
          { id: 'circle' as ToolMode, icon: Circle, label: 'Circle' },
          { id: 'highlight' as ToolMode, icon: Highlighter, label: 'Highlight' },
          { id: 'draw' as ToolMode, icon: PenTool, label: 'Pen' },
          { id: 'pan' as ToolMode, icon: Hand, label: 'Pan' },
        ].map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              id={`tool-btn-${tool.id}`}
              type="button"
              onClick={() => onToolSelect(tool.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                isActive
                  ? 'bg-white/10 text-white font-medium shadow-xs ring-1 ring-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title={tool.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Section: Pagination, Zoom & Export */}
      <div className="flex items-center gap-2">
        {/* Page Switcher */}
        {totalPages > 0 && (
          <div className="flex items-center bg-[#1C1C1E] rounded-lg p-0.5 border border-white/5 text-xs font-mono">
            <button
              id="btn-prev-page"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-white/80 text-[11px] whitespace-nowrap">
              {currentPage.toString().padStart(2, '0')} / {totalPages.toString().padStart(2, '0')}
            </span>
            <button
              id="btn-next-page"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="relative flex items-center bg-[#1C1C1E] rounded-lg p-0.5 border border-white/5 text-xs">
          <button
            id="btn-zoom-out"
            type="button"
            onClick={() => onZoomChange(Math.max(0.4, Number((zoom - 0.15).toFixed(2))))}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/5 transition"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-menu"
            type="button"
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="px-2 py-0.5 text-[11px] font-mono text-white/90 hover:bg-white/5 rounded transition"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            id="btn-zoom-in"
            type="button"
            onClick={() => onZoomChange(Math.min(2.5, Number((zoom + 0.15).toFixed(2))))}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/5 transition"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom dropdown popover */}
          {showZoomMenu && (
            <div
              className="absolute top-full right-0 mt-1.5 w-32 bg-[#161618] border border-white/10 rounded-lg shadow-2xl p-1 z-50 text-xs"
              onClick={() => setShowZoomMenu(false)}
            >
              {zoomOptions.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => onZoomChange(z)}
                  className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 transition font-mono text-xs ${
                    Math.abs(zoom - z) < 0.05
                      ? 'font-bold text-blue-400 bg-white/5'
                      : 'text-white/80'
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={onZoomFitWidth}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-white/80 text-xs"
              >
                Fit Width
              </button>
              <button
                type="button"
                onClick={onZoomFitPage}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-white/80 text-xs"
              >
                Fit Page
              </button>
            </div>
          )}
        </div>

        {/* AI Font Matcher Indicator / Trigger Button */}
        {onOpenAiFontModal && (
          <button
            id="btn-ai-font-matcher"
            type="button"
            onClick={onOpenAiFontModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer shrink-0"
            title="AI Font Identification & Typeface Intelligence"
          >
            <Sparkles className={`w-3.5 h-3.5 text-blue-400 ${isAiMatchingFonts ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isAiMatchingFonts ? 'AI Matching...' : aiMatchesCount > 0 ? `AI Fonts (${aiMatchesCount})` : 'AI Fonts'}
            </span>
          </button>
        )}

        {/* Automated OCR Pipeline Trigger Button */}
        {onRunOcr && (
          <button
            id="btn-ocr-pipeline"
            type="button"
            onClick={onRunOcr}
            disabled={isOcrRunning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Force-convert flattened or image text into interactive editable textboxes"
          >
            <ScanText className={`w-3.5 h-3.5 text-emerald-400 ${isOcrRunning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isOcrRunning ? 'OCR Running...' : ocrCount > 0 ? `OCR (${ocrCount})` : 'Run OCR'}
            </span>
          </button>
        )}

        {/* Real-time Cross-Platform Cloud Sync Button */}
        {onOpenSyncModal && (
          <button
            id="btn-realtime-sync"
            type="button"
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer shrink-0 ${
              syncStatus === 'connected'
                ? 'bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border-purple-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
            }`}
            title="Cross-Platform Real-Time Sync & Collaboration (iOS / Android / Web)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">
              {syncPeerCount !== undefined && syncPeerCount > 1
                ? `Sync (${syncPeerCount})`
                : 'Live Sync'}
            </span>
          </button>
        )}

        {/* Prominent Download Button with Option Dropdown */}
        <div className="relative flex items-center">
          <div className="inline-flex rounded-lg overflow-hidden border border-blue-500/30">
            <button
              id="btn-download-pdf"
              type="button"
              disabled={isExporting}
              onClick={() => onExport('hybrid')}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors cursor-pointer text-xs font-medium"
            >
              {isExporting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              id="btn-download-menu"
              type="button"
              disabled={isExporting}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-1.5 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white transition border-l border-blue-500/40"
              title="Export Options"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {showExportMenu && (
            <div
              className="absolute top-full right-0 mt-1.5 w-56 bg-[#161618] border border-white/10 rounded-lg shadow-2xl p-1.5 z-50 text-xs"
              onClick={() => setShowExportMenu(false)}
            >
              <button
                type="button"
                onClick={() => onExport('hybrid')}
                className="w-full text-left px-3 py-2 rounded hover:bg-white/5 transition"
              >
                <div className="font-semibold text-white flex items-center justify-between">
                  Vector PDF Export
                  <span className="text-[9px] uppercase tracking-wider text-blue-400 font-mono">Pro</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  Native PDF text, fonts & vector layers
                </div>
              </button>
              <button
                type="button"
                onClick={() => onExport('flatten')}
                className="w-full text-left px-3 py-2 rounded hover:bg-white/5 transition"
              >
                <div className="font-semibold text-white">
                  High-DPI Flattened PDF
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  Ultra-crisp 2x pixel-perfect raster export
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
