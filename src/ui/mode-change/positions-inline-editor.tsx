import * as React from "react";
import type { ReactElement } from "react";
import { Plus, X } from "@phosphor-icons/react";
import type { Position } from "@/schema";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Card, CardContent } from "#components/ui/card";

export interface PositionsInlineEditorProps {
  staged_positions: Position[];
  onPositionStaged: (position: Position) => void;
  onPositionRemoved: (position_id: string) => void;
  generateId: () => string;
}

export function PositionsInlineEditor(props: PositionsInlineEditorProps): ReactElement {
  const [draft, setDraft] = React.useState("");

  function commitDraft(): void {
    const trimmed = draft.trim();
    if (!trimmed) return;
    props.onPositionStaged({ id: props.generateId(), label: trimmed });
    setDraft("");
  }

  return (
    <Card data-testid="positions-inline-editor" className="mt-3">
      <CardContent className="space-y-2 p-3">
        <div className="text-xs text-muted-foreground">Required: define at least one position</div>
        {props.staged_positions.map((p) => (
          <div key={p.id} data-testid="staged-position-row" className="flex items-center gap-2">
            <span className="text-sm">{p.label}</span>
            {/* KEEP RAW: tiny inline × glyph in a staged-position row; bespoke micro-control. */}
            <button
              type="button"
              data-testid="remove-staged-position"
              onClick={() => props.onPositionRemoved(p.id)}
              className="cursor-pointer rounded-full border-0 bg-transparent p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={`Remove staged position ${p.label}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            data-testid="position-draft-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            placeholder="Position label"
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            data-testid="position-add-button"
            onClick={commitDraft}
            disabled={!draft.trim()}
          >
            <Plus size={12} data-icon="inline-start" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
