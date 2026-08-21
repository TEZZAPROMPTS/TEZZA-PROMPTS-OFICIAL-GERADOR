import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { METHOD_SPECS, SECTION_DEFINITIONS } from "./promptEngine";

const { invokeLLMMock, storageGetSignedUrlMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn(), storageGetSignedUrlMock: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));
vi.mock("./storage", () => ({ storageGetSignedUrl: storageGetSignedUrlMock }));

import { appRouter, getFriendlyGenerationError } from "./routers";

function createContext(): TrpcContext {
  return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function mockStructuredGeneration() {
  const response = Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, `English content for ${key}.`]));
  invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(response) } }] });
}

describe("prompt.generate", () => {
  const faceKey = "tezza-prompts/references/face/face-reference.jpg";
  const sceneKey = "tezza-prompts/references/scene/scene-reference.jpg";

  beforeEach(() => {
    invokeLLMMock.mockReset();
    storageGetSignedUrlMock.mockReset();
    storageGetSignedUrlMock.mockImplementation(async (key: string) => `https://signed-storage.example/${key}`);
  });

  it("passes personal traits to the model without injecting technical preservation text into the prompt", async () => {
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
    expect(result.prompt).not.toContain("traits to preserve:");
    expect(result.prompt).not.toContain("Mandatory");
  });

  it("sends a selected image as multimodal content for the Feminine method", async () => {
    mockStructuredGeneration();
    const caller = appRouter.createCaller(createContext());
    await caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageKey: sceneKey });

    const request = invokeLLMMock.mock.calls[0]?.[0];
    expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "image_url" })]));
    expect(JSON.stringify(request.messages[1].content)).toContain(`https://signed-storage.example/${sceneKey}`);
    expect(storageGetSignedUrlMock).toHaveBeenCalledWith(sceneKey);
  });

  it("rejects incomplete mode inputs before calling the model", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ method: "masculine", mode: "text" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.prompt.generate({ method: "feminine", mode: "photo" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("rejects embedded image payloads before they reach the generation service", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageKey: "data:image/jpeg;base64,not-allowed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("extracts editable face traits independently of the scene image for either method", async () => {
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "```json\n{\"faceIdentity\": \"Almond-shaped hazel eyes and an oval face.\", \"hair\": \"Long wavy blonde hair.\", \"skinRealism\": \"Pale warm-toned skin with light freckles.\", \"bodyPhysique\": \"\"}\n```" } }] });
    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.extractTraits({ method: "masculine", faceReferenceKey: faceKey });

    expect(result.traits).toContain("Hair: Long wavy blonde hair");
    expect(result.traits).toContain("Face & identity: Almond-shaped hazel eyes");
    expect(result.traits).toContain("Skin & realism: Pale warm-toned skin with light freckles");
    const request = invokeLLMMock.mock.calls[0]?.[0];
    expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "image_url" })]));
    expect(JSON.stringify(request.messages[1].content)).toContain(`https://signed-storage.example/${faceKey}`);
    expect(String(request.messages[0].content)).toContain("Do not identify the person");
  });

  it("retries once when the first face-trait response is malformed", async () => {
    invokeLLMMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "partial-face-json" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ faceIdentity: "Brown eyes and an angular face.", hair: "Short black curly hair.", skinRealism: "Medium olive skin with realistic texture.", bodyPhysique: "" }) } }] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.prompt.extractTraits({ method: "masculine", faceReferenceKey: faceKey });

    expect(result.traits).toContain("Hair: Short black curly hair");
    expect(invokeLLMMock).toHaveBeenCalledTimes(2);
  });

  it("keeps face, hair, skin, and body traits in their correct sections from extraction through photo generation for both methods", async () => {
    const caller = appRouter.createCaller(createContext());
    const sections = Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, `Scene-directed content for ${key}.`]));

    for (const [method, extractedTraits] of [
      ["feminine", { faceIdentity: "Oval face with hazel eyes.", hair: "Long wavy blonde hair falling over the shoulders.", skinRealism: "Fair warm-toned skin with light freckles.", bodyPhysique: "Slender shoulders." }],
      ["masculine", { faceIdentity: "Angular face with brown eyes and a trimmed beard.", hair: "Short black curls with natural texture.", skinRealism: "Medium olive skin with realistic pores.", bodyPhysique: "Lean athletic build." }],
    ] as const) {
      invokeLLMMock
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(extractedTraits) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(sections) } }] });

      const extracted = await caller.prompt.extractTraits({ method, faceReferenceKey: faceKey });
      const generated = await caller.prompt.generate({ method, mode: "photo", personalTraits: extracted.traits, sceneImageKey: sceneKey });

      expect(generated.prompt.startsWith(METHOD_SPECS[method].opening)).toBe(true);
      expect(generated.prompt).toContain(METHOD_SPECS[method].closing);
      expect(generated.prompt).toContain(`FACE & IDENTITY\n${extractedTraits.faceIdentity} Scene-directed content for faceIdentity.`);
      expect(generated.prompt).toContain(`HAIR\n${extractedTraits.hair} Scene-directed content for hair.`);
      expect(generated.prompt).toContain(`SKIN & REALISM\n${extractedTraits.skinRealism} Scene-directed content for skinRealism.`);
      expect(generated.prompt).toContain(`BODY & PHYSIQUE\n${extractedTraits.bodyPhysique} Scene-directed content for bodyPhysique.`);
      expect(generated.prompt).not.toContain("traits to preserve:");
    }

    const [femaleFace, femaleScene, maleFace, maleScene] = invokeLLMMock.mock.calls.map(call => call[0]);
    expect(JSON.stringify(femaleFace.messages[1].content)).toContain(`https://signed-storage.example/${faceKey}`);
    expect(JSON.stringify(femaleScene.messages[1].content)).toContain(`https://signed-storage.example/${sceneKey}`);
    expect(String(femaleScene.messages[0].content)).toContain("Long wavy blonde hair falling over the shoulders");
    expect(JSON.stringify(maleFace.messages[1].content)).toContain(`https://signed-storage.example/${faceKey}`);
    expect(JSON.stringify(maleScene.messages[1].content)).toContain(`https://signed-storage.example/${sceneKey}`);
    expect(String(maleScene.messages[0].content)).toContain("Short black curls with natural texture");
  });

  it("returns a controlled server error when generation fails", async () => {
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "not-valid-json" } }] });
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ method: "feminine", mode: "text", userText: "Adult CGI avatar with a minimal luxury editorial direction." })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "A IA devolveu uma resposta incompleta. Tente gerar novamente; se necessário, use uma foto de cena mais simples." });
  });

  it("returns a specific validation error when a scene reference was not uploaded", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.prompt.generate({ method: "feminine", mode: "photo", sceneImageKey: "tezza-prompts/references/face/not-a-scene.jpg" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
