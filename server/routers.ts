import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { extractFaceTraits, generateMethodPrompt } from "./promptEngine";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl } from "./storage";

const FACE_REFERENCE_KEY = /^tezza-prompts\/references\/face\//;
const SCENE_REFERENCE_KEY = /^tezza-prompts\/references\/scene\//;

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
          faceReferenceKey: z.string().min(1).max(500).regex(FACE_REFERENCE_KEY, "Envie uma foto de rosto válida antes de extrair os traços."),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const faceReferenceUrl = await storageGetSignedUrl(input.faceReferenceKey);
          const traits = await extractFaceTraits({ method: input.method, faceReferenceUrl });
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
            aspectRatio: z.enum(["1:1", "9:16", "16:9", "4:5"]).default("9:16"),
            sceneImageKey: z.string().min(1).max(500).regex(SCENE_REFERENCE_KEY, "Envie uma imagem de cena válida antes de gerar.").optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "text" && !value.userText) ctx.addIssue({ code: "custom", message: "Descreva um pouco mais a direção desejada para o prompt." });
            if (value.mode === "photo" && !value.sceneImageKey) ctx.addIssue({ code: "custom", message: "Escolha uma imagem de cena válida para analisar." });
          })
      )
      .mutation(async ({ input }) => {
        try {
          const sceneImageUrl = input.sceneImageKey ? await storageGetSignedUrl(input.sceneImageKey) : undefined;
          const prompt = await generateMethodPrompt({ ...input, sceneImageUrl });
          return { prompt, method: input.method };
        } catch (error) {
          console.error("[Tezza Prompts] Generation failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: getFriendlyGenerationError(error, "prompt") });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
