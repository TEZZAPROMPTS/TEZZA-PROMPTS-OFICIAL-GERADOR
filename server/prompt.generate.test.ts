import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { METHOD_SPECS, SECTION_DEFINITIONS } from "./promptEngine";

const { invokeLLMMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));

import { appRouter, getFriendlyGenerationError } from "./routers";

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
    expect(result.prompt).toContain("Mandatory identity traits to preserve: Keep short black curly hair and a lean athletic build.");
    expect(result.prompt).toContain("Mandatory hair traits to preserve: Keep short black curly hair and a lean athletic build.");
    expect(result.prompt).toContain("Mandatory body and proportion traits to preserve: Keep short black curly hair and a lean athletic build.");
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
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "```json\n{\"faceIdentity\": \"Almond-shaped hazel eyes, an oval face, and pale skin.\", \"hair\": \"Long wavy blonde hair.\", \"bodyPhysique\": \"\"}\n```" } }] });
    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.extractTraits({ method: "masculine", faceReferenceDataUrl: "data:image/jpeg;base64,ZmFrZQ==" });

    expect(result.traits).toContain("Hair: Long wavy blonde hair");
    expect(result.traits).toContain("Face & identity: Almond-shaped hazel eyes");
    const request = invokeLLMMock.mock.calls[0]?.[0];
    expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "image_url" })]));
    expect(String(request.messages[0].content)).toContain("Do not identify the person");
  });

  it("retries once when the first face-trait response is malformed", async () => {
    invokeLLMMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "partial-face-json" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ faceIdentity: "Brown eyes and an angular face.", hair: "Short black curly hair.", bodyPhysique: "" }) } }] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.extractTraits({ method: "masculine", faceReferenceDataUrl: "data:image/jpeg;base64,ZmFrZQ==" });

    expect(result.traits).toContain("Hair: Short black curly hair");
    expect(invokeLLMMock).toHaveBeenCalledTimes(2);
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
      expect(generated.prompt).toContain(`Mandatory identity traits to preserve: ${traits}`);
      expect(generated.prompt).toContain(`Mandatory hair traits to preserve: ${traits}`);
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
    await expect(caller.prompt.generate({ method: "feminine", mode: "text", userText: "Adult CGI avatar with a minimal luxury editorial direction." })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "A IA devolveu uma resposta incompleta. Tente gerar novamente; se necessário, use uma foto de cena mais simples." });
  });

  it("returns a specific validation message when a scene image is too large", async () => {
    const caller = appRouter.createCaller(createContext());
    const oversizedImage = `data:image/jpeg;base64,${"a".repeat(950_000)}`;

    await expect(caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageDataUrl: oversizedImage })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps temporary AI unavailability to a helpful message", () => {
    expect(getFriendlyGenerationError(new Error("LLM invoke failed: 503 temporary unavailable"), "prompt")).toBe(
      "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente."
    );
  });

  it("retries once when the first structured prompt response is malformed", async () => {
    const completeSections = Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, `Recovered English content for ${key}.`]));
    invokeLLMMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "partial-json" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(completeSections) } }] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.generate({ method: "masculine", mode: "text", userText: "Adult CGI avatar with a concise editorial studio direction." });

    expect(result.prompt.startsWith(METHOD_SPECS.masculine.opening)).toBe(true);
    expect(invokeLLMMock).toHaveBeenCalledTimes(2);
  });
});
