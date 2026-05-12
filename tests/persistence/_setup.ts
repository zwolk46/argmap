import "fake-indexeddb/auto";
import { IndexedDbRepository } from "@/persistence";

// fake-indexeddb uses setImmediate (not microtasks) for each IDB operation result.
// setImmediate is not faked, so we yield the real event loop once per IDB round-trip.
// A Dexie transaction with N put/get calls needs N setImmediate rounds to fully drain.
export async function flushPromises(rounds = 15): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

let test_db_counter = 0;

export function injectedNow(start_iso: string): () => string {
  let t = new Date(start_iso).getTime();
  return () => {
    const s = new Date(t).toISOString();
    t += 1_000;
    return s;
  };
}

export function injectedGenerateId(): () => string {
  let i = 0;
  return () => {
    i += 1;
    return `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
  };
}

export async function freshDb(name = `test_${++test_db_counter}`): Promise<IndexedDbRepository> {
  const repo = new IndexedDbRepository({
    db_name: name,
    now: injectedNow("2026-05-10T00:00:00.000Z"),
    generateId: injectedGenerateId(),
  });
  await repo.openOrUpgrade();
  return repo;
}
