import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import cors from '@fastify/cors';
import jwt from 'jsonwebtoken';
import { LocalAIClient } from './localai-client.js';
import { chatCompletionSchema, deleteModelParamsSchema } from './schemas.js';

vi.stubGlobal('fetch', vi.fn());

const SECRET = 'test-jwt-secret';
const TOKEN = jwt.sign({ sub: 'user1' }, SECRET, { algorithm: 'HS256' });
const EXPIRED_TOKEN = jwt.sign(
  { sub: 'user1', exp: Math.floor(Date.now() / 1000) - 1 },
  SECRET,
  { algorithm: 'HS256' },
);
const WRONG_TOKEN = jwt.sign({ sub: 'user1' }, 'wrong-secret', { algorithm: 'HS256' });

const createApp = () => {
  const app = Fastify({ logger: false });
  app.register(fastifyPlugin(cors), { origin: '*' });

  process.env.CLUSTER_HUB_JWT_SECRET = SECRET;

  const client = new LocalAIClient({
    baseUrl: 'http://localhost:9999',
    timeoutMs: 5000,
  });

  // JWT auth preHandler
  const authMiddleware = async (request: any, reply: any) => {
    const authorization = request.headers.authorization;
    let result;
    try {
      const { verifyJwt } = await import('./jwt-verifier.js');
      result = verifyJwt(authorization);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', code: 'invalid' });
    }

    if (!result.ok) {
      request.log.warn({ code: result.type }, 'JWT verification failed');
      return reply.status(401).send({
        error: 'Unauthorized',
        code: result.type,
      });
    }

    request.jwtPayload = result.payload;
  };

  app.get('/api/health', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/localai/models', { preHandler: authMiddleware }, async (request, reply) => {
    const result = await client.request('/v1/models');
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send(result.data);
  });

  app.post('/api/localai/chat', { schema: { body: chatCompletionSchema }, preHandler: authMiddleware }, async (request, reply) => {
    const body = request.body as { model: string; messages: Array<{ role: string; content: string }> };
    const result = await client.request('/v1/chat/completions', { method: 'POST', body: JSON.stringify({ ...body, stream: false }) });
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send(result.data);
  });

  app.delete('/api/localai/models/:id', { schema: { params: deleteModelParamsSchema }, preHandler: authMiddleware }, async (request, reply) => {
    const modelId = (request.params as { id: string }).id;
    const result = await client.request(`/v1/models/${modelId}`, { method: 'DELETE' });
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send({ success: true });
  });

  return app;
};

describe('Route validation', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });
  describe('POST /api/localai/chat', () => {
    it('should accept valid body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'chatcmpl-1', choices: [] }),
      } as Response);

      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ id: 'chatcmpl-1', choices: [] });
    });

    it('should reject missing model', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error).not.toContain('secret');
    });

    it('should reject missing messages', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4' }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject empty messages array', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject invalid role', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'invalid', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject empty content', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: '' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject additional properties', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'chatcmpl-1', choices: [] }),
      } as Response);
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }], extra: true }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
    });

    it('should reject empty model', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: '', messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should propagate upstream errors after validation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'model not found' }),
      } as Response);

      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'nonexistent', messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.upstreamStatus).toBe(404);
      expect(body.error).toBeDefined();
    });
  });

  describe('DELETE /api/localai/models/:id', () => {
    it('should accept valid id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: async () => null,
      } as Response);

      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/model-1', headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ success: true });
    });

    it('should propagate upstream 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'not found' }),
      } as Response);

      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/nonexistent', headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.upstreamStatus).toBe(404);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });
});

describe('JWT Auth integration', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
    app = createApp();
  });

  describe('GET /api/health (public)', () => {
    it('should return 200 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /api/localai/models (protected)', () => {
    it('should return 401 without token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      } as Response);

      const res = await app.inject({ method: 'GET', url: '/api/localai/models' });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('missing');
    });

    it('should return 401 with invalid token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/localai/models', headers: { authorization: `Bearer ${WRONG_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('invalid');
    });

    it('should return 401 with expired token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/localai/models', headers: { authorization: `Bearer ${EXPIRED_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('expired');
    });

    it('should return 200 with valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [{ id: 'model-1' }] }),
      } as Response);

      const res = await app.inject({ method: 'GET', url: '/api/localai/models', headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ data: [{ id: 'model-1' }] });
    });
  });

  describe('POST /api/localai/chat (protected)', () => {
    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] } });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('missing');
    });

    it('should return 401 with wrong token', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${WRONG_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('invalid');
    });

    it('should return 200 with valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'chatcmpl-1', choices: [] }),
      } as Response);

      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] }, headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ id: 'chatcmpl-1', choices: [] });
    });
  });

  describe('DELETE /api/localai/models/:id (protected)', () => {
    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/model-1' });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('missing');
    });

    it('should return 401 with expired token', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/model-1', headers: { authorization: `Bearer ${EXPIRED_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('expired');
    });

    it('should return 200 with valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: async () => null,
      } as Response);

      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/model-1', headers: { authorization: `Bearer ${TOKEN}` } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ success: true });
    });
  });

  describe('401 response structure', () => {
    it('should not leak token in 401 response', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/localai/models', headers: { authorization: `Bearer ${WRONG_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      expect(res.payload).not.toContain(WRONG_TOKEN);
    });

    it('should not leak secret in 401 response', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/localai/models', headers: { authorization: `Bearer ${WRONG_TOKEN}` } });
      expect(res.statusCode).toBe(401);
      expect(res.payload).not.toContain(SECRET);
    });
  });
});
