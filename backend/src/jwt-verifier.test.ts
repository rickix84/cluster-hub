import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyJwt } from '../src/jwt-verifier.js';

const SECRET = 'test-secret';
const TOKEN = jwt.sign({ sub: 'user1' }, SECRET, { algorithm: 'HS256' });
const EXPIRED_TOKEN = jwt.sign(
  { sub: 'user1', exp: Math.floor(Date.now() / 1000) - 1 },
  SECRET,
  { algorithm: 'HS256' },
);

describe('JwtVerifier', () => {
  beforeEach(() => {
    process.env.CLUSTER_HUB_JWT_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.CLUSTER_HUB_JWT_SECRET;
  });

  describe('missing', () => {
    it('should return missing when authorization is undefined', () => {
      const result = verifyJwt(undefined);
      expect(result.ok).toBe(false);
      expect(result.type).toBe('missing');
    });

    it('should return missing when authorization is null', () => {
      const result = verifyJwt(null);
      expect(result.ok).toBe(false);
      expect(result.type).toBe('missing');
    });

    it('should return missing when authorization is empty string', () => {
      const result = verifyJwt('');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('missing');
    });

    it('should return missing when authorization is whitespace', () => {
      const result = verifyJwt('   ');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('missing');
    });
  });

  describe('malformed', () => {
    it('should return malformed for non-Bearer auth', () => {
      const result = verifyJwt('Basic abc123');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });

    it('should return malformed for Bearer with no token', () => {
      const result = verifyJwt('Bearer ');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });

    it('should return malformed for Bearer with whitespace-only token', () => {
      const result = verifyJwt('Bearer   ');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });

    it('should return malformed for token with wrong dot structure', () => {
      const result = verifyJwt('Bearer not-a-token');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });

    it('should return malformed for token with only 2 dot-parts', () => {
      const result = verifyJwt('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });

    it('should return malformed for token with 4 dot-parts', () => {
      const result = verifyJwt('Bearer a.b.c.d');
      expect(result.ok).toBe(false);
      expect(result.type).toBe('malformed');
    });
  });

  describe('invalid', () => {
    it('should return invalid when secret is missing (fail-closed)', () => {
      delete process.env.CLUSTER_HUB_JWT_SECRET;
      const result = verifyJwt(`Bearer ${TOKEN}`);
      expect(result.ok).toBe(false);
      expect(result.type).toBe('invalid');
    });

    it('should return invalid for wrong signature', () => {
      const wrongToken = jwt.sign({ sub: 'user1' }, 'wrong-secret', { algorithm: 'HS256' });
      const result = verifyJwt(`Bearer ${wrongToken}`);
      expect(result.ok).toBe(false);
      expect(result.type).toBe('invalid');
    });

    it('should not leak secret in error result', () => {
      const wrongToken = jwt.sign({ sub: 'user1' }, 'wrong-secret', { algorithm: 'HS256' });
      const result = verifyJwt(`Bearer ${wrongToken}`);
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(SECRET);
    });

    it('should not leak token in error result', () => {
      const wrongToken = jwt.sign({ sub: 'user1' }, 'wrong-secret', { algorithm: 'HS256' });
      const result = verifyJwt(`Bearer ${wrongToken}`);
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(wrongToken);
    });
  });

  describe('expired', () => {
    it('should return expired for expired token', () => {
      const result = verifyJwt(`Bearer ${EXPIRED_TOKEN}`);
      expect(result.ok).toBe(false);
      expect(result.type).toBe('expired');
    });

    it('should not leak secret in expired error result', () => {
      const result = verifyJwt(`Bearer ${EXPIRED_TOKEN}`);
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(SECRET);
    });
  });

  describe('valid', () => {
    it('should return valid for correct token', () => {
      const result = verifyJwt(`Bearer ${TOKEN}`);
      if (!result.ok) throw new Error('Expected valid result');
      expect(result.type).toBe('valid');
      expect(result.payload.sub).toBe('user1');
    });

    it('should not leak token in valid result', () => {
      const result = verifyJwt(`Bearer ${TOKEN}`);
      if (!result.ok) throw new Error('Expected valid result');
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(TOKEN);
    });

    it('should not leak secret in valid result', () => {
      const result = verifyJwt(`Bearer ${TOKEN}`);
      if (!result.ok) throw new Error('Expected valid result');
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(SECRET);
    });

    it('should strip Bearer prefix and whitespace', () => {
      const result = verifyJwt('  Bearer  ' + TOKEN + '  ');
      if (!result.ok) throw new Error('Expected valid result');
      expect(result.type).toBe('valid');
    });
  });
});
