import { generateText } from "ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { createTranslationProvider } from "./ai/provider";
import { log } from "./lib/logger";
import {
  AiMisconfigured,
  AiTransient,
  AiUnavailable,
  classifyAiError,
  listModels,
} from "./ai/client";

let modelPromise: Promise<string> | null = null;

function getDefaultModel() {
  if (!modelPromise) {
    modelPromise = listModels()
      .then(({ defaultModelId }) => defaultModelId)
      .catch((error) => {
        modelPromise = null;
        throw error;
      });
  }
  return modelPromise;
}

export const translateRouter = createRouter({
  run: publicQuery
    .input(
      z.object({
        text: z.string().trim().min(1).max(1200),
        direction: z.enum(["zh-en", "en-zh"]),
      }),
    )
    .mutation(async ({ input }) => {
      const provider = createTranslationProvider();
      if (!provider) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "翻译服务尚未配置，请重新打开站点后再试。",
        });
      }

      const from = input.direction === "zh-en" ? "Chinese" : "English";
      const to = input.direction === "zh-en" ? "English" : "Chinese";

      try {
        const modelId = await getDefaultModel();
        const result = await generateText({
          model: provider(modelId),
          system: `You are a precise simultaneous interpreter. Translate the user's ${from} speech transcript into natural, concise ${to}. Preserve meaning, names, numbers and tone. Return only the translation, without notes, labels or quotation marks.`,
          prompt: input.text,
          abortSignal: AbortSignal.timeout(25_000),
          providerOptions: { "kimi-gw": { max_completion_tokens: 500 } },
        });
        const translated = result.text.trim();
        if (!translated) throw new AiTransient("翻译结果为空");
        return { translated };
      } catch (error) {
        const classified = classifyAiError(error);
        log.error("translation model call failed", {
          type: classified.name,
          error: error instanceof Error ? error.message : String(error),
        });
        const message =
          classified instanceof AiUnavailable
            ? "翻译额度当前不可用，请稍后再试或联系站点管理员。"
            : classified instanceof AiMisconfigured
              ? "翻译服务配置异常，请重新打开站点后再试。"
              : classified instanceof AiTransient
                ? "翻译服务暂时繁忙，请稍后手动重试。"
                : "这段内容暂时无法翻译，请换一段文字重试。";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
