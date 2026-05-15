import type { ReactElement } from "react";
import type { Jurisdiction } from "@/schema";
import { useFrameStore, useRepository } from "@/state";

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
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
          htmlFor="jur-level"
        >
          Jurisdiction Level
        </label>
        <select
          id="jur-level"
          value={jur.level}
          className="argmap-input"
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
          <label
            className="argmap-section-heading"
            style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
            htmlFor="jur-region"
          >
            State
          </label>
          <select
            id="jur-region"
            value={jur.region ?? ""}
            className="argmap-input"
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
          <label
            className="argmap-section-heading"
            style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
            htmlFor="jur-region-text"
          >
            Region / Name
          </label>
          <input
            id="jur-region-text"
            type="text"
            value={jur.region ?? ""}
            className="argmap-input"
            placeholder="Enter jurisdiction name"
            onChange={(e) => patch({ region: e.target.value || undefined })}
          />
        </div>
      )}

      <div>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
          htmlFor="jur-court"
        >
          Court
        </label>
        {is_federal ? (
          <select
            id="jur-court"
            value={jur.court ?? ""}
            className="argmap-input"
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
            className="argmap-input"
            placeholder="e.g. Supreme Court, Court of Appeals"
            onChange={(e) => patch({ court: e.target.value || undefined })}
          />
        )}
      </div>
    </div>
  );
}
