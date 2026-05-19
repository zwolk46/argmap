import type { ReactElement } from "react";
import type { Mode, Flavor } from "@/schema";

export interface TargetModePickerProps {
  current_mode: Mode;
  current_flavor: Flavor | undefined;
  target_mode: Mode;
  target_flavor: Flavor | undefined;
  onTargetModeChanged?: (mode: Mode) => void;
  onTargetFlavorChanged: (flavor: Flavor) => void;
}

export function TargetModePicker(props: TargetModePickerProps): ReactElement {
  const current_label =
    props.current_mode === "legal" ? "legal" : `general (${props.current_flavor ?? "personal"})`;
  const target_label =
    props.target_mode === "legal" ? "legal" : `general (${props.target_flavor ?? "personal"})`;

  return (
    <div data-testid="target-mode-picker" style={{ padding: "var(--space-3) 0" }}>
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
        }}
      >
        Currently: <span data-testid="target-mode-current">{current_label}</span>
      </div>
      {props.onTargetModeChanged ? (
        <fieldset
          data-testid="target-mode-fieldset"
          style={{
            border: "none",
            padding: 0,
            marginTop: "var(--space-2)",
            display: "flex",
            gap: "var(--space-3)",
          }}
        >
          <legend
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
            }}
          >
            Switch to mode:
          </legend>
          {(["legal", "general"] as const).map((m) => (
            <label key={m} data-testid={`target-mode-${m}`}>
              <input
                type="radio"
                name="target-mode"
                value={m}
                checked={props.target_mode === m}
                onChange={() => props.onTargetModeChanged?.(m)}
              />{" "}
              {m}
            </label>
          ))}
        </fieldset>
      ) : (
        <div
          style={{
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
          }}
        >
          Switch to: <span data-testid="target-mode-target">{target_label}</span>
        </div>
      )}
      {props.target_mode === "general" ? (
        <fieldset
          data-testid="target-flavor-fieldset"
          style={{
            border: "none",
            padding: 0,
            marginTop: "var(--space-2)",
            display: "flex",
            gap: "var(--space-3)",
          }}
        >
          <legend
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
            }}
          >
            Flavor:
          </legend>
          {(["personal", "academic"] as const).map((f) => (
            <label key={f} data-testid={`target-flavor-${f}`}>
              <input
                type="radio"
                name="target-flavor"
                value={f}
                checked={props.target_flavor === f}
                onChange={() => props.onTargetFlavorChanged(f)}
              />{" "}
              {f}
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}
