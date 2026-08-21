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

  it("preserves the authorized openings and closings literally while preventing their duplication in STYLE & RENDER QUALITY", () => {
    const feminine = renderMethodPrompt("feminine", {
      ...completeSections,
      styleRenderQuality: "Polished virtual-influencer beauty rendered with Blender Cycles and Seedream 5.0 for cinematic material realism and depth.",
    });
    const masculine = renderMethodPrompt("masculine", {
      ...completeSections,
      styleRenderQuality: "Polished virtual-influencer styling rendered with Blender Cycles and high-fidelity masculine CGI rendering for cinematic material realism and depth.",
    });

    expect(METHOD_SPECS.feminine.opening).toBe("Ultra-realistic cinematic avatar 3D female portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 beauty realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI beauty proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.");
    expect(METHOD_SPECS.feminine.closing).toBe("Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired beauty repaint style, high-fidelity feminine avatar rendering, realistic depth of field, glossy beauty aesthetic, polished virtual influencer atmosphere, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI avatar aesthetics instead of a real photograph.");
    expect(METHOD_SPECS.masculine.opening).toBe("Ultra-realistic cinematic avatar 3D male portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI masculine proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.");
    expect(METHOD_SPECS.masculine.closing).toBe("Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 masculine beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired avatar repaint aesthetics, high-fidelity masculine CGI rendering, realistic atmospheric depth, polished virtual influencer styling, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI-avatar aesthetics instead of a real photograph.");
    expect(feminine).toContain("STYLE & RENDER QUALITY\nPolished virtual-influencer beauty with cohesive cinematic material realism, balanced depth, and a refined luxury editorial finish.");
    expect(masculine).toContain("STYLE & RENDER QUALITY\nPolished virtual-influencer styling with cohesive cinematic material realism, balanced atmosphere, and a refined luxury editorial finish.");
    expect(feminine.split(METHOD_SPECS.feminine.closing)).toHaveLength(2);
    expect(masculine.split(METHOD_SPECS.masculine.closing)).toHaveLength(2);
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

  it("keeps each supplied base distinct while enforcing the fixed fourteen-section contract", () => {
    const feminineSystem = String(buildGenerationMessages({ method: "feminine", mode: "text", userText: "A refined city portrait." })[0].content);
    const masculineSystem = String(buildGenerationMessages({ method: "masculine", mode: "text", userText: "A refined city portrait." })[0].content);

    expect(feminineSystem).toContain("Female Method 1 Gemini structure");
    expect(feminineSystem).toContain("never default to the example woman's blonde hair");
    expect(masculineSystem).toContain("Male Method 1 Gemini structure");
    expect(masculineSystem).toContain("never default to the example man's black curls");
    expect(feminineSystem).toContain("Populate exactly these sections");
    expect(masculineSystem).toContain("14 immutable section headings");
    expect(feminineSystem).toContain("For both methods, STYLE & RENDER QUALITY must describe only the scene's visual treatment");
    expect(masculineSystem).toContain("high-fidelity masculine CGI rendering");
  });
});
