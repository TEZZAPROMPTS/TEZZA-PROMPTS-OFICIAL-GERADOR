import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { generateMethodPrompt } from "./promptEngine";
import { publicProcedure, router } from "./_core/trpc";

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
    generate: publicProcedure
      .input(
        z
          .object({
            method: z.enum(["feminine", "masculine"]).default("feminine"),
            mode: z.enum(["text", "photo"]),
            userText: z.string().trim().min(8).max(2400).optional(),
            personalTraits: z.string().trim().max(1800).optional(),
            imageDataUrl: z.string().max(950_000, "The image is still too large. Please choose a smaller image.").optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "text" && !value.userText) ctx.addIssue({ code: "custom", message: "Write a little more about the desired prompt." });
            if (value.mode === "photo" && !value.imageDataUrl?.startsWith("data:image/")) ctx.addIssue({ code: "custom", message: "Choose a valid image to analyse." });
          })
      )
      .mutation(async ({ input }) => {
        try {
          const prompt = await generateMethodPrompt(input);
          return { prompt, method: input.method };
        } catch (error) {
          console.error("[Tezza Prompts] Generation failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not generate your prompt just now. Please try again." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
