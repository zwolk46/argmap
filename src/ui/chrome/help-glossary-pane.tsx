import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { GLOSSARY_DICTIONARY } from "../primitives/glossary-tooltip";
import { Drawer, DrawerHeader, DrawerBody } from "../primitives/drawer";

export interface HelpGlossaryPaneProps {
  open: boolean;
  onClose: () => void;
}

export function HelpGlossaryPane({ open, onClose }: HelpGlossaryPaneProps): ReactElement {
  const frame = useFrameStore((s) => s.frame);
  const is_legal = frame?.mode === "legal";

  const frame_entries = Object.entries(GLOSSARY_DICTIONARY).filter(
    ([, entry]) => !entry.legal_only,
  );
  const legal_entries = Object.entries(GLOSSARY_DICTIONARY).filter(([, entry]) => entry.legal_only);

  return (
    <Drawer open={open} onClose={onClose} width="320px">
      <DrawerHeader>
        <span>Help & Glossary</span>
        <button
          aria-label="Close help"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          ×
        </button>
      </DrawerHeader>
      <DrawerBody>
        <section>
          <h3
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wide)",
              margin: "0 0 var(--space-3)",
            }}
          >
            Frame Concepts
          </h3>
          {frame_entries.map(([key, entry]) => (
            <div key={key} style={{ marginBottom: "var(--space-4)" }}>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-text-primary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                {entry.term}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-normal)",
                }}
              >
                {entry.definition}
              </div>
            </div>
          ))}
        </section>
        {is_legal && legal_entries.length > 0 && (
          <section style={{ marginTop: "var(--space-5)" }}>
            <h3
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wide)",
                margin: "0 0 var(--space-3)",
              }}
            >
              Legal Concepts
            </h3>
            {legal_entries.map(([key, entry]) => (
              <div key={key} style={{ marginBottom: "var(--space-4)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {entry.term}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: "var(--line-height-normal)",
                  }}
                >
                  {entry.definition}
                </div>
              </div>
            ))}
          </section>
        )}
      </DrawerBody>
    </Drawer>
  );
}
