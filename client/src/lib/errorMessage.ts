type ErrorWithMessage = { message?: string };

function findIssueMessage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findIssueMessage(item);
      if (message) return message;
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
    for (const nested of Object.values(record)) {
      const message = findIssueMessage(nested);
      if (message) return message;
    }
  }

  return undefined;
}

export function getMutationErrorMessage(error: ErrorWithMessage, fallback: string) {
  const message = error.message?.trim();
  if (!message) return fallback;
  if (!message.startsWith("[") && !message.startsWith("{")) return message;

  try {
    return findIssueMessage(JSON.parse(message)) ?? fallback;
  } catch {
    return fallback;
  }
}
