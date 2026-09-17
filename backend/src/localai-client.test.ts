import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalAIClient } from '../src/localai-client.js';

vi.stubGlobal('fetch', vi.fn());

describe('LocalAIClient', () => {
  let client: LocalAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LocalAIClient({
      baseUrl: 'http://localhost:9999',
      timeoutMs: 5000,
    });
  });

  it('should return success response with data', async () => {
    const mockResponse = { data: [{ id: 'model-1' }] };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    } as Response);

    const result = await client.request('/v1/models');

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(mockResponse);
    expect(result.error).toBeNull();
  });

  it('should propagate upstream 4xx status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'model not found' }),
    } as Response);

    const result = await client.request('/v1/models/nonexistent');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ error: 'model not found' });
  });

  it('should propagate upstream 5xx status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'internal error' }),
    } as Response);

    const result = await client.request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4', messages: [] }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBeNull();
  });

  it('should handle invalid JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Internal Server Error',
    } as Response);

    const result = await client.request('/v1/models');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toContain('Invalid JSON');
  });

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network request failed'));

    const result = await client.request('/v1/models');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network request failed');
  });

  it('should apply timeout via AbortSignal', async () => {
    const timeoutClient = new LocalAIClient({
      baseUrl: 'http://localhost:9999',
      timeoutMs: 100,
    });

    vi.mocked(fetch).mockImplementationOnce((_url, options) => {
      const signal = (options as { signal?: AbortSignal })?.signal;
      return new Promise((resolve, reject) => {
        // Simulate timeout by rejecting when signal is aborted
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
        // Delay response beyond timeout
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ data: [] }),
          } as Response);
        }, 500);
      });
    });

    const result = await timeoutClient.request('/v1/models');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle 204 No Content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers(),
      json: async () => null,
    } as Response);

    const result = await client.request('/v1/models/some-id', {
      method: 'DELETE',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
    expect(result.data).toBeNull();
  });
});
