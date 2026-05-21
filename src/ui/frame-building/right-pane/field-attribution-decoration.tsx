import type { ReactElement, ReactNode } from "react";
import type { NodeRef } from "@/schema";
import { AiAttributionChip } from "../../primitives";
import { Label } from "#components/ui/label";
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {attribution && <AiAttributionChip record={attribution} />}
      </div>
      {children}
    </div>
  );
}
