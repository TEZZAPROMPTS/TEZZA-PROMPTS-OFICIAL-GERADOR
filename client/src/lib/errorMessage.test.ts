import { describe, expect, it } from "vitest";
import { getMutationErrorMessage } from "./errorMessage";

describe("getMutationErrorMessage", () => {
  it("extracts the specific user-facing message from a tRPC Zod error payload", () => {
    const error = {
      message: JSON.stringify([{ origin: "string", code: "too_big", maximum: 950000, message: "A imagem da cena ainda está grande demais. Escolha uma imagem menor." }]),
    };

    expect(getMutationErrorMessage(error, "Mensagem genérica")).toBe("A imagem da cena ainda está grande demais. Escolha uma imagem menor.");
  });

  it("keeps the server message for an incomplete AI response", () => {
    expect(getMutationErrorMessage({ message: "A IA devolveu uma resposta incompleta. Tente novamente." }, "Mensagem genérica")).toBe("A IA devolveu uma resposta incompleta. Tente novamente.");
  });

  it("uses the fallback when no usable error message is available", () => {
    expect(getMutationErrorMessage({ message: "[malformed" }, "Mensagem genérica")).toBe("Mensagem genérica");
  });
});
