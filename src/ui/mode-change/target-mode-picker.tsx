import type { ReactElement } from "react";
import { Check, Scales, BookOpen } from "@phosphor-icons/react";
import type { Mode, Flavor } from "@/schema";
import { RadioGroup, RadioGroupItem } from "#components/ui/radio-group";
import { cn } from "#lib/utils";

export interface TargetModePickerProps {
  current_mode: Mode;
  current_flavor: Flavor | undefined;
  target_mode: Mode;
  target_flavor: Flavor | undefined;
  onTargetModeChanged?: (mode: Mode) => void;
  onTargetFlavorChanged: (flavor: Flavor) => void;
}

// Radio card: the entire card surface is the click target. A shadcn
// RadioGroupItem renders inside (visually hidden via sr-only) so keyboard
// users still get radiogroup roving focus + selection semantics; the click
// path goes through the card's own onClick to keep label-association
// quirks across DOM implementations off the critical path.
function RadioCard({
  testId,
  value,
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  testId: string;
  value: string;
  label: string;
  description?: string;
  icon?: ReactElement;
  selected: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <div
      data-testid={testId}
      data-selected={selected ? "true" : "false"}
      role="presentation"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 cursor-pointer flex-col gap-1 rounded-2xl border bg-card p-3 text-card-foreground ring-1 ring-foreground/5 transition-colors hover:bg-muted/30",
        selected && "border-primary bg-muted/30 ring-primary/30",
      )}
    >
      <RadioGroupItem value={value} aria-label={label} className="sr-only" />
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium capitalize">{label}</span>
        {selected ? (
          <span
            data-testid={`${testId}-check`}
            className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check size={12} weight="bold" />
          </span>
        ) : null}
      </div>
      {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    </div>
  );
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  legal: "Authority-aware, jurisdiction-aware reasoning.",
  general: "Open-ended argumentation outside law.",
};

const FLAVOR_DESCRIPTIONS: Record<Flavor, string> = {
  personal: "Practical, individual analysis.",
  academic: "Scholarly framing.",
};

export function TargetModePicker(props: TargetModePickerProps): ReactElement {
  const current_label =
    props.current_mode === "legal" ? "legal" : `general (${props.current_flavor ?? "personal"})`;
  const target_label =
    props.target_mode === "legal" ? "legal" : `general (${props.target_flavor ?? "personal"})`;

  return (
    <div data-testid="target-mode-picker" className="py-3">
      <div className="text-xs text-muted-foreground">
        Currently: <span data-testid="target-mode-current">{current_label}</span>
      </div>
      {props.onTargetModeChanged ? (
        <div data-testid="target-mode-fieldset" className="mt-2">
          <div className="text-xs text-muted-foreground mb-1">Switch to mode:</div>
          <RadioGroup
            value={props.target_mode}
            onValueChange={(v) => props.onTargetModeChanged?.(v as Mode)}
            className="grid grid-cols-2 gap-3"
            aria-label="Switch to mode"
          >
            <RadioCard
              testId="target-mode-legal"
              value="legal"
              label="legal"
              description={MODE_DESCRIPTIONS.legal}
              icon={<Scales size={16} />}
              selected={props.target_mode === "legal"}
              onClick={() => props.onTargetModeChanged?.("legal")}
            />
            <RadioCard
              testId="target-mode-general"
              value="general"
              label="general"
              description={MODE_DESCRIPTIONS.general}
              icon={<BookOpen size={16} />}
              selected={props.target_mode === "general"}
              onClick={() => props.onTargetModeChanged?.("general")}
            />
          </RadioGroup>
        </div>
      ) : (
        <div className="mt-2 text-sm text-foreground">
          Switch to: <span data-testid="target-mode-target">{target_label}</span>
        </div>
      )}
      {props.target_mode === "general" ? (
        <div data-testid="target-flavor-fieldset" className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">Flavor:</div>
          <RadioGroup
            value={props.target_flavor ?? "personal"}
            onValueChange={(v) => props.onTargetFlavorChanged(v as Flavor)}
            className="grid grid-cols-2 gap-3"
            aria-label="Flavor"
          >
            <RadioCard
              testId="target-flavor-personal"
              value="personal"
              label="personal"
              description={FLAVOR_DESCRIPTIONS.personal}
              selected={props.target_flavor === "personal"}
              onClick={() => props.onTargetFlavorChanged("personal")}
            />
            <RadioCard
              testId="target-flavor-academic"
              value="academic"
              label="academic"
              description={FLAVOR_DESCRIPTIONS.academic}
              selected={props.target_flavor === "academic"}
              onClick={() => props.onTargetFlavorChanged("academic")}
            />
          </RadioGroup>
        </div>
      ) : null}
    </div>
  );
}
