import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  // Prefer explicit ENCRYPTION_KEY if provided and valid
  const explicit = process.env.ENCRYPTION_KEY;
  if (explicit && explicit.length === 64) {
    return Buffer.from(explicit, 'hex');
  }
  // Derive from SUPABASE_SERVICE_ROLE_KEY (always present, already a secret)
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error('No encryption secret available');
  return createHash('sha256').update('contractorseo-cms-v1:' + base).digest();
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(data: string): string {
  const [ivHex, cipherHex] = data.split(':');
  if (!ivHex || !cipherHex) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
