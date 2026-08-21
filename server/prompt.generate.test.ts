import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { METHOD_SPECS, SECTION_DEFINITIONS } from "./promptEngine";

const { invokeLLMMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function mockStructuredGeneration() {
  const response = Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, `English content for ${key}.`]));
  invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(response) } }] });
}

describe("prompt.generate", () => {
  beforeEach(() => invokeLLMMock.mockReset());

  it("generates the independent Masculine prompt and passes traits to the model", async () => {
    mockStructuredGeneration();
    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.generate({
      method: "masculine",
      mode: "text",
      userText: "Adult CGI avatar in a refined night-time rooftop editorial scene.",
      personalTraits: "Keep short black curly hair and a lean athletic build.",
    });

    expect(result.method).toBe("masculine");
    expect(result.prompt.startsWith(METHOD_SPECS.masculine.opening)).toBe(true);
    expect(JSON.stringify(invokeLLMMock.mock.calls[0]?.[0])).toContain("short black curly hair");
  });

  it("sends a selected image as multimodal content for the Feminine method", async () => {
    mockStructuredGeneration();
    const caller = appRouter.createCaller(createContext());
    await caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageDataUrl: "data:image/png;base64,ZmFrZQ==" });

    const request = invokeLLMMock.mock.calls[0]?.[0];
    expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "image_url" })]));
  });

  it("rejects incomplete mode inputs before calling the model", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ method: "masculine", mode: "text" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.prompt.generate({ method: "feminine", mode: "photo" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized image payload before it reaches the generation service", async () => {
    const caller = appRouter.createCaller(createContext());
    const oversizedImage = `data:image/jpeg;base64,${"a".repeat(950_000)}`;

    await expect(caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageDataUrl: oversizedImage })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("extracts editable face traits independently of the scene image for either method", async () => {
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "```json\n{\"traits\": \"Long wavy blonde hair, almond-shaped hazel eyes, an oval face, and pale skin.\"}\n```" } }] });
    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.extractTraits({ method: "masculine", faceReferenceDataUrl: "data:image/jpeg;base64,ZmFrZQ==" });

    expect(result.traits).toContain("Long wavy blonde hair");
    const request = invokeLLMMock.mock.calls[0]?.[0];
    expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "image_url" })]));
    expect(String(request.messages[0].content)).toContain("Do not identify the person");
  });

  it("keeps the face source and scene source independent from extraction through photo generation for both methods", async () => {
    const caller = appRouter.createCaller(createContext());
    const sections = Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, `Scene-directed content for ${key}.`]));

    for (const [method, traits] of [
      ["feminine", "Oval face, long wavy blonde hair, and hazel eyes."],
      ["masculine", "Angular face, short black curls, brown eyes, and a trimmed beard."],
    ] as const) {
      invokeLLMMock
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ traits }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(sections) } }] });

      const extracted = await caller.prompt.extractTraits({ method, faceReferenceDataUrl: "data:image/jpeg;base64,ZmFjZQ==" });
      const generated = await caller.prompt.generate({ method, mode: "photo", personalTraits: extracted.traits, sceneImageDataUrl: "data:image/jpeg;base64,c2NlbmU=" });

      expect(generated.prompt.startsWith(METHOD_SPECS[method].opening)).toBe(true);
      expect(generated.prompt).toContain(METHOD_SPECS[method].closing);
    }

    const [femaleFace, femaleScene, maleFace, maleScene] = invokeLLMMock.mock.calls.map(call => call[0]);
    expect(JSON.stringify(femaleFace.messages[1].content)).toContain("ZmFjZQ==");
    expect(JSON.stringify(femaleScene.messages[1].content)).toContain("c2NlbmU=");
    expect(String(femaleScene.messages[0].content)).toContain("long wavy blonde hair");
    expect(JSON.stringify(maleFace.messages[1].content)).toContain("ZmFjZQ==");
    expect(JSON.stringify(maleScene.messages[1].content)).toContain("c2NlbmU=");
    expect(String(maleScene.messages[0].content)).toContain("short black curls");
  });

  it("returns a controlled server error when generation fails", async () => {
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "not-valid-json" } }] });
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ method: "feminine", mode: "text", userText: "Adult CGI avatar with a minimal luxury editorial direction." })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
