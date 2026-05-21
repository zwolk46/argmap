import * as React from "react";
import type { ReactElement } from "react";
import type {
  FrameVersionId,
  SessionVersionId,
  NodeRef,
  EdgeRef,
  FrameVersion,
  ArgumentSessionVersion,
  Node as SchemaNode,
  Edge as SchemaEdge,
  Premise,
  Authority,
} from "@/schema";
import {
  diffFrameVersions,
  diffSessionVersions,
  useRepository,
  type StructuralDiff,
  type SessionStructuralDiff,
} from "@/state";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "#components/ui/button";
import { ScrollArea } from "#components/ui/scroll-area";
import { CompareEntryList } from "./compare-entry-list";
import type { CompareEntryRowDescriptor } from "./compare-entry-row";

export interface CompareViewProps {
  entity_kind: "frame" | "session";
  from_id: FrameVersionId | SessionVersionId;
  to_id: FrameVersionId | SessionVersionId;
  from_version_number: number;
  to_version_number: number;
  on_back: () => void;
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ready";
      a: FrameVersion | ArgumentSessionVersion;
      b: FrameVersion | ArgumentSessionVersion;
    }
  | { kind: "error"; error: Error };

function nodeStatementPreview(node: SchemaNode | undefined): string {
  if (!node) return "";
  if ("question" in node) return (node as { question: string }).question.slice(0, 80);
  if ("statement" in node) return (node as { statement: string }).statement.slice(0, 80);
  if ("name" in node) return (node as { name: string }).name.slice(0, 80);
  if ("citation" in node) return (node as { citation: string }).citation.slice(0, 80);
  return node.id;
}

function nodeType(node: SchemaNode | undefined): string {
  return node?.type ?? "SubQuestion";
}

function edgeEndpointsPreview(edge: SchemaEdge | undefined): string {
  if (!edge) return "";
  return `${edge.type}: ${edge.source} → ${edge.target}`;
}

function premisePreview(p: Premise | undefined): string {
  if (!p) return "";
  return p.statement.slice(0, 80);
}

function authorityPreview(a: Authority | undefined): string {
  if (!a) return "";
  return a.citation.slice(0, 80);
}

// §8 #6 interim: checkpoint and interpretation rows describe entities whose
// human-readable text (Checkpoint.question, Term.name) lives on the *frame*,
// not the session version. ArgumentSessionVersion has no
// frame_version_snapshot today (handoff item 3 / §8 #1 will add one), so the
// page-level loader only has session versions in scope. Until that lands,
// label these rows with a type-prefixed truncated id rather than the raw
// uuid — strictly less hostile than what the row used to render.
function truncatedIdPreview(prefix: string, id: string): string {
  const head = id.length > 12 ? `${id.slice(0, 12)}…` : id;
  return `${prefix} ${head}`;
}

function buildFrameRows(
  a: FrameVersion,
  b: FrameVersion,
  diff: StructuralDiff,
): {
  added: CompareEntryRowDescriptor[];
  removed: CompareEntryRowDescriptor[];
  edited: CompareEntryRowDescriptor[];
  edges_added: CompareEntryRowDescriptor[];
  edges_removed: CompareEntryRowDescriptor[];
  edges_edited: CompareEntryRowDescriptor[];
  metadata: CompareEntryRowDescriptor[];
  layout_only: CompareEntryRowDescriptor[];
} {
  const nodes_a = new Map(a.nodes.map((n) => [n.id, n]));
  const nodes_b = new Map(b.nodes.map((n) => [n.id, n]));
  const edges_a = new Map(a.edges.map((e) => [e.id, e]));
  const edges_b = new Map(b.edges.map((e) => [e.id, e]));

  const added: CompareEntryRowDescriptor[] = diff.nodes.added.map((id) => ({
    kind: "node_added",
    node_id: id,
    node_type: nodeType(nodes_b.get(id)),
    statement_preview: nodeStatementPreview(nodes_b.get(id)),
  }));
  const removed: CompareEntryRowDescriptor[] = diff.nodes.removed.map((id) => ({
    kind: "node_removed",
    node_id: id,
    node_type: nodeType(nodes_a.get(id)),
    statement_preview: nodeStatementPreview(nodes_a.get(id)),
  }));
  const edited: CompareEntryRowDescriptor[] = diff.nodes.edited.map((e) => ({
    kind: "node_edited",
    node_id: e.id,
    node_type: nodeType(nodes_b.get(e.id) ?? nodes_a.get(e.id)),
    statement_preview: nodeStatementPreview(nodes_b.get(e.id) ?? nodes_a.get(e.id)),
    fields_changed: e.fields_changed,
  }));
  const edges_added: CompareEntryRowDescriptor[] = diff.edges.added.map((id) => ({
    kind: "edge_added",
    edge_id: id,
    edge_type: edges_b.get(id)?.type ?? "",
    endpoints_preview: edgeEndpointsPreview(edges_b.get(id)),
  }));
  const edges_removed: CompareEntryRowDescriptor[] = diff.edges.removed.map((id) => ({
    kind: "edge_removed",
    edge_id: id,
    edge_type: edges_a.get(id)?.type ?? "",
    endpoints_preview: edgeEndpointsPreview(edges_a.get(id)),
  }));
  const edges_edited: CompareEntryRowDescriptor[] = diff.edges.edited.map((e) => ({
    kind: "edge_edited",
    edge_id: e.id,
    edge_type: edges_b.get(e.id)?.type ?? edges_a.get(e.id)?.type ?? "",
    endpoints_preview: edgeEndpointsPreview(edges_b.get(e.id) ?? edges_a.get(e.id)),
    fields_changed: e.fields_changed,
  }));
  const metadata: CompareEntryRowDescriptor[] = diff.metadata.changed_fields.map((m) => ({
    kind: "metadata_changed",
    field: m.field,
  }));
  const layout_only: CompareEntryRowDescriptor[] =
    diff.layout_changed_count > 0
      ? [{ kind: "layout_only_summary", node_count: diff.layout_changed_count }]
      : [];

  return {
    added,
    removed,
    edited,
    edges_added,
    edges_removed,
    edges_edited,
    metadata,
    layout_only,
  };
}

