import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Radio,
  Smartphone,
  Globe,
  Users,
} from 'lucide-react';
import { ToolMode, ClientPlatform, SyncPeer } from '../types';
import { ConnectionStatus } from '../utils/realtimeSync';

interface MobileTouchControlsProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitPage: () => void;
  syncStatus: ConnectionStatus;
  peers: SyncPeer[];
  myPlatform: ClientPlatform;
  onOpenSyncModal: () => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  onFitPage,
  syncStatus,
  peers,
  myPlatform,
  onOpenSyncModal,
}) => {
  const isConnected = syncStatus === 'connected';

  const handleZoomIn = () => {
    onZoomChange(Math.min(2.5, Number((zoom + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.4, Number((zoom - 0.15).toFixed(2))));
  };

  return (
    <div className="fixed bottom-12 right-4 z-40 flex flex-col items-end gap-2 select-none pointer-events-auto">
      {/* Real-Time Cross-Platform Sync Pill */}
      <button
        type="button"
        onClick={onOpenSyncModal}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md text-xs font-semibold transition-all cursor-pointer ${
          isConnected
            ? 'bg-[#161618]/90 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
            : 'bg-[#161618]/90 border-amber-500/40 text-amber-300'
        }`}
        title="Open Real-Time Cross-Platform Collaboration"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
          }`}
        />
        <div className="flex items-center gap-1 text-[11px]">
          {myPlatform === 'iOS' ? (
            <span className="text-blue-400 font-bold">iOS</span>
          ) : myPlatform === 'Android' ? (
            <span className="text-emerald-400 font-bold">Android</span>
          ) : (
            <span className="text-amber-400 font-bold">Web</span>
          )}
          <span className="text-white/40">&bull;</span>
          <Users className="w-3 h-3 text-white/70" />
          <span>{peers.length}</span>
        </div>
      </button>

      {/* Touch Action Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#18181B]/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-md">
        {/* Zoom Controls */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          title="Zoom Out (Pinch in also supported)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-mono text-white/70 font-semibold px-1 min-w-[38px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          title="Zoom In (Pinch out also supported)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/15 my-auto" />

        {/* Fit to Page */}
        <button
          type="button"
          onClick={onFitPage}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          title="Fit Page to Viewport"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
