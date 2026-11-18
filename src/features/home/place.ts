interface Box { left: number; right: number; top: number; bottom: number }
interface Size { width: number; height: number }

/**
 * Where a popover of this size sits for the row it belongs to. Beside the row if there is room, so the row stays
 * in view; otherwise below it, then above it; and always wholly inside the window.
 */
export function placeBeside(anchor: Box, size: Size, view: Size, gap = 8, edge = 12): { left: number; top: number } {
  const inside = (top: number) => Math.max(edge, Math.min(top, view.height - edge - size.height));
  // level with the row, lifted a little so the popover's title lines up with it
  if (anchor.right + gap + size.width <= view.width - edge) return { left: anchor.right + gap, top: inside(anchor.top - 16) };
  if (anchor.left - gap - size.width >= edge) return { left: anchor.left - gap - size.width, top: inside(anchor.top - 16) };
  const left = Math.max(edge, Math.min(anchor.left, view.width - edge - size.width));
  if (anchor.bottom + gap + size.height <= view.height - edge) return { left, top: anchor.bottom + gap };
  if (anchor.top - gap - size.height >= edge) return { left, top: anchor.top - gap - size.height };
  return { left, top: inside(anchor.bottom + gap) };
}