export function buildSessionRows(
  a: ArgumentSessionVersion,
  b: ArgumentSessionVersion,
  diff: SessionStructuralDiff,
): {
  premises_added: CompareEntryRowDescriptor[];
  premises_removed: CompareEntryRowDescriptor[];
  premises_edited: CompareEntryRowDescriptor[];
  argument_edges_added: CompareEntryRowDescriptor[];
  argument_edges_removed: CompareEntryRowDescriptor[];
  argument_edges_edited: CompareEntryRowDescriptor[];
  checkpoint_added: CompareEntryRowDescriptor[];
  checkpoint_removed: CompareEntryRowDescriptor[];
  checkpoint_edited: CompareEntryRowDescriptor[];
  authorities_added: CompareEntryRowDescriptor[];
  authorities_removed: CompareEntryRowDescriptor[];
  authorities_edited: CompareEntryRowDescriptor[];
  interp_added: CompareEntryRowDescriptor[];
  interp_removed: CompareEntryRowDescriptor[];
  interp_edited: CompareEntryRowDescriptor[];
  metadata: CompareEntryRowDescriptor[];
} {
  const premises_a = new Map(a.premises.map((p) => [p.id, p]));
  const premises_b = new Map(b.premises.map((p) => [p.id, p]));
  const edges_a = new Map(a.argument_edges.map((e) => [e.id, e]));
  const edges_b = new Map(b.argument_edges.map((e) => [e.id, e]));
  const auths_a = new Map((a.session_authorities ?? []).map((au) => [au.id, au]));
  const auths_b = new Map((b.session_authorities ?? []).map((au) => [au.id, au]));

  return {
    premises_added: diff.premises.added.map((id) => ({
      kind: "node_added",
      node_id: id,
      node_type: "Premise",
      statement_preview: premisePreview(premises_b.get(id)),
    })),
    premises_removed: diff.premises.removed.map((id) => ({
      kind: "node_removed",
      node_id: id,
      node_type: "Premise",
      statement_preview: premisePreview(premises_a.get(id)),
    })),
    premises_edited: diff.premises.edited.map((e) => ({
      kind: "node_edited",
      node_id: e.id,
      node_type: "Premise",
      statement_preview: premisePreview(premises_b.get(e.id) ?? premises_a.get(e.id)),
      fields_changed: e.fields_changed,
    })),
    argument_edges_added: diff.argument_edges.added.map((id) => ({
      kind: "edge_added",
      edge_id: id,
      edge_type: edges_b.get(id)?.type ?? "",
      endpoints_preview: edgeEndpointsPreview(edges_b.get(id)),
    })),
    argument_edges_removed: diff.argument_edges.removed.map((id) => ({
      kind: "edge_removed",
      edge_id: id,
      edge_type: edges_a.get(id)?.type ?? "",
      endpoints_preview: edgeEndpointsPreview(edges_a.get(id)),
    })),
    argument_edges_edited: diff.argument_edges.edited.map((e) => ({
      kind: "edge_edited",
      edge_id: e.id,
      edge_type: edges_b.get(e.id)?.type ?? edges_a.get(e.id)?.type ?? "",
      endpoints_preview: edgeEndpointsPreview(edges_b.get(e.id) ?? edges_a.get(e.id)),
      fields_changed: e.fields_changed,
    })),
    checkpoint_added: diff.checkpoint_responses.added.map((id) => ({
      kind: "node_added",
      node_id: id,
      node_type: "Checkpoint",
      statement_preview: truncatedIdPreview("Checkpoint", id),
    })),
    checkpoint_removed: diff.checkpoint_responses.removed.map((id) => ({
      kind: "node_removed",
      node_id: id,
      node_type: "Checkpoint",
      statement_preview: truncatedIdPreview("Checkpoint", id),
    })),
    checkpoint_edited: diff.checkpoint_responses.edited.map((e) => ({
      kind: "node_edited",
      node_id: e.checkpoint_id,
      node_type: "Checkpoint",
      statement_preview: truncatedIdPreview("Checkpoint", e.checkpoint_id),
      fields_changed: e.fields_changed,
    })),
    authorities_added: diff.session_authorities.added.map((id) => ({
      kind: "node_added",
      node_id: id,
      node_type: "Authority",
      statement_preview: authorityPreview(auths_b.get(id)),
    })),
    authorities_removed: diff.session_authorities.removed.map((id) => ({
      kind: "node_removed",
      node_id: id,
      node_type: "Authority",
      statement_preview: authorityPreview(auths_a.get(id)),
    })),
    authorities_edited: diff.session_authorities.edited.map((e) => ({
      kind: "node_edited",
      node_id: e.id,
      node_type: "Authority",
      statement_preview: authorityPreview(auths_b.get(e.id) ?? auths_a.get(e.id)),
      fields_changed: e.fields_changed,
    })),
    interp_added: diff.interpretation_selections.added.map((id) => ({
      kind: "node_added",
      node_id: id,
      node_type: "Term",
      statement_preview: truncatedIdPreview("Term", id),
    })),
    interp_removed: diff.interpretation_selections.removed.map((id) => ({
      kind: "node_removed",
      node_id: id,
      node_type: "Term",
      statement_preview: truncatedIdPreview("Term", id),
    })),
    interp_edited: diff.interpretation_selections.edited.map((e) => ({
      kind: "node_edited",
      node_id: e.term_id,
      node_type: "Term",
      statement_preview: truncatedIdPreview("Term", e.term_id),
      fields_changed: e.fields_changed,
    })),
    metadata: diff.metadata.changed_fields.map((m) => ({
      kind: "metadata_changed",
      field: m.field,
    })),
  };
}

