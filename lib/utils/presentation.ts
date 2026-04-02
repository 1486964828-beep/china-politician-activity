import { cleanText, splitSentences } from "./text";

export function normalizeSourceTitle(title: string) {
  return cleanText(title)
    .replace(/_[^_]{1,24}_(红星新闻网|人民网|新华网|成都日报|四川日报)$/g, "")
    .replace(/_红星新闻网$/g, "")
    .replace(/[|｜]\s*(红星新闻网|人民网|新华网|成都日报|四川日报).*$/g, "")
    .trim();
}

export function cleanArticleBody(text: string, title = "") {
  const normalizedTitle = normalizeSourceTitle(title);
  let value = cleanText(text)
    .replace(/^.*?打开微信，点击底部的发现，使用扫一扫即可将网页分享。/, "")
    .replace(/^首页\|原创\|杭州新闻.*?发布时间[:：]\s*\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}\s*/u, "")
    .replace(/^首页\|.*?所在位置[:：]\s*[^。]*?(?=(?:\d{1,2}月\d{1,2}日|近日|日前|当地时间|会议指出|会议强调|\d{1,2}日))/u, "")
    .replace(/^.*?(?=(?:\d{1,2}月\d{1,2}日|近日|日前|当地时间|会议指出|会议强调))/u, "")
    .replace(/^\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}\s*来源[:：]\s*[^。]+/u, "")
    .replace(/^来源[:：]\s*[^。]+/u, "")
    .replace(/\(原标题[:：][^)]+\)\s*来源[:：][\s\S]*$/u, "")
    .replace(/https?:\/\/\S+[\s\S]*$/u, "")
    .replace(/返回\s*杭州网[·•].*$/u, "")
    .trim();

  if (normalizedTitle && value.startsWith(normalizedTitle)) {
    value = value.slice(normalizedTitle.length).trim();
  }

  return value;
}

export function buildDisplaySummary(text: string, title = "", maxSentences = 2) {
  const cleaned = cleanArticleBody(text, title);
  return splitSentences(cleaned)
    .slice(0, maxSentences)
    .join("。");
}
