export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function escapeAirtableString(value: string) {
  return value.replace(/'/g, "\\'");
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}