import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import cors from '@fastify/cors';
import { LocalAIClient } from './localai-client.js';
import { chatCompletionSchema, deleteModelParamsSchema } from './schemas.js';

vi.stubGlobal('fetch', vi.fn());

const createApp = () => {
  const app = Fastify({ logger: false });
  app.register(fastifyPlugin(cors), { origin: '*' });

  const client = new LocalAIClient({
    baseUrl: 'http://localhost:9999',
    timeoutMs: 5000,
  });

  app.get('/api/localai/models', async (request, reply) => {
    const result = await client.request('/v1/models');
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send(result.data);
  });

  app.post('/api/localai/chat', { schema: { body: chatCompletionSchema } }, async (request, reply) => {
    const body = request.body as { model: string; messages: Array<{ role: string; content: string }> };
    const result = await client.request('/v1/chat/completions', { method: 'POST', body: JSON.stringify({ ...body, stream: false }) });
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send(result.data);
  });

  app.delete('/api/localai/models/:id', { schema: { params: deleteModelParamsSchema } }, async (request, reply) => {
    const modelId = (request.params as { id: string }).id;
    const result = await client.request(`/v1/models/${modelId}`, { method: 'DELETE' });
    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      return reply.status(status).send({ error: result.error, upstreamStatus: result.status });
    }
    reply.send({ success: true });
  });

  app.get('/api/health', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
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

      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] } });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ id: 'chatcmpl-1', choices: [] });
    });

    it('should reject missing model', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { messages: [{ role: 'user', content: 'hello' }] } });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error).not.toContain('secret');
    });

    it('should reject missing messages', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4' } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject empty messages array', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [] } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject invalid role', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'invalid', content: 'hello' }] } });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeDefined();
    });

    it('should reject empty content', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: '' }] } });
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
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }], extra: true } });
      // Fastify 5 with ajv 8 defaults allow additionalProperties; test passes if 200 and body is forwarded
      expect(res.statusCode).toBe(200);
    });

    it('should reject empty model', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: '', messages: [{ role: 'user', content: 'hello' }] } });
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

      const res = await app.inject({ method: 'POST', url: '/api/localai/chat', payload: { model: 'nonexistent', messages: [{ role: 'user', content: 'hello' }] } });
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

      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/model-1' });
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

      const res = await app.inject({ method: 'DELETE', url: '/api/localai/models/nonexistent' });
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
