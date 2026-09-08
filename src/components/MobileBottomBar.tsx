import React, { useState } from 'react';
import {
  Layers,
  MousePointer,
  Type,
  Square,
  Circle,
  Highlighter,
  PenTool,
  Hand,
  PenLine,
  Sliders,
  Trash2,
  Copy,
  Bold,
  Undo2,
  Redo2,
  ChevronUp,
  X,
  Palette,
  ArrowUpToLine,
  Sparkles,
  ScanText,
  Image as ImageIcon,
} from 'lucide-react';
import { ActiveObjectProperties, ToolMode } from '../types';

interface MobileBottomBarProps {
  activeTool: ToolMode;
  onToolSelect: (tool: ToolMode) => void;
  activeObject: ActiveObjectProperties | null;
  onOpenPagesDrawer: () => void;
  onOpenFormatDrawer: () => void;
  onOpenSignatureModal: () => void;
  onAddText: (type: 'title' | 'body') => void;
  onAddShape: (type: 'rect' | 'circle' | 'highlight') => void;
  onUpdateActiveObject: (updates: Partial<ActiveObjectProperties>) => void;
  onDeleteActiveObject: () => void;
  onDuplicateActiveObject: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDeselect: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentPage: number;
  totalPages: number;
  onOpenAiFontModal?: () => void;
  onRunOcr?: () => void;
  isOcrRunning?: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTool,
  onToolSelect,
  activeObject,
  onOpenPagesDrawer,
  onOpenFormatDrawer,
  onOpenSignatureModal,
  onAddText,
  onAddShape,
  onUpdateActiveObject,
  onDeleteActiveObject,
  onDuplicateActiveObject,
  onBringForward,
  onSendBackward,
  onDeselect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentPage,
  totalPages,
  onOpenAiFontModal,
  onRunOcr,
  isOcrRunning = false,
}) => {
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isText =
    activeObject?.type === 'textbox' ||
    activeObject?.type === 'i-text' ||
    activeObject?.type === 'text';

  const colorSwatches = ['#000000', '#ffffff', '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div
      id="mobile-bottom-bar-wrapper"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-none select-none pb-[env(safe-area-inset-bottom,0px)]"
    >
      {/* 1. Floating Quick-Format Bar (shown when an object is selected) */}
      {activeObject && (
        <div className="pointer-events-auto mx-2 mb-2 bg-[#161618]/95 backdrop-blur-md border border-blue-500/40 rounded-xl p-1.5 shadow-2xl flex items-center justify-between gap-1 overflow-x-auto touch-scroll animate-in fade-in slide-in-from-bottom-2">
          {/* Object Type Badge */}
          <div className="flex items-center gap-1.5 pl-2 pr-1 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">
              {activeObject.type || 'Object'}
            </span>
          </div>

          {/* Quick Controls according to type */}
          <div className="flex items-center gap-1 shrink-0">
            {isText ? (
              <>
                {/* Font Size controls */}
                <div className="flex items-center bg-[#1C1C1E] border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActiveObject({
                        fontSize: Math.max(8, (activeObject.fontSize || 16) - 2),
                      })
                    }
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold text-white/70 active:bg-white/10 rounded"
                    title="Decrease font size"
                  >
                    -
                  </button>
                  <span className="px-1.5 text-[11px] font-mono font-semibold text-white/90">
                    {Math.round(activeObject.fontSize || 16)}pt
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActiveObject({
                        fontSize: Math.min(120, (activeObject.fontSize || 16) + 2),
                      })
                    }
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold text-white/70 active:bg-white/10 rounded"
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>

                {/* Bold Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActiveObject({
                      fontWeight:
                        activeObject.fontWeight === 'bold' || activeObject.fontWeight === '700'
                          ? 'normal'
                          : 'bold',
                    })
                  }
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition ${
                    activeObject.fontWeight === 'bold' || activeObject.fontWeight === '700'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-[#1C1C1E] text-white/70 border-white/10'
                  }`}
                  title="Toggle Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Duplicate */}
                <button
                  type="button"
                  onClick={onDuplicateActiveObject}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1C1C1E] border border-white/10 text-white/70 active:bg-white/10"
                  title="Duplicate Object"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Bring Forward */}
                <button
                  type="button"
                  onClick={onBringForward}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1C1C1E] border border-white/10 text-white/70 active:bg-white/10"
                  title="Bring Forward"
                >
                  <ArrowUpToLine className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Color Swatch Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorMenu(!showColorMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1C1C1E] border border-white/10 text-white/80 active:bg-white/10"
                title="Change Color"
              >
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                  style={{ backgroundColor: activeObject.fill || '#ffffff' }}
                />
              </button>

              {showColorMenu && (
                <div
                  className="absolute bottom-full mb-2 right-0 bg-[#161618] border border-white/15 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {colorSwatches.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onUpdateActiveObject({ fill: c });
                        setShowColorMenu(false);
                      }}
                      className="w-7 h-7 rounded-full border border-white/20 shadow-xs active:scale-95 transition"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={typeof activeObject.fill === 'string' ? activeObject.fill : '#2563eb'}
                    onChange={(e) => onUpdateActiveObject({ fill: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    title="Custom Color"
                  />
                </div>
              )}
            </div>

            {/* Full Inspector Drawer Button */}
            <button
              id="btn-mobile-quick-format"
              type="button"
              onClick={onOpenFormatDrawer}
              className="px-2.5 h-8 flex items-center gap-1 rounded-lg bg-blue-600 active:bg-blue-500 text-white text-xs font-semibold shadow-xs"
              title="Open full inspector"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Format</span>
            </button>

            {/* Delete Object */}
            <button
              id="btn-mobile-quick-delete"
              type="button"
              onClick={onDeleteActiveObject}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/20 active:bg-red-600/40 border border-red-500/30 text-red-400"
              title="Delete Object"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Deselect */}
            <button
              type="button"
              onClick={onDeselect}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 active:text-white"
              title="Deselect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Popover Menus for Shapes & Text */}
      {showShapeMenu && (
        <div
          className="pointer-events-auto mx-4 mb-2 bg-[#161618] border border-white/15 rounded-xl p-2 shadow-2xl flex items-center justify-around gap-2 animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onAddShape('rect');
              setShowShapeMenu(false);
            }}
            className="flex-1 py-2 flex flex-col items-center gap-1 rounded-lg bg-[#1C1C1E] active:bg-white/10 text-white text-xs"
          >
            <Square className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-white/70">Rectangle</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddShape('circle');
              setShowShapeMenu(false);
            }}
            className="flex-1 py-2 flex flex-col items-center gap-1 rounded-lg bg-[#1C1C1E] active:bg-white/10 text-white text-xs"
          >
            <Circle className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-white/70">Circle</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddShape('highlight');
              setShowShapeMenu(false);
            }}
            className="flex-1 py-2 flex flex-col items-center gap-1 rounded-lg bg-[#1C1C1E] active:bg-white/10 text-white text-xs"
          >
            <Highlighter className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-white/70">Highlight</span>
          </button>
        </div>
      )}

      {showTextMenu && (
        <div
          className="pointer-events-auto mx-4 mb-2 bg-[#161618] border border-white/15 rounded-xl p-2 shadow-2xl flex items-center justify-around gap-2 animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onAddText('title');
              setShowTextMenu(false);
            }}
            className="flex-1 py-2.5 flex flex-col items-center gap-1 rounded-lg bg-[#1C1C1E] active:bg-white/10 text-white text-xs"
          >
            <Type className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-white">Heading</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddText('body');
              setShowTextMenu(false);
            }}
            className="flex-1 py-2.5 flex flex-col items-center gap-1 rounded-lg bg-[#1C1C1E] active:bg-white/10 text-white text-xs"
          >
            <Type className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-white/80">Paragraph</span>
          </button>
        </div>
      )}

      {/* 3. Main Bottom Dock */}
      <nav
        id="mobile-bottom-dock"
        className="pointer-events-auto bg-[#161618] border-t border-white/10 px-2 py-1.5 flex items-center justify-between gap-1 shadow-2xl"
      >
        {/* Pages Drawer Trigger */}
        <button
          id="mobile-nav-pages"
          type="button"
          onClick={onOpenPagesDrawer}
          className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white/60 active:text-white active:bg-white/5 rounded-lg transition"
          title="Pages & Thumbnails"
        >
          <div className="relative">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="absolute -top-1.5 -right-3 text-[8px] bg-blue-600 text-white font-mono px-1 rounded-full">
              {currentPage}/{totalPages}
            </span>
          </div>
          <span className="text-[9px] font-medium tracking-tight">Pages</span>
        </button>

        {/* Select Tool */}
        <button
          id="mobile-tool-select"
          type="button"
          onClick={() => {
            onToolSelect('select');
            setShowShapeMenu(false);
            setShowTextMenu(false);
          }}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            activeTool === 'select'
              ? 'text-blue-400 bg-blue-600/10 font-bold'
              : 'text-white/60 active:text-white active:bg-white/5'
          }`}
          title="Select Tool"
        >
          <MousePointer className="w-4 h-4" />
          <span className="text-[9px]">Select</span>
        </button>

        {/* Text Tool */}
        <button
          id="mobile-tool-text"
          type="button"
          onClick={() => {
            setShowTextMenu(!showTextMenu);
            setShowShapeMenu(false);
          }}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            showTextMenu || activeTool === 'text'
              ? 'text-blue-400 bg-blue-600/10 font-bold'
              : 'text-white/60 active:text-white active:bg-white/5'
          }`}
          title="Add Text"
        >
          <Type className="w-4 h-4" />
          <span className="text-[9px]">Text</span>
        </button>

        {/* Shapes Menu */}
        <button
          id="mobile-tool-shapes"
          type="button"
          onClick={() => {
            setShowShapeMenu(!showShapeMenu);
            setShowTextMenu(false);
          }}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            showShapeMenu
              ? 'text-blue-400 bg-blue-600/10 font-bold'
              : 'text-white/60 active:text-white active:bg-white/5'
          }`}
          title="Shapes & Highlights"
        >
          <Square className="w-4 h-4" />
          <span className="text-[9px]">Shapes</span>
        </button>

        {/* Draw / Pen Tool */}
        <button
          id="mobile-tool-draw"
          type="button"
          onClick={() => {
            onToolSelect(activeTool === 'draw' ? 'select' : 'draw');
            setShowShapeMenu(false);
            setShowTextMenu(false);
          }}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            activeTool === 'draw'
              ? 'text-emerald-400 bg-emerald-600/20 font-bold ring-1 ring-emerald-500/40'
              : 'text-white/60 active:text-white active:bg-white/5'
          }`}
          title="Pen / Draw Tool"
        >
          <PenTool className="w-4 h-4" />
          <span className="text-[9px]">Draw</span>
        </button>

        {/* Pan / Hand Tool */}
        <button
          id="mobile-tool-pan"
          type="button"
          onClick={() => {
            onToolSelect(activeTool === 'pan' ? 'select' : 'pan');
            setShowShapeMenu(false);
            setShowTextMenu(false);
          }}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            activeTool === 'pan'
              ? 'text-amber-400 bg-amber-600/20 font-bold ring-1 ring-amber-500/40'
              : 'text-white/60 active:text-white active:bg-white/5'
          }`}
          title="Pan & Scroll"
        >
          <Hand className="w-4 h-4" />
          <span className="text-[9px]">Pan</span>
        </button>

        {/* Signature Pad */}
        <button
          id="mobile-tool-signature"
          type="button"
          onClick={onOpenSignatureModal}
          className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white/60 active:text-white active:bg-white/5 rounded-lg transition"
          title="Insert Signature"
        >
          <PenLine className="w-4 h-4 text-purple-400" />
          <span className="text-[9px]">Sign</span>
        </button>

        {/* Format Inspector Drawer Button */}
        <button
          id="mobile-nav-format"
          type="button"
          onClick={onOpenFormatDrawer}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition ${
            activeObject
              ? 'text-blue-400 bg-blue-600/10 font-bold'
              : 'text-white/40 active:text-white active:bg-white/5'
          }`}
          title="Object Inspector / Formatting"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[9px]">Format</span>
        </button>
      </nav>
    </div>
  );
};
