export type Migration = (input: unknown) => unknown;

export interface MigrationRegistry {
  readonly current_schema_version: number;
  migrations: { [from: number]: Migration };
}

export const CURRENT_SCHEMA_VERSION = 1;

export const MIGRATION_REGISTRY: MigrationRegistry = {
  current_schema_version: CURRENT_SCHEMA_VERSION,
  migrations: {
    // empty at v1
  },
};

export class UnknownSchemaVersionError extends Error {
  public readonly seen: number;
  constructor(seen: number) {
    super(`Unknown schema_version ${seen}; no migration path to ${CURRENT_SCHEMA_VERSION}`);
    this.seen = seen;
    this.name = "UnknownSchemaVersionError";
  }
}

// Pure: no clock reads, no global state. Chains migrations from envelope.schema_version
// up to registry.current_schema_version.
export function migrate(
  envelope: { schema_version: number } & Record<string, unknown>,
  registry: MigrationRegistry = MIGRATION_REGISTRY,
): unknown {
  if (envelope.schema_version === registry.current_schema_version) return envelope;
  if (envelope.schema_version > registry.current_schema_version) {
    throw new UnknownSchemaVersionError(envelope.schema_version);
  }
  let current: unknown = envelope;
  let v = envelope.schema_version;
  while (v < registry.current_schema_version) {
    const step = registry.migrations[v];
    if (!step) throw new UnknownSchemaVersionError(envelope.schema_version);
    current = step(current);
    v += 1;
  }
  if (typeof current === "object" && current !== null) {
    (current as Record<string, unknown>).schema_version = registry.current_schema_version;
  }
  return current;
}
