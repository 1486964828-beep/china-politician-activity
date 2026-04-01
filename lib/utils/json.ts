export function parseJsonArray(value?: string | null) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyJsonArray(values: string[]) {
  return JSON.stringify(Array.from(new Set(values.filter(Boolean))));
}
