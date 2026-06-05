import "dotenv/config";

export function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function optional(name: string, fallback?: string) {
  return process.env[name] ?? fallback;
}

export function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

export function parseStringArrayEnv(value: string | undefined, envName: string) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {}

  throw new Error(`${envName} must be a JSON array of strings.`);
}