import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { generateMethodOnePrompt } from "./promptEngine";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  prompt: router({
    generate: publicProcedure
      .input(
        z
          .object({
            mode: z.enum(["text", "photo"]),
            userText: z.string().trim().min(8).max(2400).optional(),
            imageDataUrl: z.string().max(6_500_000).optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "text" && !value.userText) {
              ctx.addIssue({ code: "custom", message: "Write a little more about the desired prompt." });
            }
            if (value.mode === "photo" && !value.imageDataUrl?.startsWith("data:image/")) {
              ctx.addIssue({ code: "custom", message: "Choose a valid image to analyse." });
            }
          })
      )
      .mutation(async ({ input }) => {
        try {
          const prompt = await generateMethodOnePrompt(input);
          return { prompt };
        } catch (error) {
          console.error("[Tezza Prompts] Generation failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "We could not generate your prompt just now. Please try again.",
          });
        }
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
