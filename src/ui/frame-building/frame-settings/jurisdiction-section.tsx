import type { ReactElement } from "react";
import type { Jurisdiction } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";

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

const REGION_NONE = "__none__";
const COURT_NONE = "__none__";

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="jur-level">Jurisdiction Level</Label>
        <Select
          value={jur.level}
          onValueChange={(value) =>
            patch({
              level: value as Jurisdiction["level"],
              region: undefined,
              court: undefined,
            })
          }
        >
          <SelectTrigger id="jur-level" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="federal">Federal</SelectItem>
            <SelectItem value="state">State</SelectItem>
            <SelectItem value="tribal">Tribal</SelectItem>
            <SelectItem value="territory">Territory</SelectItem>
            <SelectItem value="international">International</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {jur.level === "state" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="jur-region">State</Label>
          <Select
            value={jur.region ?? REGION_NONE}
            onValueChange={(value) => patch({ region: value === REGION_NONE ? undefined : value })}
          >
            <SelectTrigger id="jur-region" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REGION_NONE}>— Select state —</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(jur.level === "tribal" || jur.level === "territory" || jur.level === "international") && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="jur-region-text">Region / Name</Label>
          <Input
            id="jur-region-text"
            type="text"
            value={jur.region ?? ""}
            placeholder="Enter jurisdiction name"
            onChange={(e) => patch({ region: e.target.value || undefined })}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="jur-court">Court</Label>
        {is_federal ? (
          <Select
            value={jur.court ?? COURT_NONE}
            onValueChange={(value) => patch({ court: value === COURT_NONE ? undefined : value })}
          >
            <SelectTrigger id="jur-court" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={COURT_NONE}>— Select court —</SelectItem>
              {FEDERAL_COURTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="jur-court"
            type="text"
            value={jur.court ?? ""}
            placeholder="e.g. Supreme Court, Court of Appeals"
            onChange={(e) => patch({ court: e.target.value || undefined })}
          />
        )}
      </div>
    </div>
  );
}
