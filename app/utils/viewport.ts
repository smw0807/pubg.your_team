type ViewportWindow = Pick<Window, 'innerHeight' | 'addEventListener' | 'removeEventListener'> & {
  visualViewport: (Pick<VisualViewport, 'height' | 'scale' | 'addEventListener' | 'removeEventListener'>) | null;
};

export function observeViewportHeight(target: ViewportWindow, update: (height: string) => void) {
  const viewport = target.visualViewport;
  const resize = () => {
    // Don't collapse the layout when the user zooms to read text.
    const height = viewport && viewport.scale === 1 ? viewport.height : target.innerHeight;
    if (Number.isFinite(height) && height > 0) update(`${Math.round(height)}px`);
  };
  resize();
  target.addEventListener('resize', resize);
  viewport?.addEventListener('resize', resize);
  return () => {
    target.removeEventListener('resize', resize);
    viewport?.removeEventListener('resize', resize);
  };
}