export function CompareView(props: CompareViewProps): ReactElement {
  const {
    entity_kind,
    from_id,
    to_id,
    from_version_number,
    to_version_number,
    on_back,
    on_navigate_to_entity,
  } = props;
  const { repository } = useRepository();
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    const loader =
      entity_kind === "frame"
        ? Promise.all([repository.loadFrameVersion(from_id), repository.loadFrameVersion(to_id)])
        : Promise.all([
            repository.loadSessionVersion(from_id),
            repository.loadSessionVersion(to_id),
          ]);
    loader
      .then(([a, b]) => {
        if (cancelled) return;
        setState({ kind: "ready", a, b });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [entity_kind, from_id, to_id, repository]);

  return (
    <div data-testid="compare-view" className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2 text-sm">
        <Button variant="ghost" size="icon-sm" aria-label="Back to history" onClick={on_back}>
          <ArrowLeft />
        </Button>
        {/* P2: make the title an h2 so screen readers get a heading
            landmark inside the pane. */}
        <h2 data-testid="compare-view-title" className="m-0 text-inherit font-semibold">
          Compare v{from_version_number} to v{to_version_number}
        </h2>
      </header>
      {state.kind === "loading" ? (
        <div
          data-testid="compare-view-loading"
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 p-4 text-sm text-muted-foreground"
        >
          <span
            className="inline-block size-3.5 animate-spin rounded-full border-2 border-border"
            style={{ borderTopColor: "var(--color-mode-current-accent)" }}
            aria-hidden="true"
          />
          <span>Loading comparison…</span>
        </div>
      ) : state.kind === "error" ? (
        <div data-testid="compare-view-error" className="p-4">
          <div className="text-base" style={{ color: "var(--color-severity-error)" }}>
            {state.error.message}
          </div>
          <Button variant="outline" size="default" onClick={on_back} className="mt-2">
            Back to history
          </Button>
        </div>
      ) : (
        <CompareBody
          state={state}
          entity_kind={entity_kind}
          on_navigate_to_entity={on_navigate_to_entity}
        />
      )}
    </div>
  );
}

function CompareBody(props: {
  state: {
    kind: "ready";
    a: FrameVersion | ArgumentSessionVersion;
    b: FrameVersion | ArgumentSessionVersion;
  };
  entity_kind: "frame" | "session";
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}): ReactElement {
  if (props.entity_kind === "frame") {
    return (
      <FrameCompareBody state={props.state} on_navigate_to_entity={props.on_navigate_to_entity} />
    );
  }
  return (
    <SessionCompareBody state={props.state} on_navigate_to_entity={props.on_navigate_to_entity} />
  );
}

function FrameCompareBody(props: {
  state: {
    kind: "ready";
    a: FrameVersion | ArgumentSessionVersion;
    b: FrameVersion | ArgumentSessionVersion;
  };
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}): ReactElement {
  const { state, on_navigate_to_entity } = props;
  const a = state.a as FrameVersion;
  const b = state.b as FrameVersion;
  const diff = React.useMemo(() => diffFrameVersions(a, b), [a, b]);
  const rows = React.useMemo(() => buildFrameRows(a, b, diff), [a, b, diff]);
  const total =
    rows.added.length +
    rows.removed.length +
    rows.edited.length +
    rows.edges_added.length +
    rows.edges_removed.length +
    rows.edges_edited.length +
    rows.metadata.length +
    rows.layout_only.length;
  if (total === 0) {
    return (
      <div data-testid="compare-view-empty" className="p-4 italic text-muted-foreground/80">
        No differences
      </div>
    );
  }
  return (
    <ScrollArea className="flex-1">
      <CompareEntryList
        title="Nodes added"
        kind="added"
        entries={rows.added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Nodes removed"
        kind="removed"
        entries={rows.removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Nodes edited"
        kind="edited"
        entries={rows.edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Edges added"
        kind="added"
        entries={rows.edges_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Edges removed"
        kind="removed"
        entries={rows.edges_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Edges edited"
        kind="edited"
        entries={rows.edges_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Frame metadata"
        kind="metadata"
        entries={rows.metadata}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Layout-only changes"
        kind="layout_only"
        entries={rows.layout_only}
        on_navigate_to_entity={on_navigate_to_entity}
      />
    </ScrollArea>
  );
}

function SessionCompareBody(props: {
  state: {
    kind: "ready";
    a: FrameVersion | ArgumentSessionVersion;
    b: FrameVersion | ArgumentSessionVersion;
  };
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}): ReactElement {
  const { state, on_navigate_to_entity } = props;
  const a_s = state.a as ArgumentSessionVersion;
  const b_s = state.b as ArgumentSessionVersion;
  const diff = React.useMemo(() => diffSessionVersions(a_s, b_s), [a_s, b_s]);
  const rows = React.useMemo(() => buildSessionRows(a_s, b_s, diff), [a_s, b_s, diff]);
  const total =
    rows.premises_added.length +
    rows.premises_removed.length +
    rows.premises_edited.length +
    rows.argument_edges_added.length +
    rows.argument_edges_removed.length +
    rows.argument_edges_edited.length +
    rows.checkpoint_added.length +
    rows.checkpoint_removed.length +
    rows.checkpoint_edited.length +
    rows.authorities_added.length +
    rows.authorities_removed.length +
    rows.authorities_edited.length +
    rows.interp_added.length +
    rows.interp_removed.length +
    rows.interp_edited.length +
    rows.metadata.length;
  if (total === 0) {
    return (
      <div data-testid="compare-view-empty" className="p-4 italic text-muted-foreground/80">
        No differences
      </div>
    );
  }
  return (
    <ScrollArea className="flex-1">
      <CompareEntryList
        title="Premises added"
        kind="added"
        entries={rows.premises_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Premises removed"
        kind="removed"
        entries={rows.premises_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Premises edited"
        kind="edited"
        entries={rows.premises_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Argument edges added"
        kind="added"
        entries={rows.argument_edges_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Argument edges removed"
        kind="removed"
        entries={rows.argument_edges_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Argument edges edited"
        kind="edited"
        entries={rows.argument_edges_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Checkpoint responses added"
        kind="added"
        entries={rows.checkpoint_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Checkpoint responses removed"
        kind="removed"
        entries={rows.checkpoint_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Checkpoint responses edited"
        kind="edited"
        entries={rows.checkpoint_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Session authorities added"
        kind="added"
        entries={rows.authorities_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Session authorities removed"
        kind="removed"
        entries={rows.authorities_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Session authorities edited"
        kind="edited"
        entries={rows.authorities_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Interpretation selections added"
        kind="added"
        entries={rows.interp_added}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Interpretation selections removed"
        kind="removed"
        entries={rows.interp_removed}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Interpretation selections edited"
        kind="edited"
        entries={rows.interp_edited}
        on_navigate_to_entity={on_navigate_to_entity}
      />
      <CompareEntryList
        title="Session metadata"
        kind="metadata"
        entries={rows.metadata}
        on_navigate_to_entity={on_navigate_to_entity}
      />
    </ScrollArea>
  );
}
