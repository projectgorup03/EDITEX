/**
 * Zoom calculation utilities for PDF canvas viewport.
 * Provides accurate 'Fit to Page' and 'Fit to Width' calculations
 * factoring in actual container dimensions, sidebars, headers, and padding.
 */

export function calculateFitToPageZoom(
  pageWidth: number,
  pageHeight: number,
  containerEl?: HTMLElement | null
): number {
  const safeWidth = pageWidth > 0 ? pageWidth : 595.28;
  const safeHeight = pageHeight > 0 ? pageHeight : 841.89;

  let viewportWidth = 0;
  let viewportHeight = 0;

  if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
    viewportWidth = containerEl.clientWidth;
    viewportHeight = containerEl.clientHeight;
  } else if (typeof window !== 'undefined') {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const leftSidebarW = screenW >= 768 ? (screenW >= 1024 ? 240 : 224) : 0;
    const rightSidebarW = screenW >= 1280 ? 288 : 0;
    const topBarH = 56;
    viewportWidth = Math.max(280, screenW - leftSidebarW - rightSidebarW);
    viewportHeight = Math.max(280, screenH - topBarH);
  } else {
    return 1.0;
  }

  // Exact vertical and horizontal allowance:
  // - Vertical: stack top padding (16px) + page header badge & toolbar (~28px) + canvas border (2px) + stack bottom padding (16px) + safety buffer (6px) = ~68px
  // - Horizontal: stack horizontal padding (16px*2=32px) + border/shadow allowance (8px) + safety cushion (8px) = ~48px
  const isMobile = viewportWidth < 640;
  const horizontalPadding = isMobile ? 24 : 48;
  const verticalPadding = isMobile ? 54 : 68;

  const availWidth = Math.max(80, viewportWidth - horizontalPadding);
  const availHeight = Math.max(80, viewportHeight - verticalPadding);

  const scaleW = availWidth / safeWidth;
  const scaleH = availHeight / safeHeight;

  // Fit to Page ensures the entire page (width AND height) is 100% visible inside the viewport
  // Apply a 0.985 factor to guarantee sub-pixel anti-aliasing never causes a scrollbar
  const rawFit = Math.min(scaleW, scaleH);
  const fitZoom = Math.min(2.5, Math.max(0.2, Math.floor(rawFit * 98.5) / 100));

  return fitZoom;
}

export function calculateFitToWidthZoom(
  pageWidth: number,
  containerEl?: HTMLElement | null
): number {
  const safeWidth = pageWidth > 0 ? pageWidth : 595.28;
  let viewportWidth = 0;

  if (containerEl && containerEl.clientWidth > 0) {
    viewportWidth = containerEl.clientWidth;
  } else if (typeof window !== 'undefined') {
    const screenW = window.innerWidth;
    const leftSidebarW = screenW >= 768 ? (screenW >= 1024 ? 240 : 224) : 0;
    const rightSidebarW = screenW >= 1280 ? 288 : 0;
    viewportWidth = Math.max(280, screenW - leftSidebarW - rightSidebarW);
  } else {
    return 1.0;
  }

  const isMobile = viewportWidth < 640;
  const horizontalPadding = isMobile ? 24 : 48;
  const availWidth = Math.max(80, viewportWidth - horizontalPadding);
  const scaleW = availWidth / safeWidth;

  const fitZoom = Math.min(2.5, Math.max(0.2, Math.floor(scaleW * 98.5) / 100));
  return fitZoom;
}
