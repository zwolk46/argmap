import { parse as parseYaml } from "yaml";

export class FrontmatterParseError extends Error {
  readonly kind = "frontmatter_parse_error" as const;
  constructor(
    message: string,
    readonly raw?: string,
  ) {
    super(message);
    this.name = "FrontmatterParseError";
  }
}

const FENCE = "---";

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");

  if (!normalized.startsWith(FENCE + "\n")) {
    throw new FrontmatterParseError(`prompt file is missing a leading '${FENCE}' fence`);
  }

  const after_first_fence = normalized.slice(FENCE.length + 1);
  const closing_index = after_first_fence.indexOf("\n" + FENCE + "\n");
  if (closing_index === -1) {
    throw new FrontmatterParseError(`prompt file is missing a closing '${FENCE}' fence`);
  }

  const yaml_block = after_first_fence.slice(0, closing_index);
  const body = after_first_fence.slice(closing_index + FENCE.length + 2);

  let frontmatter: unknown;
  try {
    frontmatter = parseYaml(yaml_block);
  } catch (err) {
    throw new FrontmatterParseError(
      `prompt frontmatter YAML did not parse: ${(err as Error).message}`,
      yaml_block,
    );
  }
  if (frontmatter === null || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    throw new FrontmatterParseError(
      `prompt frontmatter must be a YAML object, not ${typeof frontmatter}`,
    );
  }
  return { frontmatter: frontmatter as Record<string, unknown>, body };
}
