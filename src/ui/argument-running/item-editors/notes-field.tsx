import type { ReactElement } from "react";
import { Label } from "#components/ui/label";
import { Textarea } from "#components/ui/textarea";

export interface NotesFieldProps {
  value: string;
  on_change: (next: string) => void;
  placeholder?: string;
  min_height?: string;
  max_height?: string;
}

export function NotesField(props: NotesFieldProps): ReactElement {
  const { value, on_change, placeholder, min_height = "60px", max_height = "180px" } = props;
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
      <Textarea
        data-testid="notes-field"
        value={value}
        placeholder={placeholder ?? "Anything to record about this item…"}
        onChange={(e) => on_change(e.target.value)}
        className="resize-y text-xs"
        style={{ minHeight: min_height, maxHeight: max_height }}
      />
    </div>
  );
}
