import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { humanizeNodeType, InlineEmpty, Pill } from "../../primitives";
import { Button } from "#components/ui/button";
import { Card, CardContent } from "#components/ui/card";

export interface InspectorEmptyProps {
  on_open_settings: () => void;
}

export function InspectorEmpty(props: InspectorEmptyProps): ReactElement {
  const { on_open_settings } = props;
  const frame = useFrameStore((s) => s.frame);

  if (!frame) {
    return <InlineEmpty testId="inspector-no-frame">No frame loaded.</InlineEmpty>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm" aria-label="Inspector hint">
        <CardContent>
          <p className="m-0 text-sm leading-snug text-muted-foreground">
            Select a node on the canvas to edit it here. With nothing selected, this panel shows the
            frame&apos;s overall settings.
          </p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</h3>
        <div className="text-sm leading-snug text-foreground">
          {frame.title || "Untitled frame"}
        </div>
        {frame.description && (
          <>
            <h3 className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </h3>
            <div className="text-sm leading-snug text-foreground">{frame.description}</div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mode &amp; Flavor
        </h3>
        <div className="text-sm leading-snug text-foreground">
          {frame.mode === "legal" ? "Legal" : "General"}
          {frame.flavor ? ` / ${frame.flavor}` : ""}
        </div>
      </section>

      {frame.tags && frame.tags.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {frame.tags.map((tag) => (
              <Pill key={tag} variant="neutral" size="xs">
                {tag}
              </Pill>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Default Satisfaction Policies
        </h3>
        <div className="text-sm text-muted-foreground">
          {Object.entries(frame.default_satisfaction_policies ?? {}).map(([type, policy]) => (
            <div key={type} className="flex justify-between py-0.5">
              <span>{humanizeNodeType(type)}</span>
              <span>
                {policy
                  ? `${policy.all_of?.length ?? 0} condition${policy.all_of?.length === 1 ? "" : "s"}`
                  : "system default"}
              </span>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={on_open_settings} className="mt-2">
            Edit in settings
          </Button>
        </div>
      </section>
    </div>
  );
}
