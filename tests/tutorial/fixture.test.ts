/**
 * Verifies the tutorial fixture: schema validity + that the runtime resolves
 * the Cardozo / out-of-zone session to a determinate "not liable" conclusion.
 *
 * If a future schema change breaks the fixture, this test fails loudly — far
 * better than a tutorial that silently produces "incomplete."
 */
import { describe, it, expect } from "vitest";
import { buildTutorial } from "@/tutorial/fixture";
import { runValidation } from "@/schema";
import { compute } from "@/runtime";

const T0 = "2026-05-10T00:00:00.000Z";

function makeIds(): () => string {
  let i = 0;
  return () => `id-${++i}`;
}

describe("tutorial fixture", () => {
  it("produces a frame that passes schema validation (no errors)", () => {
    const { frame_version } = buildTutorial({
      now: T0,
      generateId: makeIds(),
      user_id: "test-user",
    });
    const results = runValidation(frame_version);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
  });

  it("session resolves the primary path to the NOT-LIABLE conclusion", () => {
    const { frame_version, session } = buildTutorial({
      now: T0,
      generateId: makeIds(),
      user_id: "test-user",
    });

    const result = compute({
      frame_version_snapshot: frame_version,
      premises: session.premises,
      argument_edges: session.argument_edges,
      interpretation_selections: session.interpretation_selections,
      checkpoint_responses: session.checkpoint_responses,
      session_authorities: session.session_authorities ?? [],
      computed_at: T0,
    });

    // The Cardozo interpretation + "not in zone" checkpoint response should
    // pick the NOT-LIABLE conclusion.
    const not_liable = frame_version.nodes.find(
      (n) =>
        n.type === "Conclusion" && (n as { statement: string }).statement.includes("not liable"),
    );
    expect(not_liable, "fixture must contain the not-liable conclusion").toBeDefined();

    // The output should have selected a conclusion. Inspect output shape.
    const output = result.output;
    expect(output, "compute() must return an output").toBeDefined();
    if (!output) return;

    // Whatever the canonical "primary conclusion" field is, the resolved
    // conclusion id must equal the not_liable node id. The compute pipeline
    // exposes this through different paths depending on output.shape:
    //   - "determinate":   output.conclusion === <node_id>
    //   - "conditional":   output.conditional?.branches[..].resulting_conclusion
    //   - "contested":     output.contested?.conclusions[..]
    //   - "incomplete":    no conclusion
    const o = output as unknown as Record<string, unknown>;
    const shape = o.shape as string;
    expect(shape, `output.shape was ${shape}`).toBe("determinate");
    const resolved_id = (o.conclusion ?? o.conclusion_node_id) as string | undefined;
    expect(resolved_id, "output.conclusion must point at the not-liable node").toBe(not_liable?.id);
  });
});
