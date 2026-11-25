import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpError, methodNotAllowed, sendError } from './_lib/http.js';
import { requireRole } from './_lib/firebaseAdmin.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif']);

interface UploadBody {
  filename?: unknown;
  contentType?: unknown;
  data?: unknown;
  width?: unknown;
  height?: unknown;
}

interface CdnUpload {
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  error?: string;
  message?: string;
  code?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    await requireRole(req, ['admin', 'studentArt']);

    const key = process.env.HACKCLUB_CDN_KEY;
    if (!key) {
      throw new HttpError(501, 'Image uploads are not configured. Add HACKCLUB_CDN_KEY on the server.', 'cdn_not_configured');
    }

    const body = (req.body ?? {}) as UploadBody;
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    const filename = typeof body.filename === 'string' && body.filename ? body.filename : 'image.webp';
    const data = typeof body.data === 'string' ? body.data : '';

    if (!ALLOWED.has(contentType)) {
      throw new HttpError(415, 'That image type is not supported.', 'unsupported_type');
    }
    if (!data) throw new HttpError(400, 'No image data was sent.', 'missing_data');

    let bytes: Buffer;
    try {
      bytes = Buffer.from(data, 'base64');
    } catch {
      throw new HttpError(400, 'That image could not be decoded.', 'invalid_data');
    }
    if (!bytes.length) throw new HttpError(400, 'That image is empty.', 'invalid_data');
    if (bytes.length > MAX_BYTES) {
      throw new HttpError(413, 'That image is larger than 4 MB after compression.', 'too_large');
    }

    const form = new FormData();
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    form.append('file', new Blob([arrayBuffer], { type: contentType }), filename);

    const response = await fetch('https://cdn.hackclub.com/api/v4/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    const json = (await response.json().catch(() => ({}))) as CdnUpload;
    if (!response.ok || !json.url) {
      const message = json.message || json.error || `The CDN rejected that upload (${response.status}).`;
      throw new HttpError(response.status === 402 ? 402 : 502, message, json.code || 'cdn_error');
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      id: json.id ?? null,
      url: json.url,
      filename: json.filename ?? filename,
      size: json.size ?? bytes.length,
      contentType: json.content_type ?? contentType,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};
