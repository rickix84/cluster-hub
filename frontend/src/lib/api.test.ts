import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, fetchModels, sendChat, deleteModel, checkHealth } from './api';
import { useAuthStore } from './auth';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  mockFetch.mockReset();
  process.env = { ...originalEnv, NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001' };
  useAuthStore.getState().clearToken();
});

describe('api client', () => {
  describe('apiFetch', () => {
    it('attaches Authorization Bearer when token is set', async () => {
      useAuthStore.getState().setToken('my-jwt-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await apiFetch('/api/localai/models');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/localai/models',
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );
      // Verify the Headers object has the Authorization header
      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer my-jwt-token');
    });

    it('does not attach Authorization when token is null', async () => {
      useAuthStore.getState().clearToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await apiFetch('/api/localai/models');

      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('returns error on 401 and clears token', async () => {
      useAuthStore.getState().setToken('bad-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await apiFetch('/api/localai/models');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain('Unauthorized');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('returns error on non-200 non-401', async () => {
      useAuthStore.getState().clearToken();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      const result = await apiFetch('/api/localai/models');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain('Server error');
    });
  });

  describe('fetchModels', () => {
    it('returns models array on success', async () => {
      useAuthStore.getState().clearToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'model-1' }] }),
      });

      const models = await fetchModels();
      expect(models).toEqual([{ id: 'model-1' }]);
    });

    it('throws on 401', async () => {
      useAuthStore.getState().setToken('bad');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(fetchModels()).rejects.toThrow('Unauthorized');
    });
  });

  describe('sendChat', () => {
    it('sends chat payload and returns content', async () => {
      useAuthStore.getState().setToken('my-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'Hello!' } }] }),
      });

      const reply = await sendChat('gpt-4', [{ role: 'user', content: 'Hi' }]);
      expect(reply).toBe('Hello!');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/localai/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        }),
      );
      const chatHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(chatHeaders.get('Authorization')).toBe('Bearer my-token');
    });

    it('throws on empty response', async () => {
      useAuthStore.getState().clearToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      });

      await expect(sendChat('gpt-4', [])).rejects.toThrow('Empty response');
    });
  });

  describe('deleteModel', () => {
    it('sends DELETE with auth', async () => {
      useAuthStore.getState().setToken('my-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await deleteModel('model-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/localai/models/model-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('checkHealth', () => {
    it('calls public endpoint without auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' }),
      });

      const health = await checkHealth();
      expect(health.status).toBe('ok');
      // checkHealth calls fetch with no options (no headers)
      expect(mockFetch).toHaveBeenCalledWith('/api/health');
    });
  });
});
