import type { ReactElement, ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#components/ui/collapsible";

export interface InspectorCollapsibleSectionProps {
  title: string;
  /** Optional right-aligned chip / count rendered in the header. */
  meta?: ReactNode;
  /** Default-open state. Defaults to true. */
  default_open?: boolean;
  children: ReactNode;
}

/**
 * Generic collapsible-section wrapper used by the right-pane Inspector for
 * Notes, Options box, and Validation. The header is a real button (so the
 * pointer styles + keyboard activation come for free) and the chevron
 * animates a 90° rotate when open via data-[state=open].
 */
export function InspectorCollapsibleSection(props: InspectorCollapsibleSectionProps): ReactElement {
  const { title, meta, default_open = true, children } = props;
  return (
    <Collapsible defaultOpen={default_open} className="flex flex-col">
      <CollapsibleTrigger
        className="group/section flex items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        aria-label={`Toggle ${title} section`}
      >
        <span className="flex items-center gap-1.5">
          <CaretRight
            size={12}
            className="transition-transform duration-150 group-data-[state=open]/section:rotate-90"
          />
          <span>{title}</span>
        </span>
        {meta ? <span className="shrink-0">{meta}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}
