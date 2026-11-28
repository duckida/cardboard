export interface ServiceAccountCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

/**
 * Escape raw control characters that sit inside JSON string values. Pasting a
 * service-account file straight into a host's env field keeps its real
 * newlines, which makes `JSON.parse` fail even though the JSON is otherwise
 * fine. Newlines outside strings are legal whitespace and are left alone.
 */
function escapeControlCharsInStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (!inString) {
      if (char === '"') inString = true;
      out += char;
      continue;
    }
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      out += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = false;
      out += char;
      continue;
    }
    if (char === '\n') {
      out += '\\n';
      continue;
    }
    if (char === '\r') {
      out += '\\r';
      continue;
    }
    if (char === '\t') {
      out += '\\t';
      continue;
    }
    out += char;
  }
  return out;
}

/** The shapes an operator might realistically paste into an env var. */
function candidates(raw: string): string[] {
  const trimmed = raw.trim();
  const values: string[] = [trimmed];

  // Some hosts wrap the whole value in quotes.
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const unwrapped = JSON.parse(trimmed);
      if (typeof unwrapped === 'string') values.push(unwrapped);
    } catch {
      // not a quoted string; keep going
    }
  }

  // Base64-encoded JSON is a common workaround for newlines.
  if (!trimmed.includes('{') && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed.replace(/\s+/g, ''), 'base64').toString('utf8');
      if (decoded.includes('{')) values.push(decoded);
    } catch {
      // not base64; keep going
    }
  }

  return values;
}

function normalize(value: unknown): ServiceAccountCredentials | null {
  if (!value || typeof value !== 'object') return null;
  const account = value as Record<string, unknown>;
  const projectId = typeof account.project_id === 'string' ? account.project_id : '';
  const clientEmail = typeof account.client_email === 'string' ? account.client_email : '';
  const privateKey = typeof account.private_key === 'string' ? account.private_key : '';
  if (!projectId || !clientEmail || !privateKey) return null;
  return {
    ...account,
    project_id: projectId,
    client_email: clientEmail,
    // A double-escaped key (`\\n` in the env value) parses to a literal `\n`.
    private_key: privateKey.replace(/\\n/g, '\n'),
  };
}

/**
 * Parse `FIREBASE_SERVICE_ACCOUNT` in any of the formats an operator is likely
 * to paste: compact JSON with escaped newlines, pretty-printed JSON with real
 * newlines, a quoted JSON string, or base64-encoded JSON.
 */
export function parseServiceAccount(raw: string | null | undefined): ServiceAccountCredentials | null {
  if (!raw || !raw.trim()) return null;
  for (const text of candidates(raw)) {
    for (const variant of [text, escapeControlCharsInStrings(text)]) {
      try {
        const parsed = normalize(JSON.parse(variant));
        if (parsed) return parsed;
      } catch {
        // try the next variant
      }
    }
  }
  return null;
}
