import * as fabric from 'fabric';
import { ExtractedTextItem } from '../types';

// Safeguard Fabric's DOM managers against missing lower canvas / double disposal race conditions
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  try {
    if ((fabric as any).CanvasDOMManager && (fabric as any).CanvasDOMManager.prototype) {
      const origCanvasCleanup = (fabric as any).CanvasDOMManager.prototype.cleanupDOM;
      (fabric as any).CanvasDOMManager.prototype.cleanupDOM = function (size: any) {
        if (!this.lower || !this.upper || !this.container) return;
        try {
          origCanvasCleanup.call(this, size);
        } catch (e) {
          console.warn('Safely caught CanvasDOMManager.cleanupDOM:', e);
        }
      };
    }

    if ((fabric as any).StaticCanvasDOMManager && (fabric as any).StaticCanvasDOMManager.prototype) {
      const origStaticCleanup = (fabric as any).StaticCanvasDOMManager.prototype.cleanupDOM;
      (fabric as any).StaticCanvasDOMManager.prototype.cleanupDOM = function (size: any) {
        if (!this.lower) return;
        try {
          origStaticCleanup.call(this, size);
        } catch (e) {
          console.warn('Safely caught StaticCanvasDOMManager.cleanupDOM:', e);
        }
      };

      const origSetDimensions = (fabric as any).StaticCanvasDOMManager.prototype.setDimensions;
      (fabric as any).StaticCanvasDOMManager.prototype.setDimensions = function (
        size: any,
        retinaScaling: any
      ) {
        if (!this.lower || !this.lower.el) return;
        try {
          origSetDimensions.call(this, size, retinaScaling);
        } catch (e) {
          console.warn('Safely caught StaticCanvasDOMManager.setDimensions:', e);
        }
      };
    }
  } catch (err) {
    console.warn('Could not patch Fabric DOM manager prototypes:', err);
  }
}

/**
 * Custom render function for the Drag-to-Move handle.
 * Draws an interactive circular badge with 4-directional move arrows.
 */
