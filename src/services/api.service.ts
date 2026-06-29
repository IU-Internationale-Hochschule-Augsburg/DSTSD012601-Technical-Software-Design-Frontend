import { StorageService } from './storage.service';
import { API_BASE_URL, API_TIMEOUT_MS, STORAGE_KEYS } from '../utils/constants';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Query-Parameter, werden URL-encodiert angehängt. */
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }
  return url.toString();
}

/**
 * Schlanker fetch-Wrapper für den Backend-Server.
 * Hängt automatisch den Auth-Token an und parst JSON.
 */
export const ApiService = {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, signal } = options;

    const token = await StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);

    // Timeout via AbortController, kombiniert mit einem ggf. übergebenen Signal.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    if (signal) signal.addEventListener('abort', () => controller.abort());

    try {
      const response = await fetch(buildUrl(path, query), {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new ApiError(
          `Request ${method} ${path} failed with ${response.status}`,
          response.status,
          data
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  },

  get<T>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'GET', query });
  },
  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body });
  },
  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PUT', body });
  },
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body });
  },
  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  },
};
