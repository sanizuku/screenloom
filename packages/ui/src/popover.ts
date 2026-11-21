/**
 * Helpers for floating panels (DatePicker, Tooltip, Ribbon menus; ComboBox later).
 *
 * We use the native `popover` attribute so the panel renders in the browser's top layer:
 * no clipping by `overflow: hidden` parents and no z-index fights. Older browsers and jsdom
 * do not have showPopover(); there the panel stays a `position: fixed` element (see CSS),
 * which still escapes most overflow containers.
 */

export function supportsPopover(el: HTMLElement | null): el is HTMLElement {
  return Boolean(el) && typeof (el as HTMLElement).showPopover === "function";
}

/** Show an element with a `popover` attribute, if the browser supports it. Safe to call anywhere. */
export function showPopover(el: HTMLElement | null): void {
  if (!supportsPopover(el)) return;
  try {
    if (!el.matches(":popover-open")) el.showPopover();
  } catch {
    // Element not connected or already open: nothing to do.
  }
}

const GAP = 4;
const VIEWPORT_MARGIN = 8;

export type PopoverPlacement = "bottom" | "top";
export type PopoverAlign = "start" | "center" | "end";

export interface PositionOptions {
  /** Preferred side. Flips to the other side when there is not enough room. Default "bottom". */
  placement?: PopoverPlacement;
  /** Horizontal alignment against the anchor. Default "start" (left edge). */
  align?: PopoverAlign;
  /** Distance from the anchor in px. Default 4. */
  gap?: number;
}

/**
 * Place `popover` next to `anchor` (below and left aligned by default). Flip to the other side
 * when there is not enough room, and keep it inside the viewport horizontally. Uses viewport
 * coordinates because the popover is `position: fixed` (top layer or fallback).
 *
 * Kept as one function so it can be swapped for a positioning library later.
 */
export function positionPopover(anchor: HTMLElement, popover: HTMLElement, options: PositionOptions = {}): void {
  const { placement: preferred = "bottom", align = "start", gap = GAP } = options;
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const below = rect.bottom + gap;
  const above = rect.top - gap - height;
  const fitsBelow = below + height <= vh - VIEWPORT_MARGIN;
  const fitsAbove = above >= VIEWPORT_MARGIN;

  let placement: PopoverPlacement = preferred;
  if (preferred === "bottom" && !fitsBelow && fitsAbove) placement = "top";
  if (preferred === "top" && !fitsAbove && fitsBelow) placement = "bottom";
  const top = placement === "bottom" ? below : above;

  let left = rect.left;
  if (align === "center") left = rect.left + rect.width / 2 - width / 2;
  else if (align === "end") left = rect.right - width;
  if (left + width > vw - VIEWPORT_MARGIN) left = Math.max(VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - width);
  // "start" keeps the old DatePicker behaviour (flush with the anchor); centred/end panels stay on screen.
  if (align !== "start") left = Math.max(VIEWPORT_MARGIN, left);

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
  popover.dataset.placement = placement;
}

/** Hide a popover shown with showPopover(). Safe to call anywhere. */
export function hidePopover(el: HTMLElement | null): void {
  if (!supportsPopover(el)) return;
  try {
    if (el.matches(":popover-open")) el.hidePopover();
  } catch {
    // Not open or not connected.
  }
}
