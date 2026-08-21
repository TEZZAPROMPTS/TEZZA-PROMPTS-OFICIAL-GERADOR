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

  it("renders STYLE & RENDER QUALITY as the exact fixed base text for each method", () => {
    const feminine = renderMethodPrompt("feminine", {
      ...completeSections,
      styleRenderQuality: "This variable text must never appear in the final feminine prompt.",
    });
    const masculine = renderMethodPrompt("masculine", {
      ...completeSections,
      styleRenderQuality: "This variable text must never appear in the final masculine prompt.",
    });

    expect(METHOD_SPECS.feminine.opening).toBe("Ultra-realistic cinematic avatar 3D female portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 beauty realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI beauty proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.");
    expect(METHOD_SPECS.feminine.closing).toBe("Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired beauty repaint style, high-fidelity feminine avatar rendering, realistic depth of field, glossy beauty aesthetic, polished virtual influencer atmosphere, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI avatar aesthetics instead of a real photograph.");
    expect(METHOD_SPECS.masculine.opening).toBe("Ultra-realistic cinematic avatar 3D male portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI masculine proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.");
    expect(METHOD_SPECS.masculine.closing).toBe("Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 masculine beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired avatar repaint aesthetics, high-fidelity masculine CGI rendering, realistic atmospheric depth, polished virtual influencer styling, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI-avatar aesthetics instead of a real photograph.");
    expect(feminine.endsWith(`STYLE & RENDER QUALITY\n${METHOD_SPECS.feminine.closing}`)).toBe(true);
    expect(masculine.endsWith(`STYLE & RENDER QUALITY\n${METHOD_SPECS.masculine.closing}`)).toBe(true);
    expect(feminine.split(METHOD_SPECS.feminine.closing)).toHaveLength(2);
    expect(masculine.split(METHOD_SPECS.masculine.closing)).toHaveLength(2);
    expect(feminine).not.toContain("This variable text must never appear in the final feminine prompt.");
    expect(masculine).not.toContain("This variable text must never appear in the final masculine prompt.");
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

  it("keeps the authorized Feminine FACE & IDENTITY block literal when personal traits are supplied", () => {
    const personalTraits = "Face & Identity: Oval face with freckles and blue-grey eyes.\nHair: Long platinum blonde hair.\nBody & Physique: Slender shoulders.";
    const feminine = renderMethodPrompt("feminine", {
      ...completeSections,
      faceIdentity: "This generated facial description must not replace the authorized base.",
    }, personalTraits);
    const masculine = renderMethodPrompt("masculine", completeSections, personalTraits);

    expect(feminine).toContain(`FACE & IDENTITY\n${METHOD_SPECS.feminine.faceIdentityBase}`);
    expect(feminine).not.toContain("Mandatory identity traits to preserve:");
    expect(feminine).not.toContain("Oval face with freckles and blue-grey eyes.");
    expect(feminine).not.toContain("This generated facial description must not replace the authorized base.");
    expect(feminine).toContain("Mandatory hair traits to preserve: Long platinum blonde hair.");
    expect(feminine).toContain("Mandatory body and proportion traits to preserve: Slender shoulders.");
    expect(masculine).toContain("Mandatory identity traits to preserve: Oval face with freckles and blue-grey eyes.");
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
    expect(feminineSystem).toContain("STYLE & RENDER QUALITY (immutable fixed base text; renderer applies it).");
    expect(masculineSystem).toContain("STYLE & RENDER QUALITY is immutable: its generated value will be replaced by the exact fixed base text");
  });
});
