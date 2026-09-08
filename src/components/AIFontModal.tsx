import React from 'react';
import { Sparkles, X, Check, RefreshCw, Type, AlertCircle } from 'lucide-react';
import { AIFontMatch } from '../types';

interface AIFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: AIFontMatch[];
  isMatching: boolean;
  onReanalyze: () => void;
  onApplyMatches: () => void;
}

export const AIFontModal: React.FC<AIFontModalProps> = ({
  isOpen,
  onClose,
  matches,
  isMatching,
  onReanalyze,
  onApplyMatches,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#161618] border border-white/15 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                AI Font Identification & Typeface Matching
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Gemini Flash
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                Automatically detects PDF typefaces and pairs exact or near-identical web fonts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status banner */}
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">
                  {matches.length > 0
                    ? `Identified ${matches.length} Distinct Typefaces in Document`
                    : 'Analyzing Document Typography...'}
                </div>
                <div className="text-[11px] text-white/60">
                  Matches are dynamically linked to high-fidelity Google Web Fonts and applied to text fields.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isMatching}
              onClick={onReanalyze}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? 'animate-spin text-blue-400' : ''}`} />
              {isMatching ? 'Analyzing...' : 'Re-Scan'}
            </button>
          </div>

          {/* Matched Font List */}
          {matches.length === 0 ? (
            <div className="py-12 text-center text-white/40 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-white/20" />
              <p className="text-xs">No font signatures detected yet. Click Re-Scan to analyze the document.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#1C1C1E] border border-white/10 rounded-lg p-3.5 hover:border-white/20 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {item.matchedFont}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/5">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">
                          {Math.round(item.confidence * 100)}% Match
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 font-mono mt-0.5">
                        PDF Source: <span className="text-white/60">{item.rawFontName}</span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 font-medium">
                      <Check className="w-3 h-3" /> Auto-Applied
                    </span>
                  </div>

                  {/* Visual preview of typeface */}
                  <div
                    className="p-3 bg-black/40 rounded border border-white/5 text-sm text-white/90 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontFamily: item.cssFontFamily }}
                  >
                    The quick brown fox jumps over the lazy dog 0123456789
                  </div>

                  {/* Typographic reasoning */}
                  {item.matchReason && (
                    <div className="text-[11px] text-white/60 flex items-start gap-1.5">
                      <span className="text-blue-400 font-semibold shrink-0">Analysis:</span>
                      <span>{item.matchReason}</span>
                    </div>
                  )}

                  {/* Near-identical substitutes */}
                  {item.substitutes && item.substitutes.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40 pt-1">
                      <span>Near-identical alternatives:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.substitutes.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/5"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#1C1C1E] flex items-center justify-between">
          <span className="text-[11px] text-white/40">
            {matches.length} typefaces active in canvas
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 text-xs font-medium transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyMatches();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
