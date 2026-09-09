/**
 * Core type definitions for PDF Editor
 */

export interface ExtractedTextItem {
  id: string;
  text: string;
  x: number; // canvas pixel X (top-left)
  y: number; // canvas pixel Y (top-left)
  baselineX?: number; // exact extracted baseline coordinate X
  baselineY?: number; // exact extracted baseline coordinate Y
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight?: string;
  fontStyle?: string;
  rotation?: number;
  pdfX: number; // original PDF point X
  pdfY: number; // original PDF point Y
  pdfWidth: number;
  pdfHeight: number;
  rawFontName?: string;
  aiMatchedFont?: string;
  aiConfidence?: number;
  aiMatchReason?: string;
  unscaledX?: number;
  unscaledY?: number;
  unscaledBaselineX?: number;
  unscaledBaselineY?: number;
  unscaledWidth?: number;
  unscaledHeight?: number;
  unscaledFontSize?: number;
  isOcr?: boolean;
  ocrConfidence?: number;
  inpaintColor?: string;
  inpaintFillType?: 'solid' | 'texture';
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  isInpainted?: boolean;
}

export interface DocumentReconstructionPayload {
  target_region: {
    bounding_box: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
    original_text: string;
    detected_font: {
      family: string;
      weight: string;
      size_pt: number;
      color: string;
      letter_spacing?: number;
      alignment?: 'left' | 'center' | 'right' | 'justify';
    };
  };
  background_inpainting: {
    fill_type: string;
    color: string;
    region: [number, number, number, number];
  };
  overlay_render: {
    updated_text: string;
    baseline_coordinates: { x: number; y: number };
    canvas_layer_id: string;
  };
}

export interface AIFontMatch {
  rawFontName: string;
  matchedFont: string;
  cssFontFamily: string;
  googleFontFamily: string;
  category: string;
  confidence: number;
  matchReason: string;
  substitutes: string[];
}

export interface PDFPageInfo {
  pageNumber: number; // 1-indexed
  width: number;      // CSS canvas pixel width
  height: number;     // CSS canvas pixel height
  pdfWidth: number;   // Original PDF points (72 DPI)
  pdfHeight: number;  // Original PDF points (72 DPI)
  unscaledWidth?: number;
  unscaledHeight?: number;
  bgDataUrl: string;  // High-DPI rendered background image
  textItems: ExtractedTextItem[];
  canvasJson?: string; // Serialized Fabric canvas state for this page
  thumbnailUrl?: string; // Thumbnail preview image
  pageProxy?: any;     // Live pdfjs page proxy for dynamic re-rendering
  hasOcrProcessed?: boolean;
  isScannedOrFlattened?: boolean;
  ocrTextCount?: number;
}

export interface PDFDocumentData {
  fileName: string;
  fileSize: number;
  numPages: number;
  pages: PDFPageInfo[];
  originalBytes?: ArrayBuffer;
  aiFontMatches?: AIFontMatch[];
  pdfDocProxy?: any;   // Live pdfjs document proxy
}

export type ToolMode = 'select' | 'text' | 'rect' | 'circle' | 'highlight' | 'draw' | 'pan';

export type ClientPlatform = 'iOS' | 'Android' | 'Web' | 'Desktop';

export interface SyncPeer {
  id: string;
  platform: ClientPlatform;
  deviceName: string;
  color: string;
  lastSeen?: number;
}

export interface CanvasObjectSyncPayload {
  id: string;
  pageNumber: number;
  data: any;
  updatedBy: string;
  platform: ClientPlatform;
  timestamp: number;
}

export interface RealtimeSyncState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  roomId: string | null;
  peers: SyncPeer[];
  myPlatform: ClientPlatform;
  myClientId: string;
  lastSyncTime: number | null;
}

export interface ActiveObjectProperties {
  type: string;
  pageNumber?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  left?: number;
  top?: number;
  baselineX?: number;
  baselineY?: number;
  width?: number;
  height?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  rawFontName?: string;
  aiMatchedFont?: string;
  aiConfidence?: number;
  aiMatchReason?: string;
  substitutes?: string[];
  isOcr?: boolean;
  ocrConfidence?: number;
  inpaintColor?: string;
  inpaintFillType?: 'solid' | 'texture';
  letterSpacing?: number;
  lineHeight?: number;
  charSpacing?: number;
  isInpainted?: boolean;
}
