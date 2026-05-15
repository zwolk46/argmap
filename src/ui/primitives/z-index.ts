/**
 * Z-index scale. Mirrors the --z-* tokens in tokens.css for consumers that
 * need a numeric value (React inline `style.zIndex` is typed as `number`).
 *
 * Always read from this map rather than inventing one-off literals — that's
 * how layering goes wrong: a popover hardcoded at 1050 ends up sitting on
 * top of a modal at 1000, or a banner ends up under the canvas because no
 * one knew what the canvas was using. Adding a new band? Add it here AND
 * in tokens.css so the CSS and JS surfaces stay in sync.
 */
export const Z = {
  canvas: 1,
  canvasToolbar: 10,
  banner: 40,
  topbar: 50,
  drawer: 80,
  popover: 90,
  coachmark: 200,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
  tour: 10000,
} as const;

export type ZBand = keyof typeof Z;
