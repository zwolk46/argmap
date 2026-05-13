import type { ReactElement } from "react";
import type { Mode, Flavor } from "@/schema";

export interface TargetModePickerProps {
  current_mode: Mode;
  current_flavor: Flavor | undefined;
  target_mode: Mode;
  target_flavor: Flavor | undefined;
  onTargetFlavorChanged: (flavor: Flavor) => void;
}

export function TargetModePicker(props: TargetModePickerProps): ReactElement {
  const current_label =
    props.current_mode === "legal" ? "legal" : `general (${props.current_flavor ?? "personal"})`;
  const target_label =
    props.target_mode === "legal" ? "legal" : `general (${props.target_flavor ?? "personal"})`;

  return (
    <div data-testid="target-mode-picker" style={{ padding: "var(--space-3, 12px) 0" }}>
      <div
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        Currently: <span data-testid="target-mode-current">{current_label}</span>
      </div>
      <div
        style={{
          marginTop: "var(--space-2, 8px)",
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-primary, #111827)",
        }}
      >
        Switch to: <span data-testid="target-mode-target">{target_label}</span>
      </div>
      {props.target_mode === "general" ? (
        <fieldset
          data-testid="target-flavor-fieldset"
          style={{
            border: "none",
            padding: 0,
            marginTop: "var(--space-2, 8px)",
            display: "flex",
            gap: "var(--space-3, 12px)",
          }}
        >
          <legend
            style={{
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-secondary, #6b7280)",
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
