import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Type,
  Square,
  Circle,
  Highlighter,
  PenTool,
  Image as ImageIcon,
  PenLine,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Sliders,
  X,
} from 'lucide-react';
import { ActiveObjectProperties, PDFPageInfo } from '../types';

interface SidebarProps {
  pages: PDFPageInfo[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  onAddBlankPage: () => void;
  onDeletePage: (pageNumber: number) => void;
  // Insert actions
  onAddText: (type: 'title' | 'body') => void;
  onAddShape: (type: 'rect' | 'circle' | 'highlight') => void;
  onOpenSignatureModal: () => void;
  onUploadImage: (file: File) => void;
  // Active Object Formatting
  activeObject: ActiveObjectProperties | null;
  onUpdateActiveObject: (updates: Partial<ActiveObjectProperties>) => void;
  onDeleteActiveObject: () => void;
  onDuplicateActiveObject: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  currentPage,
  onSelectPage,
  onAddBlankPage,
  onDeletePage,
  onAddText,
  onAddShape,
  onOpenSignatureModal,
  onUploadImage,
  activeObject,
  onUpdateActiveObject,
  onDeleteActiveObject,
  onDuplicateActiveObject,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'insert' | 'pages'>('insert');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Auto-switch to style tab when an object is selected
  React.useEffect(() => {
    if (activeObject) {
      setActiveTab('style');
    }
  }, [activeObject]);

  const fontOptions = [
    { label: 'Helvetica / Sans-Serif', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman / Serif', value: 'Times New Roman, serif' },
    { label: 'Courier / Monospace', value: 'Courier, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  ];

  const colorSwatches = [
    '#000000',
    '#1e293b',
    '#2563eb',
    '#059669',
    '#dc2626',
    '#d97706',
    '#7c3aed',
    '#ffffff',
  ];

  const isText =
    activeObject?.type === 'textbox' ||
    activeObject?.type === 'i-text' ||
    activeObject?.type === 'text';

  const isShape =
    activeObject?.type === 'rect' ||
    activeObject?.type === 'circle';

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-col w-72 lg:w-80 bg-[#161618] border-r border-white/10 shrink-0 h-full select-none z-20 text-[#E0E0E0]"
      >
        {/* Sidebar Nav Tabs */}
        <div className="flex border-b border-white/10 bg-[#1C1C1E] p-1 gap-1">
          <button
            id="tab-btn-style"
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition ${
              activeTab === 'style'
                ? 'bg-white/10 text-white font-bold shadow-xs'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Format</span>
            {activeObject && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
          <button
            id="tab-btn-insert"
            type="button"
            onClick={() => setActiveTab('insert')}
            className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition ${
              activeTab === 'insert'
                ? 'bg-white/10 text-white font-bold shadow-xs'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert</span>
          </button>
          <button
            id="tab-btn-pages"
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition ${
              activeTab === 'pages'
                ? 'bg-white/10 text-white font-bold shadow-xs'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pages ({pages.length})</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* FORMAT / STYLE TAB */}
          {activeTab === 'style' && (
            <div className="space-y-5">
              {!activeObject ? (
                <div className="text-center py-12 px-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1C1C1E] border border-white/5 text-white/30 flex items-center justify-center mx-auto mb-3">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    No element selected
                  </h4>
                  <p className="text-[11px] text-white/40 mt-1 max-w-[200px] mx-auto">
                    Click any text block, shape, or image on the canvas to customize fonts, colors, and layers.
                  </p>
                </div>
              ) : (
                <>
                  {/* Object Type Badge & Quick Actions */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-600/20 text-blue-400 font-mono">
                      {activeObject.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-duplicate-obj"
                        type="button"
                        onClick={onDuplicateActiveObject}
                        className="p-1.5 text-white/60 hover:text-white rounded hover:bg-white/5"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id="btn-delete-obj"
                        type="button"
                        onClick={onDeleteActiveObject}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40"
                        title="Delete (Del)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* TEXT FORMATTING CONTROLS */}
                  {isText && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                          Font Family
                        </label>
                        <select
                          id="select-font-family"
                          value={activeObject.fontFamily || 'Helvetica, Arial, sans-serif'}
                          onChange={(e) => onUpdateActiveObject({ fontFamily: e.target.value })}
                          className="w-full text-xs px-2.5 py-2 rounded border border-white/10 bg-[#1C1C1E] text-white focus:outline-hidden focus:border-blue-500"
                        >
                          {fontOptions.map((f) => (
                            <option key={f.value} value={f.value} className="bg-[#1C1C1E] text-white">
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Size & Weight */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                            Font Size
                          </label>
                          <div className="flex items-center">
                            <input
                              id="input-font-size"
                              type="number"
                              min={1}
                              max={200}
                              step={0.1}
                              value={activeObject.fontSize !== undefined ? Number(activeObject.fontSize.toFixed(2)) : 14}
                              onChange={(e) =>
                                onUpdateActiveObject({ fontSize: Number(e.target.value) })
                              }
                              className="w-full text-xs font-mono px-2.5 py-2 rounded border border-white/10 bg-[#1C1C1E] text-white focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                            Styling
                          </label>
                          <div className="flex rounded border border-white/10 bg-[#1C1C1E] overflow-hidden">
                            <button
                              id="btn-style-bold"
                              type="button"
                              onClick={() =>
                                onUpdateActiveObject({
                                  fontWeight:
                                    activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                                      ? 'normal'
                                      : 'bold',
                                })
                              }
                              className={`flex-1 py-1.5 flex items-center justify-center transition ${
                                activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700
                                  ? 'bg-white/15 text-white font-bold'
                                  : 'text-white/60 hover:bg-white/5'
                              }`}
                              title="Bold"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id="btn-style-italic"
                              type="button"
                              onClick={() =>
                                onUpdateActiveObject({
                                  fontStyle:
                                    activeObject.fontStyle === 'italic' ? 'normal' : 'italic',
                                })
                              }
                              className={`flex-1 py-1.5 flex items-center justify-center border-l border-white/10 transition ${
                                activeObject.fontStyle === 'italic'
                                  ? 'bg-white/15 text-white font-bold'
                                  : 'text-white/60 hover:bg-white/5'
                              }`}
                              title="Italic"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id="btn-style-underline"
                              type="button"
                              onClick={() =>
                                onUpdateActiveObject({
                                  underline: !activeObject.underline,
                                })
                              }
                              className={`flex-1 py-1.5 flex items-center justify-center border-l border-white/10 transition ${
                                activeObject.underline
                                  ? 'bg-white/15 text-white font-bold'
                                  : 'text-white/60 hover:bg-white/5'
                              }`}
                              title="Underline"
                            >
                              <Underline className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                          Alignment
                        </label>
                        <div className="flex rounded border border-white/10 bg-[#1C1C1E] overflow-hidden">
                          {(['left', 'center', 'right', 'justify'] as const).map((align, idx) => {
                            const Icon =
                              align === 'left'
                                ? AlignLeft
                                : align === 'center'
                                ? AlignCenter
                                : align === 'right'
                                ? AlignRight
                                : AlignJustify;
                            return (
                              <button
                                key={align}
                                id={`btn-align-${align}`}
                                type="button"
                                onClick={() => onUpdateActiveObject({ textAlign: align })}
                                className={`flex-1 py-1.5 flex items-center justify-center ${
                                  idx > 0 ? 'border-l border-white/10' : ''
                                } ${
                                  activeObject.textAlign === align
                                    ? 'bg-white/15 text-blue-400 font-bold'
                                    : 'text-white/60 hover:bg-white/5'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                            Text Color
                          </label>
                          <input
                            type="color"
                            value={
                              typeof activeObject.fill === 'string' && activeObject.fill.startsWith('#')
                                ? activeObject.fill
                                : '#ffffff'
                            }
                            onChange={(e) => onUpdateActiveObject({ fill: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer border border-white/20 p-0 bg-transparent"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {colorSwatches.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => onUpdateActiveObject({ fill: color })}
                              className={`w-6 h-6 rounded-full border transition ${
                                activeObject.fill === color
                                  ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#161618] scale-110'
                                  : 'border-white/20 hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SHAPE & OBJECT CONTROLS */}
                  {isShape && (
                    <div className="space-y-4">
                      {/* Fill Color */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Fill Color
                          </label>
                          <input
                            type="color"
                            value={
                              typeof activeObject.fill === 'string' && activeObject.fill.startsWith('#')
                                ? activeObject.fill
                                : '#3b82f6'
                            }
                            onChange={(e) => onUpdateActiveObject({ fill: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['transparent', ...colorSwatches.slice(1)].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => onUpdateActiveObject({ fill: color })}
                              className={`w-6 h-6 rounded-md border text-[9px] flex items-center justify-center transition ${
                                activeObject.fill === color
                                  ? 'border-blue-600 ring-2 ring-blue-300 scale-110'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                              style={{ backgroundColor: color === 'transparent' ? '#f8fafc' : color }}
                            >
                              {color === 'transparent' ? 'None' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stroke Color */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Border Stroke
                          </label>
                          <input
                            type="color"
                            value={
                              typeof activeObject.stroke === 'string' && activeObject.stroke.startsWith('#')
                                ? activeObject.stroke
                                : '#1e293b'
                            }
                            onChange={(e) => onUpdateActiveObject({ stroke: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {colorSwatches.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => onUpdateActiveObject({ stroke: color })}
                              className={`w-6 h-6 rounded-md border transition ${
                                activeObject.stroke === color
                                  ? 'border-blue-600 ring-2 ring-blue-300 scale-110'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Stroke Width */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Stroke Width
                          </label>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {activeObject.strokeWidth || 0}px
                          </span>
                        </div>
                        <input
                          id="range-stroke-width"
                          type="range"
                          min={0}
                          max={16}
                          value={activeObject.strokeWidth || 0}
                          onChange={(e) =>
                            onUpdateActiveObject({ strokeWidth: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* OPACITY SLIDER */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Opacity
                      </label>
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {Math.round((activeObject.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      id="range-opacity"
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={activeObject.opacity ?? 1}
                      onChange={(e) =>
                        onUpdateActiveObject({ opacity: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* LAYER ORDERING */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Layer Order
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        id="btn-bring-front"
                        type="button"
                        onClick={onBringToFront}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1"
                        title="Bring to Front"
                      >
                        <ArrowUpToLine className="w-3.5 h-3.5" />
                        <span className="text-[9px]">Front</span>
                      </button>
                      <button
                        id="btn-bring-forward"
                        type="button"
                        onClick={onBringForward}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1"
                        title="Bring Forward"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span className="text-[9px]">Forward</span>
                      </button>
                      <button
                        id="btn-send-backward"
                        type="button"
                        onClick={onSendBackward}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1"
                        title="Send Backward"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span className="text-[9px]">Backward</span>
                      </button>
                      <button
                        id="btn-send-back"
                        type="button"
                        onClick={onSendToBack}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1"
                        title="Send to Back"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span className="text-[9px]">Back</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* INSERT TOOLS TAB */}
          {activeTab === 'insert' && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Add Text
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-add-heading"
                    type="button"
                    onClick={() => onAddText('title')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition"
                  >
                    <Type className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Heading
                    </p>
                    <p className="text-[10px] text-slate-400">Large bold text</p>
                  </button>
                  <button
                    id="btn-add-body-text"
                    type="button"
                    onClick={() => onAddText('body')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition"
                  >
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Paragraph
                    </p>
                    <p className="text-[10px] text-slate-400">Standard body block</p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Shapes & Annotations
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="btn-add-rect"
                    type="button"
                    onClick={() => onAddShape('rect')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col items-center gap-1.5 transition"
                  >
                    <Square className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Rectangle
                    </span>
                  </button>
                  <button
                    id="btn-add-circle"
                    type="button"
                    onClick={() => onAddShape('circle')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col items-center gap-1.5 transition"
                  >
                    <Circle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Circle
                    </span>
                  </button>
                  <button
                    id="btn-add-highlight"
                    type="button"
                    onClick={() => onAddShape('highlight')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex flex-col items-center gap-1.5 transition"
                  >
                    <Highlighter className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Highlight
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Signatures & Media
                </p>
                <div className="space-y-2">
                  <button
                    id="btn-open-signature-drawer"
                    type="button"
                    onClick={onOpenSignatureModal}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 flex items-center gap-3 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <PenLine className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Add Signature
                      </p>
                      <p className="text-[10px] text-slate-400">Draw or type your signature</p>
                    </div>
                  </button>

                  <label className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 flex items-center gap-3 cursor-pointer transition">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Upload Image / Stamp
                      </p>
                      <p className="text-[10px] text-slate-400">PNG, JPG or SVG watermark</p>
                    </div>
                    <input
                      id="input-upload-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onUploadImage(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* PAGES TAB */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Document Pages ({pages.length})
                </span>
                <button
                  id="btn-add-blank-page"
                  type="button"
                  onClick={onAddBlankPage}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Blank Page
                </button>
              </div>

              <div className="space-y-3">
                {pages.map((p) => {
                  const isCurrent = p.pageNumber === currentPage;
                  return (
                    <div
                      key={p.pageNumber}
                      onClick={() => onSelectPage(p.pageNumber)}
                      className={`group relative p-2 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      <div className="w-14 h-18 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={`Page ${p.pageNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          Page {p.pageNumber}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {p.width} × {p.height} pt
                        </p>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                          {p.textItems.length} text items
                        </span>
                      </div>

                      {pages.length > 1 && (
                        <button
                          id={`btn-delete-page-${p.pageNumber}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete Page ${p.pageNumber}?`)) {
                              onDeletePage(p.pageNumber);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================= MOBILE BOTTOM SHEET & TOUCH DOCK ================= */}
      <div className="md:hidden">
        {/* Sticky Touch Dock Bar */}
        <div
          id="mobile-touch-dock"
          className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around z-30 shadow-lg"
        >
          <button
            id="mobile-btn-format"
            type="button"
            onClick={() => {
              setActiveTab('style');
              setIsMobileSheetOpen(true);
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'style' && isMobileSheetOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span>Format</span>
          </button>
          <button
            id="mobile-btn-insert"
            type="button"
            onClick={() => {
              setActiveTab('insert');
              setIsMobileSheetOpen(true);
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'insert' && isMobileSheetOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Plus className="w-5 h-5 mb-0.5" />
            <span>Insert</span>
          </button>
          <button
            id="mobile-btn-pages"
            type="button"
            onClick={() => {
              setActiveTab('pages');
              setIsMobileSheetOpen(true);
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'pages' && isMobileSheetOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span>Pages</span>
          </button>
          {activeObject && (
            <button
              id="mobile-btn-delete"
              type="button"
              onClick={onDeleteActiveObject}
              className="flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium text-rose-500"
            >
              <Trash2 className="w-5 h-5 mb-0.5" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Sliding Bottom Sheet */}
        {isMobileSheetOpen && (
          <div
            id="mobile-bottom-sheet-backdrop"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
            onClick={() => setIsMobileSheetOpen(false)}
          >
            <div
              id="mobile-bottom-sheet-content"
              className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-2xl max-h-[75vh] flex flex-col border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden pb-16"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle & Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {activeTab}
                </div>
                <button
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Content mirrors activeTab */}
                {activeTab === 'insert' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onAddText('title');
                        setIsMobileSheetOpen(false);
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <Type className="w-5 h-5 text-blue-600 mb-1" />
                      <p className="text-xs font-semibold">Heading Text</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddText('body');
                        setIsMobileSheetOpen(false);
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <FileText className="w-5 h-5 text-slate-600 mb-1" />
                      <p className="text-xs font-semibold">Body Text</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddShape('rect');
                        setIsMobileSheetOpen(false);
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <Square className="w-5 h-5 text-slate-600 mb-1" />
                      <p className="text-xs font-semibold">Rectangle</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddShape('circle');
                        setIsMobileSheetOpen(false);
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <Circle className="w-5 h-5 text-slate-600 mb-1" />
                      <p className="text-xs font-semibold">Circle</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddShape('highlight');
                        setIsMobileSheetOpen(false);
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <Highlighter className="w-5 h-5 text-amber-500 mb-1" />
                      <p className="text-xs font-semibold">Highlight</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenSignatureModal();
                      }}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left"
                    >
                      <PenLine className="w-5 h-5 text-blue-600 mb-1" />
                      <p className="text-xs font-semibold">Signature</p>
                    </button>
                  </div>
                )}

                {activeTab === 'pages' && (
                  <div className="space-y-3">
                    {pages.map((p) => (
                      <div
                        key={p.pageNumber}
                        onClick={() => {
                          onSelectPage(p.pageNumber);
                          setIsMobileSheetOpen(false);
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          p.pageNumber === currentPage
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="w-10 h-14 bg-slate-100 dark:bg-slate-800 border rounded overflow-hidden">
                          {p.thumbnailUrl && (
                            <img
                              src={p.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold">Page {p.pageNumber}</p>
                          <p className="text-[10px] text-slate-400">
                            {p.textItems.length} text blocks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'style' && (
                  <div className="space-y-4">
                    {!activeObject ? (
                      <p className="text-xs text-center text-slate-400 py-6">
                        Select an element to edit properties
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold">
                            {activeObject.type.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteActiveObject();
                              setIsMobileSheetOpen(false);
                            }}
                            className="text-xs text-rose-500 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>

                        {isText && (
                          <>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500 w-16">Size</label>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                step={0.1}
                                value={activeObject.fontSize !== undefined ? Number(activeObject.fontSize.toFixed(2)) : 14}
                                onChange={(e) =>
                                  onUpdateActiveObject({ fontSize: Number(e.target.value) })
                                }
                                className="border rounded px-2 py-1 text-xs w-20"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500 w-16">Color</label>
                              <input
                                type="color"
                                value={
                                  typeof activeObject.fill === 'string' && activeObject.fill.startsWith('#')
                                    ? activeObject.fill
                                    : '#000000'
                                }
                                onChange={(e) => onUpdateActiveObject({ fill: e.target.value })}
                                className="w-7 h-7 rounded border-0"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
