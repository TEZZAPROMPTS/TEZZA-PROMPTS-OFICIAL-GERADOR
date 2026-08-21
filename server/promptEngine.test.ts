import { describe, expect, it } from "vitest";
import {
  METHOD_SPECS,
  SECTION_DEFINITIONS,
  buildGenerationMessages,
  normalizeSections,
  renderMethodPrompt,
  type PromptSections,
} from "./promptEngine";

const completeSections = Object.fromEntries(
  SECTION_DEFINITIONS.map(({ key }) => [key, `Precise English description for ${key}.`])
) as PromptSections;

describe("Tezza prompt methods", () => {
  it("locks independent fixed openings and closings for Feminine and Masculine methods", () => {
    const feminine = renderMethodPrompt("feminine", completeSections);
    const masculine = renderMethodPrompt("masculine", completeSections);

    expect(feminine.startsWith(METHOD_SPECS.feminine.opening)).toBe(true);
    expect(feminine.endsWith(METHOD_SPECS.feminine.closing)).toBe(true);
    expect(masculine.startsWith(METHOD_SPECS.masculine.opening)).toBe(true);
    expect(masculine.endsWith(METHOD_SPECS.masculine.closing)).toBe(true);
    expect(feminine).not.toContain("3D male portrait");
    expect(masculine).not.toContain("3D female portrait");

    let lastPosition = -1;
    for (const { heading } of SECTION_DEFINITIONS) {
      const position = masculine.indexOf(`\n${heading}\n`);
      expect(position).toBeGreaterThan(lastPosition);
      lastPosition = position;
    }
  });

  it("passes personal traits as priority direction without exposing markers in rendered sections", () => {
    const messages = buildGenerationMessages({
      method: "masculine",
      mode: "text",
      userText: "A black tie evening portrait.",
      personalTraits: "Keep black wavy hair and broad shoulders.",
    });
    const systemText = String(messages[0].content);

    expect(systemText).toContain("Keep black wavy hair and broad shoulders.");
    expect(systemText).toContain("adult male virtual avatar");

    const normalized = normalizeSections({
      ...completeSections,
      hair: "The reference image shows hair → and a tattoo near the hairline.",
    });
    expect(normalized.hair).not.toMatch(/reference|image|tattoo|→/i);
  });
});
