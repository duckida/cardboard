import type { VercelRequest, VercelResponse } from '@vercel/node';

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendError(res: VercelResponse, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return res.status(500).json({ error: message, code: 'internal_error' });
}

export function methodNotAllowed(res: VercelResponse, allow: string[]) {
  res.setHeader('Allow', allow.join(', '));
  return res.status(405).json({ error: 'Method not allowed.', code: 'method_not_allowed' });
}

export function boardIdFrom(req: VercelRequest): string {
  const raw = req.query.board ?? (req.body as { board?: string } | undefined)?.board ?? process.env.BOARD_ID ?? 'main';
  const value = Array.isArray(raw) ? raw[0] : raw;
  const boardId = String(value || 'main');
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(boardId)) {
    throw new HttpError(400, 'That board id is not valid.', 'invalid_board');
  }
  return boardId;
}

export function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}
