import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Users,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  Copy,
  Check,
  Radio,
  Share2,
  Hand,
  ZoomIn,
  Move,
  X,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ClientPlatform, SyncPeer } from '../types';
import { realtimeSync, ConnectionStatus } from '../utils/realtimeSync';

interface RealtimeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  status: ConnectionStatus;
  peers: SyncPeer[];
  myPlatform: ClientPlatform;
  myClientId: string;
  onRoomChange: (newRoomId: string) => void;
  onPlatformChange: (newPlatform: ClientPlatform) => void;
}

export const RealtimeSyncModal: React.FC<RealtimeSyncModalProps> = ({
  isOpen,
  onClose,
  roomId,
  status,
  peers,
  myPlatform,
  myClientId,
  onRoomChange,
  onPlatformChange,
}) => {
  const [newRoomInput, setNewRoomInput] = useState(roomId);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    setNewRoomInput(roomId);
  }, [roomId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomInput.trim();
    if (trimmed && trimmed !== roomId) {
      onRoomChange(trimmed);
    }
  };

  const getPlatformIcon = (platform: ClientPlatform) => {
    switch (platform) {
      case 'iOS':
        return <Smartphone className="w-4 h-4 text-blue-400" />;
      case 'Android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'Desktop':
        return <Laptop className="w-4 h-4 text-purple-400" />;
      case 'Web':
      default:
        return <Globe className="w-4 h-4 text-amber-400" />;
    }
  };

  const getPlatformBadgeColor = (platform: ClientPlatform) => {
    switch (platform) {
      case 'iOS':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'Android':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Desktop':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Web':
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
  };

  const isConnected = status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-[#161618] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1C1C1E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className={`w-5 h-5 ${isConnected ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Cross-Platform Real-Time Sync</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : status === 'connecting'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-ping' : status === 'connecting' ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                  />
                  {status === 'connected' ? 'Live Cloud Sync' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Real-time WebSocket collaboration across iOS, Android, and Web viewports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Active Session & Link Sharing */}
          <div className="bg-[#121214] border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Collaboration Session
              </span>
              <span className="text-[11px] font-mono text-white/50">
                {peers.length} {peers.length === 1 ? 'device' : 'devices'} active
              </span>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newRoomInput}
                  onChange={(e) => setNewRoomInput(e.target.value)}
                  placeholder="Enter session room ID..."
                  className="w-full bg-[#1C1C1E] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition cursor-pointer shrink-0"
              >
                Join Room
              </button>
            </form>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Mobile Invite Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrOpen(!qrOpen)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white/80 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                title="Toggle QR Code info"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open on Phone</span>
              </button>
            </div>

            {qrOpen && (
              <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-white/70 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  Connect iOS Safari or Android Chrome
                </div>
                <p className="text-[11px] text-white/60">
                  Open this link on your iPhone, iPad, or Android device to test responsive touch pinch-to-zoom and multi-user live editing:
                </p>
                <div className="p-2 bg-[#0E0E10] rounded border border-white/10 font-mono text-[10px] text-blue-300 break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Connected Peers List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center justify-between">
              <span>Connected Clients ({peers.length})</span>
              <span className="text-[10px] text-white/40 lowercase">cross-platform live backend</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {peers.map((peer) => {
                const isMe = peer.id === myClientId;
                return (
                  <div
                    key={peer.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                      isMe
                        ? 'bg-blue-950/20 border-blue-500/30 text-white'
                        : 'bg-[#18181B] border-white/5 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: peer.color || '#3b82f6' }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{peer.deviceName}</span>
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-600/40 text-blue-200 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${getPlatformBadgeColor(
                          peer.platform
                        )}`}
                      >
                        {getPlatformIcon(peer.platform)}
                        <span>{peer.platform}</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                    </div>
                  </div>
                );
              })}

              {peers.length === 0 && (
                <div className="text-center py-4 text-xs text-white/40 italic">
                  Connecting to real-time server...
                </div>
              )}
            </div>
          </div>

          {/* Cross-Platform Device Simulator (for Testing in Browser) */}
          <div className="bg-[#121214] border border-white/10 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                Simulate Client Platform
              </span>
              <span className="text-[10px] text-white/40">Switch persona for testing</span>
            </div>
            <p className="text-[11px] text-white/50">
              Test how this client announces itself to other connected peers:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onPlatformChange('iOS')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition ${
                  myPlatform === 'iOS'
                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1 text-blue-400" />
                <span>iOS (iPhone)</span>
              </button>
              <button
                type="button"
                onClick={() => onPlatformChange('Android')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition ${
                  myPlatform === 'Android'
                    ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1 text-emerald-400" />
                <span>Android (Pixel)</span>
              </button>
              <button
                type="button"
                onClick={() => onPlatformChange('Web')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition ${
                  myPlatform === 'Web'
                    ? 'bg-amber-600/30 border-amber-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Globe className="w-4 h-4 mb-1 text-amber-400" />
                <span>Web Client</span>
              </button>
            </div>
          </div>

          {/* Touch Gestures Cheatsheet for Mobile Viewports */}
          <div className="bg-[#121214] border border-white/10 rounded-lg p-3.5 space-y-2">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-blue-400" />
              Mobile Touch Gesture Controls
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 rounded bg-white/5 border border-white/5 space-y-0.5">
                <div className="font-medium text-white flex items-center gap-1 text-[11px]">
                  <ZoomIn className="w-3 h-3 text-blue-400" />
                  Pinch-to-Zoom
                </div>
                <div className="text-[10px] text-white/50">
                  Pinch 2 fingers in or out to smoothly scale document from 0.4x to 2.5x.
                </div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/5 space-y-0.5">
                <div className="font-medium text-white flex items-center gap-1 text-[11px]">
                  <Move className="w-3 h-3 text-emerald-400" />
                  Two-Finger Pan
                </div>
                <div className="text-[10px] text-white/50">
                  Drag 2 fingers anywhere to pan viewport at any zoom level.
                </div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/5 space-y-0.5">
                <div className="font-medium text-white flex items-center gap-1 text-[11px]">
                  <Hand className="w-3 h-3 text-amber-400" />
                  One-Finger Pan Mode
                </div>
                <div className="text-[10px] text-white/50">
                  Toggle Pan Tool (Hand icon) to drag & scroll with a single finger.
                </div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/5 space-y-0.5">
                <div className="font-medium text-white flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Tap & Drag Objects
                </div>
                <div className="text-[10px] text-white/50">
                  Tap any text or shape to edit, or drag handles to resize and rotate.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#1C1C1E] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Server: WebSocket &bull; Port 3000 &bull; Auto-reconnect</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
