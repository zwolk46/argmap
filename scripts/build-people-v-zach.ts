/**
 * Gap-finder for the People v. Zach demo frame.
 *
 * Builds the frame via the shared `src/demo/people-v-zach.ts` constructor
 * (so the validator and the in-app seeder stay byte-identical), then runs
 * the schema validator and prints any errors / warnings. Used to verify the
 * F-031 schema/validation amendment closes every gap the original spec
 * surfaced; run again after any future schema change as a regression check.
 *
 * Usage:  npx vite-node scripts/build-people-v-zach.ts
 */

import { runValidation } from "../src/schema";
import { buildPeopleVZach } from "../src/demo/people-v-zach";

// Deterministic ids for the script run so the output is diff-friendly.
function makeIdGenerator(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `pvz-${String(n).padStart(4, "0")}`;
  };
}

function main(): void {
  const { frame_version } = buildPeopleVZach({
    now: "2026-05-21T00:00:00.000Z",
    generateId: makeIdGenerator(),
  });

  const results = runValidation(frame_version);
  const errors = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");

  const groupBy = (rs: typeof results): Map<string, string[]> => {
    const m = new Map<string, string[]>();
    for (const r of rs) {
      const arr = m.get(r.rule_id) ?? [];
      arr.push(r.message);
      m.set(r.rule_id, arr);
    }
    return m;
  };
  const errMap = groupBy(errors);
  const warnMap = groupBy(warnings);

  console.log(
    `People v. Zach gap-finder — ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  if (errors.length === 0) {
    console.log("Validation clean.");
  }
  for (const [rule_id, msgs] of [...errMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n=== ERROR ${rule_id} (${msgs.length}) ===`);
    for (const m of msgs) {
      console.log(`  - ${m}`);
    }
  }
  for (const [rule_id, msgs] of [...warnMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n=== WARNING ${rule_id} (${msgs.length}) ===`);
    for (const m of msgs) {
      console.log(`  - ${m}`);
    }
  }

  if (errors.length > 0) process.exitCode = 1;
}

main();
