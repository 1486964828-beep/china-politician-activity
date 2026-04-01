const STOPWORDS = new Set(["工作", "会议", "活动", "有关", "强调", "指出", "表示", "研究", "部署"]);

export function cleanText(text: string) {
  return text.replace(/\s+/g, " ").replace(/[“”"《》【】]/g, "").trim();
}

export function splitSentences(text: string) {
  return cleanText(text)
    .split(/[。！？]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractKeywords(text: string, limit = 6) {
  const chunks = cleanText(text)
    .split(/[，、；：\s]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOPWORDS.has(item));

  return Array.from(new Set(chunks)).slice(0, limit);
}

export function tokenize(text: string) {
  return extractKeywords(text, 24);
}

export function jaccardSimilarity(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  let intersection = 0;

  for (const item of setA) {
    if (setB.has(item)) {
      intersection += 1;
    }
  }

  return union.size === 0 ? 0 : intersection / union.size;
}

export function summarize(text: string, maxSentences = 2) {
  return splitSentences(text)
    .slice(0, maxSentences)
    .join("。");
}
