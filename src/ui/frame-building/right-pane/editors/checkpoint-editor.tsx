import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type {
  Checkpoint,
  CheckpointAnswerType,
  CheckpointOption,
  BurdenLevel,
  Node,
  NodeRef,
} from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { SegmentedToggle, NodeChip } from "../../../primitives";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Checkbox } from "#components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface CheckpointEditorProps {
  node: Checkpoint;
  on_pick_option_target: (option_id: string) => void;
  on_navigate_to_node?: (node_id: NodeRef) => void;
}

const ANSWER_TYPE_OPTIONS: { value: CheckpointAnswerType; label: string }[] = [
  { value: "boolean", label: "Yes / No" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "graded", label: "Graded" },
];

const BURDEN_LEVELS: { value: BurdenLevel; label: string }[] = [
  { value: "preponderance", label: "Preponderance of the Evidence" },
  { value: "clear_and_convincing", label: "Clear and Convincing" },
  { value: "beyond_reasonable_doubt", label: "Beyond a Reasonable Doubt" },
  { value: "scintilla", label: "Scintilla" },
  { value: "substantial_evidence", label: "Substantial Evidence" },
];

const BURDEN_LEVEL_NONE = "__none__";

export function CheckpointEditor(props: CheckpointEditorProps): ReactElement {
  const { node, on_pick_option_target, on_navigate_to_node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const frame_version_nodes = useFrameStore((s) => s.frame_version?.nodes ?? []);

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  function updateOption(option_id: string, updated: Partial<CheckpointOption>) {
    const next_options = node.options.map((o) => (o.id === option_id ? { ...o, ...updated } : o));
    patch({ options: next_options });
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="question" label="Question">
        <Textarea
          rows={3}
          defaultValue={node.question}
          onBlur={(e) => patch({ question: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>

      <div className="flex flex-col gap-1">
        <Label>Answer Type</Label>
        <div>
          <SegmentedToggle
            options={ANSWER_TYPE_OPTIONS}
            value={node.answer_type}
            onChange={(next) => patch({ answer_type: next as CheckpointAnswerType })}
            aria_label="Answer type"
          />
        </div>
      </div>

      {(node.answer_type === "multiple_choice" || node.answer_type === "graded") && (
        <div className="flex flex-col gap-1">
          <Label>Options</Label>
          <div className="flex flex-col gap-2">
            {node.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  type="text"
                  className="flex-1"
                  defaultValue={opt.label}
                  onBlur={(e) => updateOption(opt.id, { label: e.currentTarget.value })}
                  placeholder="Option label"
                />
                {opt.target_node_id ? (
                  <NodeChip
                    node_id={opt.target_node_id as NodeRef}
                    nodes={frame_version_nodes}
                    on_navigate={on_navigate_to_node}
                    max_chars={32}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => on_pick_option_target(opt.id)}
                    className="whitespace-nowrap"
                  >
                    <Plus size={12} />
                    Target
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "legal" && (
        <>
          <Label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              defaultChecked={node.requires_authority}
              onCheckedChange={(checked) => patch({ requires_authority: checked === true })}
            />
            <span>Requires Authority</span>
          </Label>

          <div className="flex flex-col gap-1">
            <Label>Burden Level</Label>
            <Select
              defaultValue={node.burden_level ?? BURDEN_LEVEL_NONE}
              onValueChange={(value) =>
                patch({
                  burden_level: value === BURDEN_LEVEL_NONE ? undefined : (value as BurdenLevel),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BURDEN_LEVEL_NONE}>— None —</SelectItem>
                {BURDEN_LEVELS.map((bl) => (
                  <SelectItem key={bl.value} value={bl.value}>
                    {bl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
