import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { LocalAIClient } from './localai-client.js';
import { verifyJwt } from './jwt-verifier.js';
import { chatCompletionSchema, deleteModelParamsSchema } from './schemas.js';

const LOCALAI_BASE_URL = process.env.LOCALAI_BASE_URL || 'https://localai.tail6518ad.ts.net';
const LOCALAI_API_KEY = process.env.LOCALAI_API_KEY;
const LOCALAI_TIMEOUT_MS = parseInt(process.env.LOCALAI_TIMEOUT_MS || '30000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = Fastify({ logger: true });

app.register(cors, { origin: CORS_ORIGIN });

const client = new LocalAIClient({
  baseUrl: LOCALAI_BASE_URL,
  apiKey: LOCALAI_API_KEY,
  timeoutMs: LOCALAI_TIMEOUT_MS,
});

// JWT auth preHandler
const authMiddleware = async (request: any, reply: any) => {
  const authorization = request.headers.authorization;
  const result = verifyJwt(authorization);

  if (!result.ok) {
    const status = 401;
    const body = {
      error: 'Unauthorized',
      code: result.type,
    };
    // Log only the error code, never the token or secret
    request.log.warn({ code: result.type }, 'JWT verification failed');
    return reply.status(status).send(body);
  }

  // Attach verified payload to request
  request.jwtPayload = result.payload;
};

// Health check - public
app.get('/api/health', async (request, reply) => {
  reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy endpoint: GET /api/localai/models - protected
app.get('/api/localai/models', { preHandler: authMiddleware }, async (request, reply) => {
  const result = await client.request('/v1/models');

  if (!result.ok) {
    const status = result.status > 0 ? result.status : 502;
    return reply.status(status).send({
      error: result.error,
      upstreamStatus: result.status,
    });
  }

  reply.send(result.data);
});

// Proxy endpoint: POST /api/localai/chat - protected
app.post('/api/localai/chat', { schema: { body: chatCompletionSchema }, preHandler: authMiddleware }, async (request, reply) => {
  const body = request.body as { model: string; messages: Array<{ role: string; content: string }> };

  const result = await client.request('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      stream: false,
    }),
  });

  if (!result.ok) {
    const status = result.status > 0 ? result.status : 502;
    return reply.status(status).send({
      error: result.error,
      upstreamStatus: result.status,
    });
  }

  reply.send(result.data);
});

// Proxy endpoint: DELETE /api/localai/models/:id - protected
app.delete('/api/localai/models/:id', { schema: { params: deleteModelParamsSchema }, preHandler: authMiddleware }, async (request, reply) => {
  const modelId = (request.params as { id: string }).id;

  const result = await client.request(`/v1/models/${modelId}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    const status = result.status > 0 ? result.status : 502;
    return reply.status(status).send({
      error: result.error,
      upstreamStatus: result.status,
    });
  }

  reply.send({ success: true });
});

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log(`Cluster Hub Backend listening on port 3001`);
    console.log(`LocalAI proxy: ${LOCALAI_BASE_URL}`);
    console.log(`LocalAI timeout: ${LOCALAI_TIMEOUT_MS}ms`);
    console.log(`CORS origin: ${CORS_ORIGIN}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
