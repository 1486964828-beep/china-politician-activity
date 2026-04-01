const ONE_DAY = 24 * 60 * 60 * 1000;

function buildUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseMonthInput(month: string) {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month: ${month}`);
  }

  return { year, month: monthNumber };
}

export function enumerateMonthDays(month: string) {
  const { year, month: monthNumber } = parseMonthInput(month);
  const cursor = new Date(Date.UTC(year, monthNumber - 1, 1));
  const dates: Date[] = [];

  while (cursor.getUTCMonth() === monthNumber - 1) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function getMonthBounds(month: string) {
  const { year, month: monthNumber } = parseMonthInput(month);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

export function enumerateDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const dates: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function formatIsoDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

export function toChinaDate(input: string | Date) {
  const value = typeof input === "string" ? new Date(input) : input;
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + 1;
  const day = value.getUTCDate();
  return `${year}年${month}月${day}日`;
}

export function withinDays(a: Date, b: Date, days: number) {
  return Math.abs(a.getTime() - b.getTime()) <= days * ONE_DAY;
}

export function extractDateHint(text: string, publishTime?: Date | null) {
  const isoDateMatch = text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return buildUtcDate(Number(year), Number(month), Number(day));
  }

  const fullDateMatch = text.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);

  if (fullDateMatch) {
    const [, year, month, day] = fullDateMatch;
    return buildUtcDate(Number(year), Number(month), Number(day));
  }

  const monthRangeMatch = text.match(/(\d{1,2})月(\d{1,2})日\s*(?:至|-|—|~)\s*(\d{1,2})日/);

  if (monthRangeMatch && publishTime) {
    const [, month, day] = monthRangeMatch;
    return buildUtcDate(publishTime.getUTCFullYear(), Number(month), Number(day));
  }

  const dayRangeMatch = text.match(/(\d{1,2})日\s*(?:至|-|—|~)\s*(\d{1,2})日/);

  if (dayRangeMatch && publishTime) {
    const [, day] = dayRangeMatch;
    return buildUtcDate(publishTime.getUTCFullYear(), publishTime.getUTCMonth() + 1, Number(day));
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})日/);

  if (monthDayMatch && publishTime) {
    const [, month, day] = monthDayMatch;
    return buildUtcDate(publishTime.getUTCFullYear(), Number(month), Number(day));
  }

  const dayOnlyMatch = text.match(/(?:^|[，。；：\s])(\d{1,2})日(?:上午|下午|晚上|晚间|中午|凌晨|清晨)/);

  if (dayOnlyMatch && publishTime) {
    const [, day] = dayOnlyMatch;
    return buildUtcDate(publishTime.getUTCFullYear(), publishTime.getUTCMonth() + 1, Number(day));
  }

  if (publishTime && /昨日|昨天/.test(text)) {
    return new Date(publishTime.getTime() - ONE_DAY);
  }

  if (publishTime && /今日|今天/.test(text)) {
    return publishTime;
  }

  return null;
}

export function parseChineseDateHint(text: string, publishTime?: Date | null) {
  const explicit = extractDateHint(text, publishTime);

  if (explicit) {
    return explicit;
  }

  return publishTime ?? new Date();
}
