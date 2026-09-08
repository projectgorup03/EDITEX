import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool, Type } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSignature: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onInsertSignature,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('cursive');
  const [strokeColor, setStrokeColor] = useState('#0f172a');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling for crisp signature
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeColor;
  }, [isOpen, activeTab, strokeColor]);

  if (!isOpen) return null;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    lastPointRef.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleApply = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL('image/png');
      onInsertSignature(dataUrl);
    } else {
      if (!typedName.trim()) return;
      // Render typed signature onto an off-screen canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 400;
      offCanvas.height = 160;
      const ctx = offCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        ctx.fillStyle = strokeColor;
        ctx.font = `italic 42px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 80);
        onInsertSignature(offCanvas.toDataURL('image/png'));
      }
    }
    onClose();
  };

  return (
    <div
      id="signature-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none"
      onClick={onClose}
    >
      <div
        id="signature-modal-content"
        className="w-full max-w-md rounded-xl bg-[#161618] shadow-2xl border border-white/10 overflow-hidden text-[#E0E0E0]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Insert Signature
          </h3>
          <button
            id="btn-close-signature"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white rounded hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/10 bg-[#1C1C1E]">
          <button
            id="tab-signature-draw"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'draw'
                ? 'border-blue-500 text-white bg-[#161618]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Draw Signature
          </button>
          <button
            id="tab-signature-type"
            onClick={() => setActiveTab('type')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'type'
                ? 'border-blue-500 text-white bg-[#161618]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type Signature
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {activeTab === 'draw' ? (
            <div>
              <div className="relative border border-white/10 rounded-lg bg-[#1C1C1E] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  id="signature-draw-canvas"
                  className="w-full h-40 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white/30 text-xs">
                    Draw signature with finger or mouse
                  </div>
                )}
                <div className="absolute bottom-2 right-2">
                  <button
                    id="btn-clear-signature"
                    type="button"
                    onClick={clearCanvas}
                    className="p-1 px-2 text-xs bg-[#161618] border border-white/10 rounded text-white/70 hover:bg-white/5 flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                  Full Name
                </label>
                <input
                  id="input-typed-signature-name"
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#1C1C1E] text-white text-xs focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                  Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Classic Script', font: 'cursive' },
                    { label: 'Serif Formal', font: 'Times New Roman, serif' },
                  ].map((style) => (
                    <button
                      key={style.font}
                      type="button"
                      onClick={() => setSelectedFont(style.font)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition ${
                        selectedFont === style.font
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-white/10 bg-[#1C1C1E] text-white/70 hover:bg-white/5'
                      }`}
                      style={{ fontFamily: style.font }}
                    >
                      {typedName || 'Signature'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Color selector */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
            <span className="text-xs text-white/60 font-medium">
              Ink Color
            </span>
            <div className="flex gap-2">
              {[
                { label: 'White', val: '#ffffff' },
                { label: 'Black', val: '#0f172a' },
                { label: 'Navy', val: '#1e3a8a' },
                { label: 'Royal Blue', val: '#2563eb' },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setStrokeColor(c.val)}
                  className={`w-5 h-5 rounded-full border-2 transition ${
                    strokeColor === c.val
                      ? 'border-blue-500 scale-110'
                      : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c.val }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 bg-[#1C1C1E] border-t border-white/10">
          <button
            id="btn-cancel-signature"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-white/60 hover:text-white rounded hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            id="btn-apply-signature"
            onClick={handleApply}
            disabled={activeTab === 'draw' ? !hasDrawn : !typedName.trim()}
            className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Insert on Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
