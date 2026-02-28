export function env(key: string): string | undefined {
  return process.env[key] ?? (import.meta.env as Record<string, string>)?.[key];
}
