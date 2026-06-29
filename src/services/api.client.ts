import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { StorageService } from './storage.service';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  errorMessage?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
  // Internal: prevents recursive refresh loop
  _retry?: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await StorageService.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
      }>;
      if (!res.ok || !json.success || !json.data) return null;

      await StorageService.set(STORAGE_KEYS.AUTH_TOKEN, json.data.accessToken);
      await StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, json.data.refreshToken);
      await StorageService.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, json.data.accessTokenExpiresAt);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export const ApiClient = {
  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true, _retry = false } = opts;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (auth) {
      const token = await StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && auth && !_retry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return this.request<T>(path, { ...opts, _retry: true });
      }
      throw new ApiError('Unauthorized', 401);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    let json: ApiResponse<T> | null = null;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      // Non-JSON body
    }

    if (!res.ok || (json && json.success === false)) {
      const msg = json?.errorMessage || json?.message || `HTTP ${res.status}`;
      throw new ApiError(msg, res.status);
    }

    return (json?.data ?? (undefined as unknown)) as T;
  },

  get<T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'POST', body });
  },
  put<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PUT', body });
  },
  delete<T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'DELETE' });
  },
};
