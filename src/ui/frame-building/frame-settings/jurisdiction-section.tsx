import type { ReactElement } from "react";
import type { Jurisdiction } from "@/schema";
import { useFrameStore, useRepository } from "@/state";

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs, 11px)",
  fontWeight: 600,
  color: "var(--color-text-tertiary, #9ca3af)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "var(--space-1, 4px)",
};

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2, 8px) var(--space-3, 12px)",
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
  background: "var(--color-surface-pane, #f9fafb)",
  border: "1px solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  outline: "none",
  boxSizing: "border-box",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2, 8px) var(--space-3, 12px)",
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
  background: "var(--color-surface-pane, #f9fafb)",
  border: "1px solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  outline: "none",
  boxSizing: "border-box",
};

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const FEDERAL_COURTS = [
  "U.S. Supreme Court",
  "U.S. Court of Appeals (1st Cir.)",
  "U.S. Court of Appeals (2nd Cir.)",
  "U.S. Court of Appeals (3rd Cir.)",
  "U.S. Court of Appeals (4th Cir.)",
  "U.S. Court of Appeals (5th Cir.)",
  "U.S. Court of Appeals (6th Cir.)",
  "U.S. Court of Appeals (7th Cir.)",
  "U.S. Court of Appeals (8th Cir.)",
  "U.S. Court of Appeals (9th Cir.)",
  "U.S. Court of Appeals (10th Cir.)",
  "U.S. Court of Appeals (11th Cir.)",
  "U.S. Court of Appeals (D.C. Cir.)",
  "U.S. Court of Appeals (Fed. Cir.)",
  "U.S. District Court",
];

export function JurisdictionSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);
  const { frame_store } = useRepository();

  if (!frame) return null;

  const jur: Jurisdiction = frame.jurisdiction_default ?? {
    level: "federal",
    region: undefined,
    court: undefined,
  };

  function patch(partial: Partial<Jurisdiction>) {
    frame_store.getState().applyPatch({
      kind: "metadata_edited",
      partial: { jurisdiction_default: { ...jur, ...partial } },
    });
  }

  const is_federal = jur.level === "federal";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      <div>
        <label style={LABEL_STYLE} htmlFor="jur-level">
          Jurisdiction Level
        </label>
        <select
          id="jur-level"
          value={jur.level}
          style={SELECT_STYLE}
          onChange={(e) =>
            patch({
              level: e.target.value as Jurisdiction["level"],
              region: undefined,
              court: undefined,
            })
          }
        >
          <option value="federal">Federal</option>
          <option value="state">State</option>
          <option value="tribal">Tribal</option>
          <option value="territory">Territory</option>
          <option value="international">International</option>
        </select>
      </div>

      {jur.level === "state" && (
        <div>
          <label style={LABEL_STYLE} htmlFor="jur-region">
            State
          </label>
          <select
            id="jur-region"
            value={jur.region ?? ""}
            style={SELECT_STYLE}
            onChange={(e) => patch({ region: e.target.value || undefined })}
          >
            <option value="">— Select state —</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {(jur.level === "tribal" || jur.level === "territory" || jur.level === "international") && (
        <div>
          <label style={LABEL_STYLE} htmlFor="jur-region-text">
            Region / Name
          </label>
          <input
            id="jur-region-text"
            type="text"
            value={jur.region ?? ""}
            style={INPUT_STYLE}
            placeholder="Enter jurisdiction name"
            onChange={(e) => patch({ region: e.target.value || undefined })}
          />
        </div>
      )}

      <div>
        <label style={LABEL_STYLE} htmlFor="jur-court">
          Court
        </label>
        {is_federal ? (
          <select
            id="jur-court"
            value={jur.court ?? ""}
            style={SELECT_STYLE}
            onChange={(e) => patch({ court: e.target.value || undefined })}
          >
            <option value="">— Select court —</option>
            {FEDERAL_COURTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="jur-court"
            type="text"
            value={jur.court ?? ""}
            style={INPUT_STYLE}
            placeholder="e.g. Supreme Court, Court of Appeals"
            onChange={(e) => patch({ court: e.target.value || undefined })}
          />
        )}
      </div>
    </div>
  );
}
