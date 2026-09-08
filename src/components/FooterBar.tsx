import React from 'react';
import { ActiveObjectProperties } from '../types';

interface FooterBarProps {
  activeObject: ActiveObjectProperties | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  activeObject,
  currentPage,
  totalPages,
  zoom,
}) => {
  const getSelectionText = () => {
    if (!activeObject) return 'No Object Selected';
    const typeLabel = activeObject.type?.toUpperCase() || 'OBJECT';
    return `1 ${typeLabel} Selected`;
  };

  return (
    <footer
      id="high-density-footer"
      className="h-8 bg-[#161618] border-t border-white/10 flex items-center justify-between px-3 sm:px-4 shrink-0 select-none text-[#E0E0E0] z-20"
    >
      {/* Left status items */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-white/70 font-semibold">
            Engine Ready
          </span>
        </div>
        <span className="text-[9px] text-white/20">|</span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-white/60">
          {getSelectionText()}
        </span>
        <span className="hidden md:inline-block text-[9px] text-white/20">|</span>
        <span className="hidden md:inline-block text-[9px] text-white/40 font-mono">
          Page {currentPage} of {totalPages} ({Math.round(zoom * 100)}%)
        </span>
      </div>

      {/* Right specifications */}
      <div className="flex items-center gap-3 sm:gap-4 text-[9px] text-white/40 font-mono">
        <span className="hidden sm:inline">PDF v1.7</span>
        <span>72 DPI Rendering</span>
        <span className="text-white/20 uppercase tracking-widest hidden lg:inline">
          Fabric Engine v6.7
        </span>
      </div>
    </footer>
  );
};
