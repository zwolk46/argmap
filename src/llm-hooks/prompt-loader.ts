import type { PromptFile } from "./types";
import type { Repository } from "@/persistence";
import { parseFrontmatter } from "./prompt-frontmatter";
import { sortedKeys } from "@/runtime/iteration-helpers";

export class PromptNotFoundError extends Error {
  readonly kind = "prompt_not_found" as const;
  constructor(
    readonly hook_name: string,
    readonly version: string,
  ) {
    super(`prompt not found: ${hook_name}@${version}`);
    this.name = "PromptNotFoundError";
  }
}

// `import.meta.glob` is evaluated at build time by Vite.
// In the test environment (vitest), Vite transforms this into a literal object.
const BUNDLED_RAW: Record<string, string> = import.meta.glob("./prompts/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BUNDLED: Map<string, PromptFile> = (() => {
  const map = new Map<string, PromptFile>();
  const path_re = /^\.\/prompts\/([^/]+)\/([^/]+)\.md$/;
  for (const path of sortedKeys(BUNDLED_RAW)) {
    const match = path_re.exec(path);
    if (!match) continue;
    const [, hook_name, version] = match;
    const raw = BUNDLED_RAW[path];
    const { frontmatter, body } = parseFrontmatter(raw);
    const file: PromptFile = {
      hook_name: String(frontmatter.hook_name ?? hook_name),
      version: String(frontmatter.version ?? version),
      schema_in: frontmatter.schema_in ?? {},
      schema_out: frontmatter.schema_out ?? {},
      model_hint: frontmatter.model_hint as string | undefined,
      provider_hints: frontmatter.provider_hints as Record<string, unknown> | undefined,
      body,
      created_at: frontmatter.created_at as string | undefined,
      notes: frontmatter.notes as string | undefined,
    };
    // Path-derived names are source of truth; skip if frontmatter disagrees.
    if (file.hook_name !== hook_name || file.version !== version) continue;
    map.set(`${hook_name}@${version}`, file);
  }
  return map;
})();

export async function loadPrompt(
  hook_name: string,
  version: string,
  repository: Repository,
): Promise<PromptFile> {
  const key = `${hook_name}@${version}`;
  const bundled = BUNDLED.get(key);
  if (bundled) {
    await repository.savePrompt({
      hook_name,
      version,
      body_markdown: bundled.body,
      frontmatter: extractFrontmatterObject(bundled),
      added_at: bundled.created_at ?? new Date(0).toISOString(),
    });
    return bundled;
  }
  const archived = await repository.loadPrompt(hook_name, version);
  if (archived) return recordToPromptFile(archived);
  throw new PromptNotFoundError(hook_name, version);
}

export async function preloadBundledPrompts(repository: Repository): Promise<void> {
  for (const [, file] of BUNDLED) {
    await repository.savePrompt({
      hook_name: file.hook_name,
      version: file.version,
      body_markdown: file.body,
      frontmatter: extractFrontmatterObject(file),
      added_at: file.created_at ?? new Date(0).toISOString(),
    });
  }
}

function extractFrontmatterObject(file: PromptFile): Record<string, unknown> {
  return {
    hook_name: file.hook_name,
    version: file.version,
    schema_in: file.schema_in,
    schema_out: file.schema_out,
    model_hint: file.model_hint,
    provider_hints: file.provider_hints,
    created_at: file.created_at,
    notes: file.notes,
  };
}

export function _makeLoaderForTests(synthetic_bundle: Map<string, PromptFile>) {
  return async function load(
    hook_name: string,
    version: string,
    repository: Repository,
  ): Promise<PromptFile> {
    const key = `${hook_name}@${version}`;
    const hit = synthetic_bundle.get(key);
    if (hit) return hit;
    const archived = await repository.loadPrompt(hook_name, version);
    if (archived) return recordToPromptFile(archived);
    throw new PromptNotFoundError(hook_name, version);
  };
}

function recordToPromptFile(record: {
  hook_name: string;
  version: string;
  body_markdown: string;
  frontmatter: Record<string, unknown>;
  added_at: string;
}): PromptFile {
  return {
    hook_name: record.hook_name,
    version: record.version,
    schema_in: record.frontmatter.schema_in ?? {},
    schema_out: record.frontmatter.schema_out ?? {},
    model_hint: record.frontmatter.model_hint as string | undefined,
    provider_hints: record.frontmatter.provider_hints as Record<string, unknown> | undefined,
    body: record.body_markdown,
    created_at: record.frontmatter.created_at as string | undefined,
    notes: record.frontmatter.notes as string | undefined,
  };
}
