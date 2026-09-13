import { timingSafeEqual } from 'node:crypto';

export function isCleanupAuthorized(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
