import type { ReactElement, ReactNode } from "react";
import type { NodeRef } from "@/schema";
import { AiAttributionChip } from "../../primitives";
import { useFieldAttribution } from "./use-field-attribution";

export interface FieldAttributionDecorationProps {
  node_id: NodeRef;
  field_path: string;
  label: string;
  children: ReactNode;
}

export function FieldAttributionDecoration(props: FieldAttributionDecorationProps): ReactElement {
  const { node_id, field_path, label, children } = props;
  const attribution = useFieldAttribution(node_id, field_path);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
        }}
      >
        <label className="argmap-section-heading">{label}</label>
        {attribution && <AiAttributionChip record={attribution} />}
      </div>
      {children}
    </div>
  );
}
