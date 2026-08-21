import { describe, expect, it } from "vitest";
import {
  METHOD_ONE_CLOSING,
  METHOD_ONE_OPENING,
  SECTION_DEFINITIONS,
  normalizeSections,
  renderMethodOnePrompt,
  type PromptSections,
} from "./promptEngine";

const completeSections = Object.fromEntries(
  SECTION_DEFINITIONS.map(({ key }) => [key, `Precise English description for ${key}.`])
) as PromptSections;

describe("Method 1 prompt rendering", () => {
  it("locks the fixed opening, required heading order, and fixed closing", () => {
    const rendered = renderMethodOnePrompt(completeSections);

    expect(rendered.startsWith(METHOD_ONE_OPENING)).toBe(true);
    expect(rendered.endsWith(METHOD_ONE_CLOSING)).toBe(true);
    expect(rendered).not.toContain("→");

    let lastPosition = -1;
    for (const { heading } of SECTION_DEFINITIONS) {
      const position = rendered.indexOf(`\n${heading}\n`);
      expect(position).toBeGreaterThan(lastPosition);
      lastPosition = position;
    }
  });

  it("removes reference wording, arrows, and tattoo descriptions from generated sections", () => {
    const normalized = normalizeSections({
      ...completeSections,
      hair: "Hair follows the reference image → with a tattoo visible nearby.",
    });

    expect(normalized.hair).not.toMatch(/reference|image|tattoo|→/i);
  });
});
