import * as React from "react";
import {
  type Icon,
  House,
  Gear,
  Clock,
  Question,
  SignOut,
  X,
  Check,
  Circle,
  Warning,
  Minus,
  Star,
  Trash,
  Pencil,
  Plus,
  Eye,
  EyeSlash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsOut,
  ArrowsIn,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  CaretUp,
  CaretRight,
  CaretLeft,
  ArrowCounterClockwise,
  Scales,
  Hash,
  Diamond,
  Flag,
  TreeStructure,
  ListChecks,
  TextT,
  ChatCircleDots,
  CirclesThreePlus,
  Trophy,
  BookOpen,
  FileText,
  Crosshair,
  SortAscending,
  Sparkle,
} from "@phosphor-icons/react";

export type UIconStyle = "rr" | "sr" | "br";

export interface UIconProps {
  /** The fi-{style}-{name} icon name (legacy UICONS slug, omit the "fi-{style}-" prefix). */
  name: string;
  size?: number;
  /**
   * Legacy hint about UICONS family — "rr" (regular-rounded outline, default),
   * "sr" (solid-rounded), "br" (bold-rounded). Maps to Phosphor weight:
   *   "rr" → "regular", "sr" → "fill", "br" → "bold".
   * Visual fidelity in the new world is close enough that this knob mostly
   * affects the canvas-node status header strip where a heavier weight reads
   * as a stronger signal.
   */
  iconStyle?: UIconStyle;
  style?: React.CSSProperties;
}

/**
 * UIcon — Phosphor-backed shim that preserves the legacy UICONS slug API so
 * existing callers across surfaces continue to compile while the overhaul
 * lands. Each slug is mapped to its closest Phosphor equivalent. Unknown
 * slugs render a generic Question glyph so the page still composes; any
 * remaining unmapped slug should be added here as surfaces migrate.
 *
 * Once every caller has been rewritten to import from `@phosphor-icons/react`
 * directly, this file (and the `UIcon` export from the barrel) can be removed.
 */
const ICON_MAP: Record<string, Icon> = {
  // Chrome and basic UI
  home: House,
  settings: Gear,
  clock: Clock,
  question: Question,
  "sign-out-alt": SignOut,
  times: X,
  cross: X,
  check: Check,
  circle: Circle,
  "circle-small": Circle,
  exclamation: Warning,
  minus: Minus,
  star: Star,
  trash: Trash,
  pencil: Pencil,
  plus: Plus,
  eye: Eye,
  "eye-crossed": EyeSlash,

  // Zoom / arrows
  "zoom-in": MagnifyingGlassPlus,
  "zoom-out": MagnifyingGlassMinus,
  expand: ArrowsOut,
  compress: ArrowsIn,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  "angle-down": CaretDown,
  "angle-up": CaretUp,
  "angle-small-right": CaretRight,
  "angle-small-left": CaretLeft,
  "rotate-left": ArrowCounterClockwise,

  // Node type / semantic
  scale: Scales,
  "balance-scale-right": Scales,
  hashtag: Hash,
  diamond: Diamond,
  rhombus: Diamond,
  flag: Flag,
  "flag-alt": Flag,
  "chart-tree": TreeStructure,
  "list-check": ListChecks,
  "text-input": TextT,
  "comment-alt-middle": ChatCircleDots,
  circuit: CirclesThreePlus,
  trophy: Trophy,
  "book-alt": BookOpen,
  document: FileText,
  interrogation: Question,
  target: Crosshair,
  "apps-sort": SortAscending,
  sparkles: Sparkle,
};

const STYLE_TO_WEIGHT: Record<UIconStyle, "regular" | "fill" | "bold"> = {
  rr: "regular",
  sr: "fill",
  br: "bold",
};

export function UIcon({
  name,
  size = 16,
  iconStyle = "rr",
  style,
}: UIconProps): React.ReactElement {
  const Component = ICON_MAP[name] ?? Question;
  return (
    <span
      aria-hidden="true"
      data-icon-name={name}
      data-icon-style={iconStyle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        lineHeight: 1,
        ...style,
      }}
    >
      <Component size={size} weight={STYLE_TO_WEIGHT[iconStyle]} />
    </span>
  );
}
