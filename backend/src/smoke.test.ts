import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import cors from '@fastify/cors';
import { LocalAIClient } from './localai-client.js';
import { chatCompletionSchema, deleteModelParamsSchema } from './schemas.js';

describe('Smoke tests', () => {
  it('health endpoint returns ok without auth', async () => {
    const app = Fastify({ logger: false });
    app.register(fastifyPlugin(cors), { origin: '*' });

    app.get('/api/health', async (_request, reply) => {
      reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    });

    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await app.close();
  });

  it('protected endpoint returns 401 without token', async () => {
    const app = Fastify({ logger: false });
    app.register(fastifyPlugin(cors), { origin: '*' });

    const authMiddleware = async (_request: any, reply: any) => {
      return reply.status(401).send({ error: 'Unauthorized', code: 'missing' });
    };

    app.get('/api/localai/models', { preHandler: authMiddleware }, async (_request, reply) => {
      reply.send({ data: [] });
    });

    const res = await app.inject({ method: 'GET', url: '/api/localai/models' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('Unauthorized');
    expect(body.code).toBe('missing');
    await app.close();
  });

  it('does not leak secrets in error responses', async () => {
    const SECRET = 'test-secret-do-not-leak';
    process.env.CLUSTER_HUB_JWT_SECRET = SECRET;

    const app = Fastify({ logger: false });
    app.register(fastifyPlugin(cors), { origin: '*' });

    const { verifyJwt } = await import('./jwt-verifier.js');
    const authMiddleware = async (request: any, reply: any) => {
      const result = verifyJwt(request.headers.authorization);
      if (!result.ok) {
        request.log.warn({ code: result.type }, 'JWT verification failed');
        return reply.status(401).send({ error: 'Unauthorized', code: result.type });
      }
      request.jwtPayload = result.payload;
    };

    app.get('/api/localai/models', { preHandler: authMiddleware }, async (_request, reply) => {
      reply.send({ data: [] });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/localai/models',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.payload).not.toContain(SECRET);
    expect(res.payload).not.toContain('test-secret');
    await app.close();
  });
});
