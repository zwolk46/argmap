import { describe, it, expect, vi } from "vitest";
import { _makeLoaderForTests, PromptNotFoundError } from "@/llm-hooks/prompt-loader";
import type { PromptFile } from "@/llm-hooks";
import type { Repository } from "@/persistence";

const fakePromptFile = (h: string, v: string): PromptFile => ({
  hook_name: h,
  version: v,
  schema_in: {},
  schema_out: {},
  body: "Body for " + h,
  model_hint: "claude-3-7-sonnet-latest",
});

const stubRepo = () =>
  ({
    loadPrompt: vi.fn().mockResolvedValue(null),
    savePrompt: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Repository;

describe("loadPrompt (synthetic bundle)", () => {
  it("returns bundled prompt on hit", async () => {
    const bundle = new Map([["g1@v1", fakePromptFile("g1", "v1")]]);
    const repo = stubRepo();
    const load = _makeLoaderForTests(bundle);
    const result = await load("g1", "v1", repo);
    expect(result.body).toContain("g1");
  });

  it("falls back to repository.loadPrompt on bundle miss", async () => {
    const bundle = new Map<string, PromptFile>();
    const repo = stubRepo();
    (repo.loadPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({
      hook_name: "gZ",
      version: "v1",
      body_markdown: "archived body",
      frontmatter: { hook_name: "gZ", version: "v1", schema_in: {}, schema_out: {} },
      added_at: "2026-01-01T00:00:00Z",
    });
    const load = _makeLoaderForTests(bundle);
    const result = await load("gZ", "v1", repo);
    expect(result.hook_name).toBe("gZ");
  });

  it("throws PromptNotFoundError when both miss", async () => {
    const load = _makeLoaderForTests(new Map());
    await expect(load("missing", "v1", stubRepo())).rejects.toBeInstanceOf(PromptNotFoundError);
  });
});