export function renderMoveControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  fabricObject: fabric.FabricObject
) {
  const radius = 11;

  ctx.save();
  ctx.translate(left, top);

  // Compensate for object rotation so the control stays upright
  const angle = fabricObject.getTotalAngle ? fabricObject.getTotalAngle() : (fabricObject.angle || 0);
  ctx.rotate((-angle * Math.PI) / 180);

  // Soft drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Circular background badge
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
  ctx.fillStyle = '#2563eb'; // Royal Blue (tailwind blue-600)
  ctx.fill();

  // Clean white border ring
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 4-directional Move Arrows
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const arm = 5;
  // Cross arms
  ctx.beginPath();
  ctx.moveTo(0, -arm);
  ctx.lineTo(0, arm);
  ctx.moveTo(-arm, 0);
  ctx.lineTo(arm, 0);
  ctx.stroke();

  // Top arrow tip
  ctx.beginPath();
  ctx.moveTo(-2, -arm + 2);
  ctx.lineTo(0, -arm);
  ctx.lineTo(2, -arm + 2);
  ctx.stroke();

  // Bottom arrow tip
  ctx.beginPath();
  ctx.moveTo(-2, arm - 2);
  ctx.lineTo(0, arm);
  ctx.lineTo(2, arm - 2);
  ctx.stroke();

  // Left arrow tip
  ctx.beginPath();
  ctx.moveTo(-arm + 2, -2);
  ctx.lineTo(-arm, 0);
  ctx.lineTo(-arm + 2, 2);
  ctx.stroke();

  // Right arrow tip
  ctx.beginPath();
  ctx.moveTo(arm - 2, -2);
  ctx.lineTo(arm, 0);
  ctx.lineTo(arm - 2, 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Custom render function for the Single-Click Delete button.
 * Draws an interactive circular badge with a white trash-can icon.
 */
export function renderDeleteControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  fabricObject: fabric.FabricObject
) {
  const radius = 11;

  ctx.save();
  ctx.translate(left, top);

  // Compensate for object rotation so the control stays upright
  const angle = fabricObject.getTotalAngle ? fabricObject.getTotalAngle() : (fabricObject.angle || 0);
  ctx.rotate((-angle * Math.PI) / 180);

  // Soft drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Circular background badge
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
  ctx.fillStyle = '#ef4444'; // Crimson Red (tailwind red-500)
  ctx.fill();

  // Clean white border ring
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Crisp Trash Can icon
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Trash lid
  ctx.beginPath();
  ctx.moveTo(-4.2, -2.5);
  ctx.lineTo(4.2, -2.5);
  ctx.stroke();

  // Trash lid handle
  ctx.beginPath();
  ctx.moveTo(-1.8, -2.5);
  ctx.lineTo(-1.8, -4);
  ctx.lineTo(1.8, -4);
  ctx.lineTo(1.8, -2.5);
  ctx.stroke();

  // Trash can body
  ctx.beginPath();
  ctx.moveTo(-3.2, -1.8);
  ctx.lineTo(-2.5, 4.5);
  ctx.lineTo(2.5, 4.5);
  ctx.lineTo(3.2, -1.8);
  ctx.stroke();

  // Trash can interior lines
  ctx.beginPath();
  ctx.moveTo(-0.9, 0);
  ctx.lineTo(-0.7, 3.2);
  ctx.moveTo(0.9, 0);
  ctx.lineTo(0.7, 3.2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Creates the two custom action handles:
 * 1. Drag-to-move handle for position adjustments
 * 2. Single-click delete button to remove the object layer
 */
export function createCustomActionControls(): {
  moveControl: fabric.Control;
  deleteControl: fabric.Control;
} {
  const moveControl = new fabric.Control({
    x: -0.5,
    y: -0.5,
    offsetX: -16,
    offsetY: -16,
    sizeX: 24,
    sizeY: 24,
    touchSizeX: 34,
    touchSizeY: 34,
    cursorStyle: 'move',
    actionHandler: fabric.controlsUtils.dragHandler,
    actionName: 'drag',
    render: renderMoveControl,
  });

  const deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetX: 16,
    offsetY: -16,
    sizeX: 24,
    sizeY: 24,
    touchSizeX: 34,
    touchSizeY: 34,
    cursorStyle: 'pointer',
    mouseUpHandler: (_eventData: any, transform: any) => {
      const target = transform?.target || (transform as any)?._target;
      if (target && target.canvas) {
        const canvas = target.canvas;
        canvas.remove(target);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return true;
      }
      return false;
    },
    actionHandler: () => false,
    actionName: 'delete',
    render: renderDeleteControl,
  });

  return { moveControl, deleteControl };
}

/**
 * Applies custom action handles (drag-to-move and single-click delete) to an object
 */
export function applyCustomActionHandles(object: fabric.FabricObject) {
  if (!object || (object as any).isPdfBackground) return;
  const { moveControl, deleteControl } = createCustomActionControls();
  object.controls = {
    ...object.controls,
    moveControl,
    deleteControl,
  };
}

/**
 * Configure modern handles & styling for Fabric objects
 */
export function configureDefaultObjectStyles() {
  fabric.FabricObject.ownDefaults.cornerColor = '#ffffff';
  fabric.FabricObject.ownDefaults.cornerStrokeColor = '#2563eb';
  fabric.FabricObject.ownDefaults.borderColor = '#2563eb';
  fabric.FabricObject.ownDefaults.cornerSize = 8;
  fabric.FabricObject.ownDefaults.cornerStyle = 'rect';
  fabric.FabricObject.ownDefaults.borderScaleFactor = 2;
  fabric.FabricObject.ownDefaults.transparentCorners = false;

  // Patch static createControls on Textbox and FabricObject so all newly created textboxes get handles
  if (!(fabric.Textbox as any).__hasCustomActionHandles) {
    const origTextboxCreateControls = fabric.Textbox.createControls;
    fabric.Textbox.createControls = function () {
      const res = origTextboxCreateControls.call(this);
      const { moveControl, deleteControl } = createCustomActionControls();
      res.controls = {
        ...res.controls,
        moveControl,
        deleteControl,
      };
      return res;
    };
    (fabric.Textbox as any).__hasCustomActionHandles = true;
  }

  if (!(fabric.FabricObject as any).__hasCustomActionHandles) {
    const origObjectCreateControls = fabric.FabricObject.createControls;
    fabric.FabricObject.createControls = function () {
      const res = origObjectCreateControls.call(this);
      const { moveControl, deleteControl } = createCustomActionControls();
      res.controls = {
        ...res.controls,
        moveControl,
        deleteControl,
      };
      return res;
    };
    (fabric.FabricObject as any).__hasCustomActionHandles = true;
  }
}

/**
 * Creates and configures a Fabric Canvas for PDF editing
 */
export function createEditorCanvas(
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number
): fabric.Canvas {
  configureDefaultObjectStyles();

  // If canvasEl has lingering fabric attributes or wrapper from a prior instance, restore cleanly
  if (canvasEl.hasAttribute('data-fabric')) {
    canvasEl.removeAttribute('data-fabric');
    canvasEl.classList.remove('lower-canvas');
  }

  const parent = canvasEl.parentElement;
  if (parent && parent.getAttribute('data-fabric') === 'wrapper' && parent.parentElement) {
    parent.parentElement.replaceChild(canvasEl, parent);
  }

  const canvas = new fabric.Canvas(canvasEl, {
    width,
    height,
    preserveObjectStacking: true,
    selection: false, // User requested: Disable Fabric.js default drag-selection boxes (marquee selection)
    stopContextMenu: true,
    fireRightClick: true,
  });

  canvas.on('object:added', (e: any) => {
    if (e.target && !e.target.isPdfBackground) {
      applyCustomActionHandles(e.target);
    }
  });

  return canvas;
}

/**
 * Sets the PDF raster background for the canvas
 */
export async function setCanvasBackground(
  canvas: fabric.Canvas,
  bgDataUrl: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<void> {
  if (!bgDataUrl) return;

  try {
    const img = await fabric.FabricImage.fromURL(bgDataUrl, { crossOrigin: 'anonymous' });
    const cWidth = targetWidth || canvas.width || (canvas.getWidth ? canvas.getWidth() : 612);
    const cHeight = targetHeight || canvas.height || (canvas.getHeight ? canvas.getHeight() : 792);

    img.set({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      scaleX: cWidth / (img.width || 1),
      scaleY: cHeight / (img.height || 1),
    });
    (img as any).isPdfBackground = true;

    // Set background on Fabric Canvas
    (canvas as any).backgroundImage = img;
    (canvas as any).setBackgroundImage = (image: any, cb?: () => void) => {
      (canvas as any).backgroundImage = image;
      cb?.();
      canvas.requestRenderAll();
    };

    // Remove any existing background object
    const existing = canvas.getObjects().filter((obj) => (obj as any).isPdfBackground);
    existing.forEach((obj) => canvas.remove(obj));

    // Insert at index 0 (bottom-most)
    canvas.insertAt(0, img);
    canvas.requestRenderAll();
  } catch (err) {
    console.error('Failed to set canvas background:', err);
  }
}

/**
 * Injects extracted text items into the canvas as editable Textbox objects
 */
export function populateExtractedText(
  canvas: fabric.Canvas,
  textItems: ExtractedTextItem[]
): void {
  for (const item of textItems) {
    const isBold = item.fontWeight === 'bold';
    const isItalic = item.fontStyle === 'italic';

    const baseBaselineX = item.unscaledBaselineX ?? item.baselineX ?? (item.unscaledX !== undefined ? item.unscaledX : item.x);
    const baseBaselineY = item.unscaledBaselineY ?? item.baselineY ?? (item.unscaledY !== undefined ? item.unscaledY : item.y);
    const fontSize = item.unscaledFontSize !== undefined ? item.unscaledFontSize : item.fontSize;
    const width = item.unscaledWidth !== undefined ? item.unscaledWidth : item.width;
    const baselineOffset = fontSize * 1.13 * (1 - 0.222);

    const textbox = new fabric.Textbox(item.text, {
      left: baseBaselineX,
      top: baseBaselineY - baselineOffset,
      width: width,
      fontSize: fontSize,
      fontFamily: item.aiMatchedFont || item.fontFamily || 'Helvetica, Arial, sans-serif',
      fill: item.color || '#111827',
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textAlign: (item.textAlign as any) || 'left',
      lineHeight: item.lineHeight || 1.0,
      backgroundColor: item.isOcr ? (item.inpaintColor || '#ffffff') : 'transparent',
      padding: 0,
      strokeWidth: 0,
      splitByGrapheme: false,
      editable: true,
      objectCaching: false,
    });

    (textbox as any)._splitTextIntoLines = fabric.IText.prototype._splitTextIntoLines;
    textbox.initDimensions();

    (textbox as any).extractedId = item.id;
    (textbox as any).rawFontName = (item as any).fontName || item.rawFontName;
    (textbox as any).aiMatchedFont = item.aiMatchedFont;
    (textbox as any).aiConfidence = item.aiConfidence;
    (textbox as any).aiMatchReason = item.aiMatchReason;
    (textbox as any).unscaledBaselineX = baseBaselineX;
    (textbox as any).unscaledBaselineY = baseBaselineY;
    (textbox as any).unscaledFontSize = fontSize;
    (textbox as any).unscaledWidth = width;
    canvas.add(textbox);
  }
  canvas.requestRenderAll();
}

/**
 * Add a new customizable Textbox
 */
export function addTextbox(
  canvas: fabric.Canvas,
  text: string = 'Double click to edit text',
  options?: Partial<fabric.TextboxProps>
): fabric.Textbox {
  const center = canvas.getCenterPoint();
  const textbox = new fabric.Textbox(text, {
    left: Math.max(30, center.x - 120),
    top: Math.max(30, center.y - 30),
    width: 240,
    fontSize: 16,
    fontFamily: 'Helvetica, Arial, sans-serif',
    fill: '#111827',
    backgroundColor: '#ffffff',
    padding: 6,
    editable: true,
    ...options,
  });

  canvas.add(textbox);
  canvas.setActiveObject(textbox);
  canvas.requestRenderAll();
  return textbox;
}

/**
 * Add a Rectangle or Highlight box
 */
export function addRectangle(
  canvas: fabric.Canvas,
  isHighlight: boolean = false,
  options?: Partial<fabric.RectProps>
): fabric.Rect {
  const center = canvas.getCenterPoint();

  const rect = new fabric.Rect({
    left: Math.max(30, center.x - 90),
    top: Math.max(30, center.y - 45),
    width: isHighlight ? 180 : 160,
    height: isHighlight ? 28 : 90,
    fill: isHighlight ? 'rgba(253, 224, 71, 0.45)' : 'rgba(243, 244, 246, 0.8)',
    stroke: isHighlight ? 'transparent' : '#3b82f6',
    strokeWidth: isHighlight ? 0 : 2,
    rx: isHighlight ? 3 : 6,
    ry: isHighlight ? 3 : 6,
    opacity: isHighlight ? 0.65 : 0.9,
    ...options,
  });

  canvas.add(rect);
  canvas.setActiveObject(rect);
  canvas.requestRenderAll();
  return rect;
}

/**
 * Add a Circle / Oval shape
 */
export function addCircle(
  canvas: fabric.Canvas,
  options?: Partial<fabric.CircleProps>
): fabric.Circle {
  const center = canvas.getCenterPoint();

  const circle = new fabric.Circle({
    left: Math.max(30, center.x - 50),
    top: Math.max(30, center.y - 50),
    radius: 45,
    fill: 'rgba(239, 246, 255, 0.8)',
    stroke: '#2563eb',
    strokeWidth: 2,
    ...options,
  });

  canvas.add(circle);
  canvas.setActiveObject(circle);
  canvas.requestRenderAll();
  return circle;
}

/**
 * Add an Image from Data URL
 */
export async function addImage(
  canvas: fabric.Canvas,
  dataUrl: string
): Promise<fabric.FabricImage | null> {
  try {
    const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
    const center = canvas.getCenterPoint();

    // Scale to reasonable size if large
    const maxDimension = 260;
    if ((img.width || 0) > maxDimension || (img.height || 0) > maxDimension) {
      const scale = Math.min(
        maxDimension / (img.width || 1),
        maxDimension / (img.height || 1)
      );
      img.scale(scale);
    }

    img.set({
      left: Math.max(30, center.x - (img.getScaledWidth() / 2)),
      top: Math.max(30, center.y - (img.getScaledHeight() / 2)),
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    return img;
  } catch (err) {
    console.error('Error adding image to canvas:', err);
    return null;
  }
}

/**
 * Layer ordering operations
 */
export function bringObjectForward(canvas: fabric.Canvas) {
  const active = canvas.getActiveObject();
  if (active && !(active as any).isPdfBackground) {
    canvas.bringObjectForward(active);
    canvas.requestRenderAll();
  }
}

export function sendObjectBackward(canvas: fabric.Canvas) {
  const active = canvas.getActiveObject();
  if (active && !(active as any).isPdfBackground) {
    // Keep above background (index 0)
    const objects = canvas.getObjects();
    const index = objects.indexOf(active);
    const bgExists = objects.some((o) => (o as any).isPdfBackground);
    if (index > (bgExists ? 1 : 0)) {
      canvas.sendObjectBackwards(active);
      canvas.requestRenderAll();
    }
  }
}

export function bringObjectToFront(canvas: fabric.Canvas) {
  const active = canvas.getActiveObject();
  if (active && !(active as any).isPdfBackground) {
    canvas.bringObjectToFront(active);
    canvas.requestRenderAll();
  }
}

export function sendObjectToBack(canvas: fabric.Canvas) {
  const active = canvas.getActiveObject();
  if (active && !(active as any).isPdfBackground) {
    const objects = canvas.getObjects();
    const bgExists = objects.some((o) => (o as any).isPdfBackground);
    // If background exists at index 0, place at index 1
    if (bgExists) {
      canvas.moveObjectTo(active, 1);
    } else {
      canvas.sendObjectToBack(active);
    }
    canvas.requestRenderAll();
  }
}

/**
 * Delete currently selected object
 */
export function deleteActiveObject(canvas: fabric.Canvas) {
  const activeObjects = canvas.getActiveObjects();
  if (!activeObjects.length) return;

  activeObjects.forEach((obj) => {
    if (!(obj as any).isPdfBackground) {
      canvas.remove(obj);
    }
  });
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

/**
 * Duplicate active object
 */
export async function duplicateActiveObject(canvas: fabric.Canvas) {
  const active = canvas.getActiveObject();
  if (!active || (active as any).isPdfBackground) return;

  const cloned = await active.clone();
  cloned.set({
    left: (active.left || 0) + 20,
    top: (active.top || 0) + 20,
    evented: true,
  });

  canvas.add(cloned);
  canvas.setActiveObject(cloned);
  canvas.requestRenderAll();
}
