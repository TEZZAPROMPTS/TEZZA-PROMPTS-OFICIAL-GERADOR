import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { extractFaceTraits, generateMethodPrompt } from "./promptEngine";
import { publicProcedure, router } from "./_core/trpc";

export function getFriendlyGenerationError(error: unknown, action: "traits" | "prompt") {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (detail.includes("invalid structured response") || detail.includes("empty response")) {
    return action === "traits"
      ? "A IA não conseguiu ler os traços desta foto de rosto. Tente outra imagem nítida, bem iluminada e de frente."
      : "A IA devolveu uma resposta incompleta. Tente gerar novamente; se necessário, use uma foto de cena mais simples.";
  }
  if (detail.includes("llm invoke failed") || detail.includes("timeout")) {
    return "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente.";
  }
  return action === "traits"
    ? "Não foi possível extrair os traços desta foto agora. Tente uma imagem nítida do rosto."
    : "Não foi possível gerar o prompt agora. Tente novamente em alguns instantes.";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  prompt: router({
    extractTraits: publicProcedure
      .input(
        z.object({
          method: z.enum(["feminine", "masculine"]),
          faceReferenceDataUrl: z.string().max(950_000, "A imagem do rosto ainda está grande demais. Escolha uma imagem menor.").refine(value => value.startsWith("data:image/"), "Escolha uma imagem de rosto válida."),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const traits = await extractFaceTraits(input);
          return { traits };
        } catch (error) {
          console.error("[Tezza Prompts] Face trait extraction failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: getFriendlyGenerationError(error, "traits") });
        }
      }),
    generate: publicProcedure
      .input(
        z
          .object({
            method: z.enum(["feminine", "masculine"]).default("feminine"),
            mode: z.enum(["text", "photo"]),
            userText: z.string().trim().min(8).max(2400).optional(),
            personalTraits: z.string().trim().max(1800).optional(),
            sceneImageDataUrl: z.string().max(950_000, "A imagem da cena ainda está grande demais. Escolha uma imagem menor.").optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "text" && !value.userText) ctx.addIssue({ code: "custom", message: "Descreva um pouco mais a direção desejada para o prompt." });
            if (value.mode === "photo" && !value.sceneImageDataUrl?.startsWith("data:image/")) ctx.addIssue({ code: "custom", message: "Escolha uma imagem de cena válida para analisar." });
          })
      )
      .mutation(async ({ input }) => {
        try {
          const prompt = await generateMethodPrompt(input);
          return { prompt, method: input.method };
        } catch (error) {
          console.error("[Tezza Prompts] Generation failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: getFriendlyGenerationError(error, "prompt") });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
