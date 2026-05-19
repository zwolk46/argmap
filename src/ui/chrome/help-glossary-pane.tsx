import * as React from "react";
import type { ReactElement } from "react";
import { GLOSSARY_DICTIONARY } from "../primitives/glossary-tooltip";
import { Drawer, DrawerHeader, DrawerBody } from "../primitives/drawer";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";
import { OnboardingPreferencesSection } from "../onboarding/onboarding-preferences-section";

export interface HelpGlossaryPaneProps {
  open: boolean;
  onClose: () => void;
}

export function HelpGlossaryPane({ open, onClose }: HelpGlossaryPaneProps): ReactElement {
  // §9 #20: legal-concept definitions are needed *before* choosing a mode,
  // so they always render — not only when a legal frame is already loaded.
  const [query, setQuery] = React.useState("");

  // §9 #19: glossary has ~25 entries; a filter input keeps "How do I find X"
  // workflows tight. Match term + definition (case-insensitive trimmed).
  const q = query.trim().toLowerCase();
  const matches = ([, entry]: [string, { term: string; definition: string }]) =>
    q.length === 0 ||
    entry.term.toLowerCase().includes(q) ||
    entry.definition.toLowerCase().includes(q);
  const frame_entries = Object.entries(GLOSSARY_DICTIONARY)
    .filter(([, entry]) => !entry.legal_only)
    .filter(matches);
  const legal_entries = Object.entries(GLOSSARY_DICTIONARY)
    .filter(([, entry]) => entry.legal_only)
    .filter(matches);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      show_backdrop
      width="min(360px, 100vw)"
      aria_label="Help, glossary, and app preferences"
    >
      <DrawerHeader>
        {/* §9 #21: app preferences (reset coachmarks) live in this drawer;
            rename so users don't land here expecting only glossary entries. */}
        <span>Help & Settings</span>
        <IconButton size="sm" aria-label="Close help" onClick={onClose}>
          <UIcon name="times" size={14} />
        </IconButton>
      </DrawerHeader>
      <DrawerBody>
        <input
          data-testid="help-glossary-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search glossary…"
          aria-label="Search glossary"
          className="argmap-input"
          style={{
            marginBottom: "var(--space-3)",
            fontSize: "var(--font-size-sm)",
          }}
        />
        {frame_entries.length === 0 && legal_entries.length === 0 && q.length > 0 ? (
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              padding: "var(--space-2) 0",
            }}
          >
            No glossary entries match &ldquo;{query}&rdquo;.
          </div>
        ) : null}
        <section>
          <h3 className="argmap-section-heading" style={{ margin: "0 0 var(--space-3)" }}>
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
        {legal_entries.length > 0 && (
          <section style={{ marginTop: "var(--space-5)" }}>
            <h3 className="argmap-section-heading" style={{ margin: "0 0 var(--space-3)" }}>
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
        <OnboardingPreferencesSection />
      </DrawerBody>
    </Drawer>
  );
}
