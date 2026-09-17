export interface LocalAIOptions {
  baseUrl: string;
  timeoutMs?: number;
}

export interface LocalAIResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | null;
  error: string | null;
}

export class LocalAIClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: LocalAIOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  private buildSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeoutMs);
    return controller.signal;
  }

  async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<LocalAIResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const signal = this.buildSignal();

    try {
      const response = await fetch(url, {
        ...options,
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      let data: T | null = null;
      const contentType = response.headers.get('content-type') || '';

      if (response.status !== 204) {
        try {
          data = (await response.json()) as T;
        } catch {
          return {
            ok: false,
            status: response.status,
            statusText: response.statusText,
            data: null,
            error: `Invalid JSON response from upstream (${response.status})`,
          };
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        ok: false,
        status: 0,
        statusText: 'Network Error',
        data: null,
        error: message,
      };
    }
  }
}
