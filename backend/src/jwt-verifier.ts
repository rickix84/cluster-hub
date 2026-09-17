import jwt from 'jsonwebtoken';

export type JwtResult =
  | { ok: true; type: 'valid'; payload: jwt.JwtPayload }
  | { ok: false; type: 'missing' }
  | { ok: false; type: 'malformed' }
  | { ok: false; type: 'invalid' }
  | { ok: false; type: 'expired' };

export function verifyJwt(authorization: string | undefined | null): JwtResult {
  if (!authorization || authorization.trim() === '') {
    return { ok: false, type: 'missing' };
  }

  const trimmed = authorization.trim();
  if (!trimmed.startsWith('Bearer ')) {
    return { ok: false, type: 'malformed' };
  }

  const token = trimmed.slice(7).trim();
  if (!token) {
    return { ok: false, type: 'malformed' };
  }

  const dotParts = token.split('.');
  if (dotParts.length !== 3 || dotParts.some((part) => part.length === 0)) {
    return { ok: false, type: 'malformed' };
  }

  const secret = process.env.CLUSTER_HUB_JWT_SECRET;
  if (!secret) {
    return { ok: false, type: 'invalid' };
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    return { ok: true, type: 'valid', payload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { ok: false, type: 'expired' };
    }
    if (err instanceof jwt.JsonWebTokenError) {
      const msg = err.message.toLowerCase();
      if (msg.includes('malformed')) {
        return { ok: false, type: 'malformed' };
      }
      return { ok: false, type: 'invalid' };
    }
    if (err instanceof jwt.NotBeforeError) {
      return { ok: false, type: 'invalid' };
    }
    return { ok: false, type: 'invalid' };
  }
}
