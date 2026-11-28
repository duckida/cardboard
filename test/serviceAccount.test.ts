import { describe, expect, it } from 'vitest';
import { parseServiceAccount } from '../api/_lib/serviceAccount';

const key = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----\n';

const account = {
  type: 'service_account',
  project_id: 'cardboard-4095c',
  private_key_id: 'abc123',
  private_key: key,
  client_email: 'firebase-adminsdk@cardboard-4095c.iam.gserviceaccount.com',
  client_id: '1234567890',
};

describe('parseServiceAccount', () => {
  it('reads the compact one-line form the README recommends', () => {
    // JSON.stringify leaves `\n` escapes inside private_key, which is exactly
    // what a host stores for a single-line env value.
    const parsed = parseServiceAccount(JSON.stringify(account));
    expect(parsed?.project_id).toBe('cardboard-4095c');
    expect(parsed?.client_email).toBe(account.client_email);
    expect(parsed?.private_key).toBe(key);
  });

  it('reads a pretty-printed file pasted with real newlines', () => {
    const pretty = `{
  "type": "service_account",
  "project_id": "cardboard-4095c",
  "private_key": "-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC
-----END PRIVATE KEY-----
",
  "client_email": "firebase-adminsdk@cardboard-4095c.iam.gserviceaccount.com"
}`;
    const parsed = parseServiceAccount(pretty);
    expect(parsed?.project_id).toBe('cardboard-4095c');
    expect(parsed?.private_key).toBe(key);
  });

  it('reads base64-encoded JSON', () => {
    const encoded = Buffer.from(JSON.stringify(account), 'utf8').toString('base64');
    expect(parseServiceAccount(encoded)?.project_id).toBe('cardboard-4095c');
  });

  it('reads a value wrapped in quotes', () => {
    const quoted = JSON.stringify(JSON.stringify(account));
    expect(parseServiceAccount(quoted)?.project_id).toBe('cardboard-4095c');
  });

  it('unescapes a double-escaped private key', () => {
    const doubleEscaped = JSON.stringify({ ...account, private_key: key.replace(/\n/g, '\\n') });
    expect(parseServiceAccount(doubleEscaped)?.private_key).toBe(key);
  });

  it('rejects empty or incomplete values', () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount('   ')).toBeNull();
    expect(parseServiceAccount('not json')).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ project_id: 'p' }))).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ ...account, private_key: '' }))).toBeNull();
  });
});
