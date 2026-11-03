export type TranslationDirection = "zh-en" | "en-zh";

const API_URL = "https://api.mymemory.translated.net/get";
const MAX_BYTES = 450;
const encoder = new TextEncoder();

function splitByBytes(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (encoder.encode(remaining).length > MAX_BYTES) {
    let end = 0;
    for (const character of remaining) {
      const nextEnd = end + character.length;
      if (encoder.encode(remaining.slice(0, nextEnd)).length > MAX_BYTES) break;
      end = nextEnd;
    }
    if (end === 0) throw new Error("文本无法分段，请缩短后重试。");

    const candidate = remaining.slice(0, end);
    const preferred = Math.max(
      candidate.lastIndexOf("。"),
      candidate.lastIndexOf("！"),
      candidate.lastIndexOf("？"),
      candidate.lastIndexOf("!"),
      candidate.lastIndexOf("?"),
      candidate.lastIndexOf("."),
      candidate.lastIndexOf("\n"),
      candidate.lastIndexOf(" "),
    );
    const cut = preferred > Math.floor(candidate.length * 0.45) ? preferred + 1 : end;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(text: string, direction: TranslationDirection): Promise<string> {
  const langpair = direction === "zh-en" ? "zh-CN|en-US" : "en-US|zh-CN";
  const url = new URL(API_URL);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", langpair);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) throw new Error("免费翻译额度已用尽或请求过于频繁，请稍后重试。");
      throw new Error(`翻译服务暂时不可用（HTTP ${response.status}）。`);
    }
    const data = await response.json();
    if (data.quotaFinished) throw new Error("今日免费翻译额度已用尽，请明天再试。");
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error("翻译服务未返回有效结果，请稍后重试。");
    }
    const translated = String(data.responseData.translatedText);
    return new DOMParser().parseFromString(translated, "text/html").documentElement.textContent?.trim() || translated;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("翻译请求超时，请检查网络后重试。");
    }
    if (error instanceof TypeError) {
      throw new Error("无法连接翻译服务，请检查网络后重试。");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function translateText(text: string, direction: TranslationDirection): Promise<string> {
  const chunks = splitByBytes(text);
  const translated: string[] = [];
  for (const chunk of chunks) translated.push(await translateChunk(chunk, direction));
  return translated.join(direction === "zh-en" ? " " : "");
}
