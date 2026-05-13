import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { GLOSSARY_DICTIONARY } from "../primitives/glossary-tooltip";
import { Drawer, DrawerHeader, DrawerBody } from "../primitives/drawer";
import { IconButton } from "../primitives/icon-button";
import { OnboardingPreferencesSection } from "../onboarding/onboarding-preferences-section";

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
    <Drawer
      open={open}
      onClose={onClose}
      width="360px"
      aria_label="Help and glossary"
    >
      <DrawerHeader>
        <span>Help & Glossary</span>
        <IconButton size="sm" aria-label="Close help" onClick={onClose}>
          <svg
            width={14}
            height={14}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </IconButton>
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
        <OnboardingPreferencesSection />
      </DrawerBody>
    </Drawer>
  );
}
