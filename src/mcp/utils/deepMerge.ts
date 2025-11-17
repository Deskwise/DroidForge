export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T>(existing: T, incoming: Partial<T>): T {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return incoming.slice() as unknown as T;
  }

  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const result: Record<string, unknown> = { ...existing };

    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined) continue;
      const current = (existing as Record<string, unknown>)[key];

      if (current === undefined) {
        result[key] = value;
      } else {
        result[key] = deepMerge(current, value as Record<string, unknown>);
      }
    }

    return result as T;
  }

  return incoming as T;
}
