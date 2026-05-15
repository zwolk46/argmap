import type { CSSProperties, ReactElement } from "react";

export interface AiSparkleProps {
  /** Pixel size; defaults to inherit em via font-size. */
  size?: number;
  /** Optional color override; defaults to --color-ai-accent. */
  color?: string;
  /** Optional extra style. */
  style?: CSSProperties;
}

/**
 * AiSparkle — the four-pointed star glyph (✦) used as the app's "AI
 * touched this" marker. Wrapping the Unicode glyph in a single component
 * means all AI surfaces render the sparkle at the same baseline, the
 * same color token, and with consistent aria-hidden semantics; no caller
 * has to remember the exact character to type or the right color var.
 *
 * Used by AiAttributionChip, the prose-tab rewrite controls, the
 * suggestion drawer header, and the premise-authoring draft action.
 */
export function AiSparkle({ size, color, style }: AiSparkleProps = {}): ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        color: color ?? "var(--color-ai-accent)",
        fontSize: size ? `${size}px` : "1em",
        lineHeight: 1,
        ...style,
      }}
    >
      ✦
    </span>
  );
}
