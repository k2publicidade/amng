import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as OTPAuth from 'otpauth';
import type { Executor, Row } from './database.ts';

const scrypt = promisify(scryptCallback);
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function constantEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [method, salt, hex] = stored.split(':');
  if (method !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function encryptSecret(plaintext: string, key: string) {
  const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(sha256(key), 'hex'), nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${nonce.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}
export function decryptSecret(ciphertext: string, key: string) {
  const [nonce, tag, encrypted] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(sha256(key), 'hex'), Buffer.from(nonce, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString('utf8');
}
export function newMfa(email: string) {
  const otp = new OTPAuth.TOTP({ issuer: 'AMERICAN MINING', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret: new OTPAuth.Secret({ size: 20 }) });
  return { secret: otp.secret.base32, uri: otp.toString() };
}
export async function verifyMfa(tx: Executor, user: Row, code: string | undefined, key: string, now = Date.now(), pending = false) {
  const encrypted = pending ? user.mfa_pending_secret : user.mfa_secret;
  if (typeof encrypted !== 'string' || !code || !/^\d{6}$/.test(code)) return false;
  const otp = new OTPAuth.TOTP({ issuer: 'AMERICAN MINING', secret: OTPAuth.Secret.fromBase32(decryptSecret(encrypted,key)), algorithm: 'SHA1', digits: 6, period: 30 });
  const delta = otp.validate({ token: code, timestamp: now, window: 1 });
  if (delta === null) return false;
  const step = Math.floor(now / 30000) + delta;
  if (!pending && typeof user.last_totp_step === 'number' && step <= user.last_totp_step) return false;
  await tx.run('UPDATE users SET last_totp_step = ? WHERE id = ?', [step, String(user.id)]);
  return true;
}
