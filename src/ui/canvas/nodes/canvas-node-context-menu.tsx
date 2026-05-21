import type { ReactElement, ReactNode } from "react";
import { Trash, ArrowSquareOut, Copy, CrosshairSimple } from "@phosphor-icons/react";
import { useReactFlow } from "@xyflow/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "#components/ui/context-menu";

export interface CanvasNodeContextMenuProps {
  node_id: string;
  /**
   * True for the Root Question — V-FR-1 prohibits deletion. The menu item
   * shows but is disabled with an explanatory title.
   */
  delete_disabled?: boolean;
  /** Hide the context menu entirely (e.g. read-only / preview surfaces). */
  read_only?: boolean;
  children: ReactNode;
}

/**
 * Wraps a canvas node with a right-click context menu surfacing the
 * common actions a user would otherwise need to dig into the inspector for.
 * Uses React Flow's own selection + deletion APIs so the cascade-delete
 * confirmation, store updates, and selection→inspector flow all run through
 * their existing paths.
 */
export function CanvasNodeContextMenu(props: CanvasNodeContextMenuProps): ReactElement {
  const { node_id, delete_disabled, read_only, children } = props;
  const rf = useReactFlow();

  if (read_only) {
    return <>{children}</>;
  }

  function select_only() {
    rf.setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === node_id,
      })),
    );
  }

  function delete_node() {
    // React Flow's onNodesDelete handler is already wired in FrameCanvas to
    // call `on_node_delete_requested`, which triggers the cascade-delete
    // confirmation. Calling deleteElements here triggers that same path.
    rf.deleteElements({ nodes: [{ id: node_id }] });
  }

  function copy_id() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(node_id);
    }
  }

  function center_on() {
    const node = rf.getNode(node_id);
    if (node) {
      void rf.fitView({ nodes: [{ id: node_id }], duration: 250, padding: 0.3 });
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={select_only}>
          <ArrowSquareOut />
          <span>Open in inspector</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={center_on}>
          <CrosshairSimple />
          <span>Center on canvas</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={copy_id}>
          <Copy />
          <span>Copy node ID</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={delete_disabled}
          onSelect={() => {
            if (delete_disabled) return;
            delete_node();
          }}
          title={delete_disabled ? "Cannot delete the Root Question (V-FR-1)" : undefined}
        >
          <Trash />
          <span>Delete node…</span>
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
