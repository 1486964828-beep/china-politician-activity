export function getArgValue(flag: string, fallback?: string) {
  const raw = process.argv.find((item) => item.startsWith(`${flag}=`));
  return raw ? raw.slice(flag.length + 1) : fallback;
}

export function hasFlag(flag: string) {
  return process.argv.includes(flag);
}
