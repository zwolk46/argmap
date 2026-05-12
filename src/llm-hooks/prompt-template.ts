import Mustache from "mustache";

// Disable HTML escaping — prompt text is fed to an LLM, not a browser.
Mustache.escape = (text: string) => text;

export function renderTemplate(body: string, variables: Record<string, unknown>): string {
  return Mustache.render(body, variables);
}
