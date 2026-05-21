import * as React from "react";
import type { OutputViewPayload, SessionShape } from "@/state";
import { useAiSuggestion } from "@/ui";
import { Button } from "#components/ui/button";
import { EmptyState } from "../../primitives/loading-screen";
import { AiSparkle } from "../../primitives/ai-sparkle";
import { AiAttributionChip } from "../../primitives/ai-attribution-chip";

export interface ProseTabProps {
  payload: OutputViewPayload | null;
}

export function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}

export function proseToMarkdown(canonical: string, shape: SessionShape): string {
  const heading =
    shape === "determinate"
      ? "## Conclusion"
      : shape === "conditional"
        ? "## Conditional conclusion"
        : shape === "contested"
          ? "## Contested"
          : "## Indeterminate";
  return `${heading}\n\n${canonical}`;
}

export function ProseTab(props: ProseTabProps): React.ReactElement {
  const { payload } = props;
  const aiSuggestion = useAiSuggestion("session");

  if (!payload || !payload.prose) {
    const shape = payload?.shape;
    const label =
      shape === "incomplete" ? "Not enough to write a conclusion yet" : "No prose to render yet";
    const description =
      shape === "incomplete"
        ? "Add premises and answers in the Interview pane on the left. Once the runtime can produce a conclusion, the prose write-up appears here."
        : "Prose appears once the session resolves. Switch to Path overlay to see the structure on the canvas.";
    return (
      <div data-testid="prose-tab-empty" className="h-full">
        <EmptyState label={label} description={description} />
      </div>
    );
  }

  const canonical = payload.prose.canonical ?? "";
  const rewritten = payload.prose.rewritten;
  const rewrite_invocation = payload.prose.rewrite_invocation;
  const shape = payload.shape;
  const has_rewrite = typeof rewritten === "string" && rewritten.length > 0;
  const invoke_disabled = aiSuggestion.status === "invoking";

  return (
    <div data-testid="prose-tab" className="h-full overflow-auto bg-background px-6 py-6">
      <article className="relative mx-auto" style={{ maxWidth: "640px" }}>
        {/* Floating action row — top right of column. Canonical surface itself remains unlabeled. */}
        <div className="mb-3 flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            data-testid="prose-copy"
            onClick={() => copyTextToClipboard(canonical)}
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-testid="prose-copy-markdown"
            onClick={() => copyTextToClipboard(proseToMarkdown(canonical, shape))}
          >
            Copy as Markdown
          </Button>
          {/* §12 F-10: when a prior rewrite exists, give the user an explicit
              baseline choice — "Refine" iterates on the existing rewrite,
              "Rewrite from canonical" discards it and starts fresh from the
              deterministic prose. */}
          {shape !== "incomplete" && aiSuggestion.enabled ? (
            has_rewrite ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="prose-refine-rewrite"
                  onClick={() =>
                    aiSuggestion.invoke("G6", {
                      baseline: rewritten,
                      baseline_kind: "rewrite",
                    })
                  }
                  disabled={invoke_disabled}
                >
                  <AiSparkle />
                  Refine rewrite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="prose-rewrite-from-canonical"
                  onClick={() =>
                    aiSuggestion.invoke("G6", {
                      baseline: canonical,
                      baseline_kind: "canonical",
                    })
                  }
                  disabled={invoke_disabled}
                >
                  <AiSparkle />
                  Rewrite from canonical
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                data-testid="prose-suggest-rewrite"
                onClick={() =>
                  aiSuggestion.invoke("G6", {
                    baseline: canonical,
                    baseline_kind: "canonical",
                  })
                }
                disabled={invoke_disabled}
              >
                <AiSparkle />
                Suggest rewrite
              </Button>
            )
          ) : null}
        </div>

        {/* Canonical prose — unlabeled, no chrome (F-002 carry: primary surface). */}
        <div data-testid="prose-canonical-block">
          <p
            className="m-0 whitespace-pre-wrap text-base leading-relaxed text-foreground"
            style={{
              fontFamily: "var(--font-serif)",
            }}
          >
            {canonical}
          </p>
        </div>

        {rewritten ? (
          <section
            data-testid="prose-rewritten-block"
            className="mt-6 rounded-r-md px-5 py-4"
            style={{
              maxWidth: "85%",
              borderLeft: "var(--border-thick) solid var(--color-ai-accent)",
              background: "var(--color-ai-accent-bg)",
            }}
          >
            <header className="mb-2 flex items-center justify-between gap-2">
              {/* §12 F-09: pass the rewrite invocation record when available
                  so the chip's tooltip renders model + prompt-version + invoked-at. */}
              <AiAttributionChip record={rewrite_invocation ?? null} hook_id="G6" />
              <Button
                size="sm"
                variant="ghost"
                data-testid="prose-copy-rewritten"
                onClick={() => copyTextToClipboard(rewritten)}
              >
                Copy
              </Button>
            </header>
            <p
              className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
              style={{
                fontFamily: "var(--font-serif)",
              }}
            >
              {rewritten}
            </p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
