---
name: canvas-interactive-sim
description: Use when building, modifying, or testing 2D Canvas and SVG interactive educational simulations, animation loops, and browser compatibility fallbacks.
---

# Canvas & Interactive Simulations in PyFis IA

## Canvas Setup and Browser Compatibility
1. **DPR Scaling**: Always handle high-DPI screens via `window.devicePixelRatio || 1` and `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
2. **Polyfills & Fallbacks**:
   - `CanvasRenderingContext2D.prototype.roundRect` is only available in newer browser versions. Always provide a fallback (e.g. using `arcTo` or standard rectangles with rounded corners) to ensure compatibility with older WebViews, tablets, and low-end mobile devices.
3. **Animation Lifecycles**:
   - Clean up `requestAnimationFrame(frameId)` with `cancelAnimationFrame` in React `useEffect` unmount handlers.
   - Disconnect any `ResizeObserver` instances on teardown.
   - Respect `prefers-reduced-motion: reduce` by jumping directly to the final state or reducing animation speed.
4. **Pedagogical Interaction (PhET Inspiration)**:
   - Provide direct manipulation of parameters ($v_0$, $\theta$, $g$).
   - Show trajectory traces with key markers (peak height, landing point, velocity vector components).
   - Allow comparing runs (e.g. ghost trajectories for previous trials or complementary angles).
5. **Scoped CSS**:
   - Components must contain their styles within designated local stylesheets and use strict class prefixes (e.g. `.plab-*`, `.pgame-*`) to avoid conflicting with global `index.css`.
