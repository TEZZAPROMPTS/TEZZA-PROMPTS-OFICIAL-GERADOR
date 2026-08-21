import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { SECTION_DEFINITIONS } from "./promptEngine";

const { invokeLLMMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function mockStructuredGeneration() {
  const response = Object.fromEntries(
    SECTION_DEFINITIONS.map(({ key }) => [key, `English content for ${key}.`])
  );
  invokeLLMMock.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(response) } }],
  });
}

describe("prompt.generate", () => {
  beforeEach(() => {
    invokeLLMMock.mockReset();
  });

  it("generates a structured Method 1 prompt from text", async () => {
    mockStructuredGeneration();
    const caller = appRouter.createCaller(createContext());

    const result = await caller.prompt.generate({
      mode: "text",
      userText: "Adult CGI avatar in a refined night-time rooftop editorial scene.",
    });

    expect(result.prompt).toContain("CAMERA & COMPOSITION");
    expect(result.prompt).toContain("STYLE & RENDER QUALITY");
    expect(invokeLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-3-flash-preview" })
    );
  });

  it("sends the selected image as multimodal content in photo mode", async () => {
    mockStructuredGeneration();
    const caller = appRouter.createCaller(createContext());

    await caller.prompt.generate({
      mode: "photo",
      imageDataUrl: "data:image/png;base64,ZmFrZQ==",
    });

    const request = invokeLLMMock.mock.calls[0]?.[0];
    const photoMessage = request.messages[1];
    expect(photoMessage.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image_url" }),
      ])
    );
  });

  it("rejects incomplete mode inputs before calling the model", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.prompt.generate({ mode: "text" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(caller.prompt.generate({ mode: "photo" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("returns a controlled server error when generation fails", async () => {
    invokeLLMMock.mockRejectedValue(new Error("service unavailable"));
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.prompt.generate({
        mode: "text",
        userText: "Adult CGI avatar with a minimal luxury editorial direction.",
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
