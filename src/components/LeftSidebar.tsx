import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Type,
  Square,
  Circle,
  Highlighter,
  PenTool,
  Image as ImageIcon,
  PenLine,
  ScanText,
} from 'lucide-react';
import { PDFPageInfo } from '../types';

interface LeftSidebarProps {
  pages: PDFPageInfo[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  onAddBlankPage: () => void;
  onDeletePage: (pageNumber: number) => void;
  onAddText: (type: 'title' | 'body') => void;
  onAddShape: (type: 'rect' | 'circle' | 'highlight') => void;
  onOpenSignatureModal: () => void;
  onUploadImage: (file: File) => void;
  className?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  pages,
  currentPage,
  onSelectPage,
  onAddBlankPage,
  onDeletePage,
  onAddText,
  onAddShape,
  onOpenSignatureModal,
  onUploadImage,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'insert'>('pages');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <aside
      id="left-sidebar"
      className={`flex flex-col w-full md:w-56 lg:w-60 border-r border-white/10 bg-[#161618] shrink-0 h-full select-none z-20 text-[#E0E0E0] ${className}`}
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 shrink-0">
        <button
          id="btn-tab-pages"
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'pages'
              ? 'text-white border-b-2 border-blue-500 bg-white/5'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          Pages ({pages.length})
        </button>
        <button
          id="btn-tab-insert"
          type="button"
          onClick={() => setActiveTab('insert')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'insert'
              ? 'text-white border-b-2 border-blue-500 bg-white/5'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          Insert
        </button>
      </div>

      {/* Pages Content */}
      {activeTab === 'pages' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            {pages.map((page) => {
              const isCurrent = page.pageNumber === currentPage;
              return (
                <div
                  key={page.pageNumber}
                  id={`page-thumb-${page.pageNumber}`}
                  onClick={() => onSelectPage(page.pageNumber)}
                  className={`group cursor-pointer space-y-1.5 transition ${
                    isCurrent ? '' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`relative w-full aspect-[1/1.41] bg-white rounded overflow-hidden shadow-md transition-all ${
                      isCurrent
                        ? 'ring-2 ring-blue-500'
                        : 'border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {page.thumbnailUrl || page.bgDataUrl ? (
                      <img
                        src={page.thumbnailUrl || page.bgDataUrl}
                        alt={`Page ${page.pageNumber}`}
                        className="w-full h-full object-contain bg-white pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 p-2 text-[5px] text-gray-800 leading-tight flex flex-col justify-between bg-white">
                        <div>
                          <div className="font-bold mb-1">PAGE {page.pageNumber}</div>
                          <div className="h-1 w-full bg-gray-200 mb-0.5"></div>
                          <div className="h-1 w-2/3 bg-gray-200 mb-0.5"></div>
                        </div>
                        <div className="h-8 w-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[7px] text-gray-400">
                          Empty
                        </div>
                      </div>
                    )}
                    {(page.hasOcrProcessed || (page.ocrTextCount && page.ocrTextCount > 0)) && (
                      <div
                        className="absolute top-1 left-1 z-10 flex items-center gap-0.5 bg-emerald-600/90 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-xs font-mono"
                        title={`${page.ocrTextCount || 'OCR'} interactive text items`}
                      >
                        <ScanText className="w-2.5 h-2.5" />
                        <span>OCR</span>
                      </div>
                    )}
                    <div
                      className={`absolute bottom-1 right-2 text-[9px] font-bold font-mono px-1 rounded ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-black/60 text-white/80'
                      }`}
                    >
                      {page.pageNumber.toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-0.5">
                    <p
                      className={`text-[10px] font-medium truncate ${
                        isCurrent ? 'text-blue-400' : 'text-white/50'
                      }`}
                    >
                      Page {page.pageNumber}
                    </p>
                    {pages.length > 1 && isCurrent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete page ${page.pageNumber}?`)) {
                            onDeletePage(page.pageNumber);
                          }
                        }}
                        className="text-white/30 hover:text-red-400 p-0.5 transition"
                        title="Delete page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-white/10 shrink-0">
            <button
              id="btn-add-blank-page"
              type="button"
              onClick={onAddBlankPage}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 rounded text-xs text-white/80 font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Blank Page</span>
            </button>
          </div>
        </div>
      )}

      {/* Insert Tools Content */}
      {activeTab === 'insert' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Typography
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onAddText('title')}
                className="flex items-center gap-2 p-2 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-left transition"
              >
                <div className="p-1 rounded bg-blue-600/20 text-blue-400">
                  <Type className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Heading</div>
                  <div className="text-[9px] text-white/40">24px Bold display text</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onAddText('body')}
                className="flex items-center gap-2 p-2 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-left transition"
              >
                <div className="p-1 rounded bg-blue-600/20 text-blue-400">
                  <Type className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Paragraph</div>
                  <div className="text-[9px] text-white/40">13px standard body text</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Shapes & Markers
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onAddShape('rect')}
                className="flex flex-col items-center justify-center p-2.5 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-center transition"
                title="Add Rectangle"
              >
                <Square className="w-4 h-4 text-blue-400 mb-1" />
                <span className="text-[10px] text-white/70">Rect</span>
              </button>
              <button
                type="button"
                onClick={() => onAddShape('circle')}
                className="flex flex-col items-center justify-center p-2.5 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-center transition"
                title="Add Circle"
              >
                <Circle className="w-4 h-4 text-blue-400 mb-1" />
                <span className="text-[10px] text-white/70">Circle</span>
              </button>
              <button
                type="button"
                onClick={() => onAddShape('highlight')}
                className="flex flex-col items-center justify-center p-2.5 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-center transition"
                title="Translucent Highlight"
              >
                <Highlighter className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[10px] text-white/70">Marker</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Media & Signatures
            </h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onOpenSignatureModal}
                className="w-full flex items-center gap-2 p-2 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-left transition"
              >
                <div className="p-1 rounded bg-blue-600/20 text-blue-400">
                  <PenLine className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Signature Pad</div>
                  <div className="text-[9px] text-white/40">Draw or generate handwritten sign</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 p-2 rounded bg-[#1C1C1E] border border-white/10 hover:bg-white/5 hover:border-blue-500/40 text-left transition"
              >
                <div className="p-1 rounded bg-blue-600/20 text-blue-400">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Upload Image</div>
                  <div className="text-[9px] text-white/40">PNG, JPG, or SVG watermark</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
