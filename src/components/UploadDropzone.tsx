import React, { useState, useRef } from 'react';
import { FileUp, Sparkles, AlertCircle, FileText, CheckCircle2, ScanText } from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onLoadFlattenedSample?: () => void;
  isProcessing: boolean;
  progressPercent: number;
  progressMessage: string;
  errorMessage: string | null;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  onLoadSample,
  onLoadFlattenedSample,
  isProcessing,
  progressPercent,
  progressMessage,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcess(file);
    }
  };

  const validateAndProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('Please upload a valid PDF document (.pdf)');
      return;
    }
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSizeBytes) {
      alert('File exceeds maximum size limit of 25MB.');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      id="upload-dropzone-container"
      className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[75vh] select-none"
    >
      <div className="w-full bg-[#161618] rounded-xl border border-white/10 shadow-2xl p-6 sm:p-8 transition-all text-[#E0E0E0]">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white mb-3 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            PDF Document Editor
          </h1>
          <p className="mt-1.5 text-xs text-white/50 max-w-md mx-auto">
            Extract text into editable vector blocks, draw annotations, add shapes & signatures, and re-export directly in your browser.
          </p>
        </div>

        {/* Drag & Drop Box */}
        <div
          id="dropzone-area"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-950/40 scale-[1.01]'
              : 'border-white/10 bg-[#1C1C1E] hover:bg-white/5 hover:border-white/30'
          } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
        >
          <input
            ref={fileInputRef}
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
              <p className="text-xs font-semibold text-white mb-2">
                {progressMessage || 'Processing PDF...'}
              </p>
              <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 mt-1.5 font-mono">{progressPercent}%</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-blue-400 flex items-center justify-center mb-3">
                <FileUp className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white">
                Drag and drop your PDF here
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                or click to browse from your computer (up to 25MB)
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-900 rounded-lg flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Sample Document Action */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-white/50 text-center sm:text-left">
            Test with ready-to-use documents:
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-load-sample-pdf"
              type="button"
              onClick={onLoadSample}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sample Invoice
            </button>
            {onLoadFlattenedSample && (
              <button
                id="btn-load-flattened-ocr-pdf"
                type="button"
                onClick={onLoadFlattenedSample}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 disabled:opacity-50 transition shadow-sm cursor-pointer"
                title="Test automated OCR pipeline on purely image-based PDF"
              >
                <ScanText className="w-3.5 h-3.5 text-emerald-400" />
                Scanned PDF (OCR Test)
              </button>
            )}
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
          <div className="p-2.5 rounded bg-[#1C1C1E] border border-emerald-500/20">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
              <ScanText className="w-3 h-3" />
              <p className="text-[11px] font-bold">Auto OCR</p>
            </div>
            <p className="text-[9px] text-white/40">Scanned to editable text</p>
          </div>
          <div className="p-2.5 rounded bg-[#1C1C1E] border border-white/5">
            <p className="text-[11px] font-bold text-white/90">
              Text Extraction
            </p>
            <p className="text-[9px] text-white/40 mt-0.5">Editable vector blocks</p>
          </div>
          <div className="p-2.5 rounded bg-[#1C1C1E] border border-white/5">
            <p className="text-[11px] font-bold text-white/90">
              Canvas Tools
            </p>
            <p className="text-[9px] text-white/40 mt-0.5">Shapes, pen & sign</p>
          </div>
          <div className="p-2.5 rounded bg-[#1C1C1E] border border-white/5">
            <p className="text-[11px] font-bold text-white/90">
              PDF Export
            </p>
            <p className="text-[9px] text-white/40 mt-0.5">Vector coordinate output</p>
          </div>
        </div>
      </div>
    </div>
  );
};
