import Fastify from 'fastify';
import cors from '@fastify/cors';

const LOCALAI_BASE_URL = process.env.LOCALAI_BASE_URL || 'https://localai.tail6518ad.ts.net';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = Fastify({ logger: true });

app.register(cors, { origin: CORS_ORIGIN });

// Proxy endpoint: GET /api/localai/models
app.get('/api/localai/models', async (request, reply) => {
  const response = await fetch(`${LOCALAI_BASE_URL}/v1/models`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  reply.send(data);
});

// Proxy endpoint: POST /api/localai/chat
app.post('/api/localai/chat', async (request, reply) => {
  const body = request.body as { model: string; messages: Array<{ role: string; content: string }> };

  const response = await fetch(`${LOCALAI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      stream: false,
    }),
  });

  const data = await response.json();
  reply.send(data);
});

// Proxy endpoint: DELETE /api/localai/models/:id
app.delete('/api/localai/models/:id', async (request, reply) => {
  const modelId = (request.params as { id: string }).id;

  const response = await fetch(`${LOCALAI_BASE_URL}/v1/models/${modelId}`, {
    method: 'DELETE',
  });

  if (response.ok) {
    reply.send({ success: true });
  } else {
    const error = await response.json();
    reply.status(400).send(error);
  }
});

// Health check
app.get('/api/health', async (request, reply) => {
  reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log(`Cluster Hub Backend listening on port 3001`);
    console.log(`LocalAI proxy: ${LOCALAI_BASE_URL}`);
    console.log(`CORS origin: ${CORS_ORIGIN}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
