import React, { useState } from 'react';
import {
  Sliders,
  Copy,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Sparkles,
  Check,
  ScanText,
  Eraser,
  Stamp,
  Layers,
  Wand2,
} from 'lucide-react';
import { ActiveObjectProperties } from '../types';
import { CURATED_FONT_OPTIONS, loadGoogleFont } from '../utils/fontManager';

interface RightSidebarProps {
  activeObject: ActiveObjectProperties | null;
  onUpdateActiveObject: (updates: Partial<ActiveObjectProperties>) => void;
  onDeleteActiveObject: () => void;
  onDuplicateActiveObject: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onInpaintBackground?: () => Promise<void> | void;
  onExtractStrokeContour?: () => Promise<void> | void;
  onReconstructRegionAI?: () => Promise<void> | void;
  isInpaintingLoading?: boolean;
  isReconstructingAI?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeObject,
  onUpdateActiveObject,
  onDeleteActiveObject,
  onDuplicateActiveObject,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onInpaintBackground,
  onExtractStrokeContour,
  onReconstructRegionAI,
  isInpaintingLoading = false,
  isReconstructingAI = false,
}) => {
  const [inpaintingDone, setInpaintingDone] = useState(false);

  const colorSwatches = [
    '#000000',
    '#2563eb',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ffffff',
  ];

  const inpaintSwatches = [
    '#ffffff',
    '#FAF7F2',
    '#fbfbfa',
    '#f1f5f9',
    '#f8fafc',
    '#1e293b',
  ];

  const isText =
    activeObject?.type === 'textbox' ||
    activeObject?.type === 'i-text' ||
    activeObject?.type === 'text';

  const isShape =
    activeObject?.type === 'rect' ||
    activeObject?.type === 'circle';

  const handleFontChange = async (fontValue: string) => {
    await loadGoogleFont(fontValue);
    onUpdateActiveObject({ fontFamily: fontValue });
  };

  const handleTriggerInpaint = async () => {
    if (!onInpaintBackground) return;
    await onInpaintBackground();
    setInpaintingDone(true);
    setTimeout(() => setInpaintingDone(false), 3000);
  };

  return (
    <aside
      id="right-inspector-sidebar"
      className="hidden xl:flex flex-col w-72 border-l border-white/10 bg-[#161618] shrink-0 h-full select-none z-20 text-[#E0E0E0] overflow-y-auto"
    >
      {!activeObject ? (
        // Empty state when no object is selected
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-white/40">
          <div className="w-10 h-10 rounded-lg bg-[#1C1C1E] border border-white/5 flex items-center justify-center mb-3 text-white/30">
            <Sliders className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
            Inspector Idle
          </h4>
          <p className="text-[11px] text-white/40 mt-1 max-w-[180px]">
            Click any text block, shape, or annotation to configure typography and metrics.
          </p>

          <div className="mt-8 w-full border-t border-white/10 pt-4 text-left space-y-2">
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
              Standard Shortcuts
            </div>
            <div className="text-[10px] text-white/50 flex justify-between font-mono">
              <span>Undo / Redo</span>
              <span>Ctrl+Z / Y</span>
            </div>
            <div className="text-[10px] text-white/50 flex justify-between font-mono">
              <span>Delete Object</span>
              <span>Del / Backspace</span>
            </div>
            <div className="text-[10px] text-white/50 flex justify-between font-mono">
              <span>Pinch Zoom</span>
              <span>2-Fingers</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-white/10">
          {/* Object Header & Quick Actions */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 font-mono">
                {activeObject.type}
              </span>
              {activeObject.isOcr && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                  <ScanText className="w-2.5 h-2.5" />
                  OCR Text
                </span>
              )}
              {activeObject.pageNumber && (
                <span className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  Page {activeObject.pageNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDuplicateActiveObject}
                className="p-1 rounded hover:bg-white/5 text-white/60 hover:text-white transition"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onDeleteActiveObject}
                className="p-1 rounded hover:bg-white/5 text-red-400 hover:text-red-300 transition"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* OCR Extracted Text Card (if isOcr) */}
          {isText && activeObject.isOcr && (
            <div className="p-4 bg-emerald-950/30 border-b border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <ScanText className="w-3.5 h-3.5" />
                  <span>Interactive OCR Text</span>
                </div>
                {activeObject.ocrConfidence !== undefined && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {Math.round(activeObject.ocrConfidence)}% Conf
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/70 leading-relaxed">
                Reconstructed from flattened raster PDF scan. Fully editable inline with real-time typography synthesis and texture inpainting.
              </p>
            </div>
          )}

          {/* Background Separation & Clean Inpainting Section */}
          {isText && (
            <div className="p-4 bg-[#1a1c23] border-b border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Background Inpainting</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                  {activeObject.inpaintFillType === 'texture' ? 'Paper Texture' : 'Solid Tone'}
                </span>
              </div>

              <p className="text-[10px] text-white/60 leading-relaxed">
                Isolates text and samples surrounding paper texture to seamlessly cover flat raster text without blurring adjacent lines.
              </p>

              {/* Sampled Paper Background Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-white/60 font-medium">Inpaint Fill Color</span>
                  <span className="text-[10px] font-mono text-white/70">
                    {activeObject.inpaintColor || '#ffffff'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {inpaintSwatches.map((color) => {
                    const isSelected = (activeObject.inpaintColor || '#ffffff').toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onUpdateActiveObject({ inpaintColor: color })}
                        className={`w-5 h-5 rounded border transition-transform ${
                          isSelected
                            ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#161618] scale-110 border-white'
                            : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`Fill: ${color}`}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={activeObject.inpaintColor?.startsWith('#') ? activeObject.inpaintColor : '#ffffff'}
                    onChange={(e) => onUpdateActiveObject({ inpaintColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent"
                    title="Custom Inpainting Color"
                  />
                </div>
              </div>

              {/* Clean Raster Under-Text Inpainting Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTriggerInpaint}
                  disabled={isInpaintingLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition disabled:opacity-50 shadow-xs"
                >
                  {isInpaintingLoading ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      Inpainting Canvas Background...
                    </span>
                  ) : inpaintingDone || activeObject.isInpainted ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      Original Text Inpainted Cleanly
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Eraser className="w-3.5 h-3.5" />
                      Inpaint Background Under Text
                    </span>
                  )}
                </button>
              </div>

              {/* AI Document Reconstruction trigger */}
              {onReconstructRegionAI && (
                <button
                  type="button"
                  onClick={() => onReconstructRegionAI()}
                  disabled={isReconstructingAI}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-medium transition disabled:opacity-50"
                >
                  {isReconstructingAI ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      AI Reconstruction in Progress...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                      Reconstruct Region (AI Pipeline)
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* AI Font Identification Inspector Card (if text) */}
          {isText && (activeObject.aiMatchedFont || activeObject.rawFontName) && (
            <div className="p-4 bg-blue-950/30 border-b border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Font Identification</span>
                </div>
                {activeObject.aiConfidence && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-bold border border-green-500/30">
                    {Math.round(activeObject.aiConfidence * 100)}% Match
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{activeObject.aiMatchedFont || 'Typeface Detected'}</span>
                  <span className="text-[10px] text-white/40 font-normal">
                    (applied to field)
                  </span>
                </div>
                {activeObject.rawFontName && (
                  <div className="text-[10px] text-white/50 font-mono truncate" title={activeObject.rawFontName}>
                    Source: {activeObject.rawFontName}
                  </div>
                )}
                {activeObject.aiMatchReason && (
                  <div className="text-[10px] text-white/70 leading-relaxed pt-1">
                    {activeObject.aiMatchReason}
                  </div>
                )}
              </div>

              {/* Alternative Near-Identical Typefaces */}
              {activeObject.substitutes && activeObject.substitutes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                    Near-Identical Typefaces:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeObject.substitutes.map((sub, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleFontChange(sub)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-blue-600 hover:text-white text-white/80 text-[10px] font-medium transition border border-white/10"
                        title={`Switch to ${sub}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Typography Section (if text) */}
          {isText && (
            <div className="p-4 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Typography
              </h3>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-white/60 font-medium">Font Family</label>
                <select
                  value={activeObject.fontFamily || 'Helvetica, Arial, sans-serif'}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  <optgroup label="AI & Curated Web Fonts" className="bg-[#161618] text-blue-400 font-bold">
                    {CURATED_FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value} className="bg-[#1C1C1E] text-white">
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] uppercase text-white/60 font-medium">Size</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    step={0.1}
                    value={activeObject.fontSize !== undefined ? Number(activeObject.fontSize.toFixed(2)) : 14}
                    onChange={(e) => onUpdateActiveObject({ fontSize: Number(e.target.value) })}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] uppercase text-white/60 font-medium">Weight</label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActiveObject({
                        fontWeight:
                          activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                            ? 'normal'
                            : 'bold',
                      })
                    }
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded px-2.5 py-1.5 text-xs text-left text-white/80 hover:bg-white/5 transition flex justify-between items-center"
                  >
                    <span>
                      {activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                        ? 'Bold (700)'
                        : 'Regular (400)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#1C1C1E] border border-white/10 rounded">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActiveObject({
                      fontWeight:
                        activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                          ? 'normal'
                          : 'bold',
                    })
                  }
                  className={`py-1 flex justify-center rounded text-xs transition ${
                    activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                      ? 'bg-white/15 text-white font-bold'
                      : 'hover:bg-white/5 text-white/60'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActiveObject({
                      fontStyle: activeObject.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  className={`py-1 flex justify-center rounded text-xs transition ${
                    activeObject.fontStyle === 'italic'
                      ? 'bg-white/15 text-white font-bold'
                      : 'hover:bg-white/5 text-white/60'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActiveObject({
                      underline: !activeObject.underline,
                    })
                  }
                  className={`py-1 flex justify-center rounded text-xs transition ${
                    activeObject.underline
                      ? 'bg-white/15 text-white font-bold'
                      : 'hover:bg-white/5 text-white/60'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextAlign =
                      activeObject.textAlign === 'left'
                        ? 'center'
                        : activeObject.textAlign === 'center'
                        ? 'right'
                        : 'left';
                    onUpdateActiveObject({ textAlign: nextAlign });
                  }}
                  className="py-1 flex justify-center rounded text-xs hover:bg-white/5 text-white/60 transition"
                  title="Align"
                >
                  {activeObject.textAlign === 'center' ? (
                    <AlignCenter className="w-3.5 h-3.5 text-blue-400" />
                  ) : activeObject.textAlign === 'right' ? (
                    <AlignRight className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </button>
              </div>

              {/* Letter Spacing & Line Height Precision Sliders */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-white/60 font-medium">Tracking</span>
                    <span className="text-[10px] font-mono text-blue-400">
                      {(activeObject.letterSpacing ?? 0).toFixed(1)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="6"
                    step="0.2"
                    value={activeObject.letterSpacing ?? 0}
                    onChange={(e) =>
                      onUpdateActiveObject({
                        letterSpacing: Number(e.target.value),
                        charSpacing: Math.round(Number(e.target.value) * 50),
                      })
                    }
                    className="w-full accent-blue-600 bg-[#1C1C1E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    title="Letter Spacing / Tracking"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-white/60 font-medium">Leading</span>
                    <span className="text-[10px] font-mono text-blue-400">
                      {(activeObject.lineHeight ?? 1.15).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={activeObject.lineHeight ?? 1.15}
                    onChange={(e) =>
                      onUpdateActiveObject({
                        lineHeight: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600 bg-[#1C1C1E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    title="Line Height / Leading"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stroke & Contour Extraction Section (for Signatures, Stamps, Seals) */}
          {onExtractStrokeContour && (
            <div className="p-4 bg-[#181920] border-b border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
                  <Stamp className="w-3.5 h-3.5" />
                  <span>Stroke & Contour Extraction</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Vector-Ready
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                Applies adaptive luminance thresholding to isolate handwritten signatures, stamps, or marks with full background transparency.
              </p>
              <button
                type="button"
                onClick={() => onExtractStrokeContour()}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
              >
                <Stamp className="w-3.5 h-3.5" />
                Extract Transparent Signature / Stamp
              </button>
            </div>
          )}

          {/* Color & Style Section */}
          <div className="p-4 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Color & Style
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-white/60 font-medium">
                {isText ? 'Text Color' : 'Fill Color'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {colorSwatches.map((color) => {
                  const isSelected = activeObject.fill === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onUpdateActiveObject({ fill: color })}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        isSelected
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#161618] scale-110'
                          : 'border border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
                <input
                  type="color"
                  value={
                    typeof activeObject.fill === 'string' && activeObject.fill.startsWith('#')
                      ? activeObject.fill
                      : '#ffffff'
                  }
                  onChange={(e) => onUpdateActiveObject({ fill: e.target.value })}
                  className="w-6 h-6 rounded-full bg-transparent cursor-pointer border border-white/20"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase text-white/60 font-medium">Opacity</span>
                <span className="text-xs font-mono text-blue-400">
                  {Math.round((activeObject.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={activeObject.opacity ?? 1}
                onChange={(e) => onUpdateActiveObject({ opacity: Number(e.target.value) })}
                className="w-full accent-blue-600 bg-[#1C1C1E] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Shape Border controls */}
            {isShape && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-white/60 font-medium">Stroke Width</span>
                  <span className="text-xs font-mono text-white/80">{activeObject.strokeWidth ?? 1}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={activeObject.strokeWidth ?? 1}
                  onChange={(e) => onUpdateActiveObject({ strokeWidth: Number(e.target.value) })}
                  className="w-full accent-blue-600 bg-[#1C1C1E] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Position & Coordinates Section */}
          <div className="p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Position & Geometry
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#1C1C1E] border border-white/10 p-2 rounded">
                <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1">X-Pos</div>
                <div className="text-xs font-mono text-white">
                  {(activeObject.left ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-[#1C1C1E] border border-white/10 p-2 rounded">
                <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Y-Pos</div>
                <div className="text-xs font-mono text-white">
                  {(activeObject.top ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-[#1C1C1E] border border-white/10 p-2 rounded">
                <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Width</div>
                <div className="text-xs font-mono text-white">
                  {(activeObject.width ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-[#1C1C1E] border border-white/10 p-2 rounded">
                <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Angle</div>
                <div className="text-xs font-mono text-white">
                  {Math.round(activeObject.angle ?? 0)}°
                </div>
              </div>
            </div>
          </div>

          {/* Layer Arrangement */}
          <div className="p-4 space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Layer Hierarchy
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onBringForward}
                className="flex items-center justify-center gap-1.5 p-1.5 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 rounded text-xs text-white/80 transition"
              >
                <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Forward</span>
              </button>
              <button
                type="button"
                onClick={onSendBackward}
                className="flex items-center justify-center gap-1.5 p-1.5 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 rounded text-xs text-white/80 transition"
              >
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Backward</span>
              </button>
              <button
                type="button"
                onClick={onBringToFront}
                className="flex items-center justify-center gap-1.5 p-1.5 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 rounded text-xs text-white/80 transition"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">To Front</span>
              </button>
              <button
                type="button"
                onClick={onSendToBack}
                className="flex items-center justify-center gap-1.5 p-1.5 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 rounded text-xs text-white/80 transition"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">To Back</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
