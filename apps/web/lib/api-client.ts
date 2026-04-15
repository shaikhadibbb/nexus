// API client — wraps fetch with auth, error handling, and type safety
const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function firstDetail(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  for (const value of Object.values(details as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      return value[0];
    }
  }
  return null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  let json: any = null;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
    json = await res.json().catch(() => null);
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error: unable to reach the API');
  }

  if (!res.ok) {
    const details = json?.error?.details as Record<string, string[]> | undefined;
    const validationMsg = firstDetail(details);
    const devDetail = typeof json?.error?.detail === 'string' ? (json.error.detail as string) : null;
    const baseMessage = typeof json?.error?.message === 'string' ? (json.error.message as string) : null;
    const message =
      validationMsg ??
      (baseMessage === 'An unexpected error occurred' && devDetail ? devDetail : null) ??
      baseMessage ??
      `HTTP ${res.status}`;
    const code = json?.error?.code ?? 'UNKNOWN_ERROR';
    throw new ApiError(res.status, code, message, details);
  }

  return json?.data ?? json;
}

export function createApiClient(token?: string) {
  return {
    // Auth
    auth: {
      login: (email: string, password: string) =>
        request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), token }),
      register: (data: { email: string; username: string; displayName: string; password: string }) =>
        request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
      refresh: (refreshToken: string) =>
        request('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
      logout: () => request('/api/auth/logout', { method: 'POST', token }),
      me: () => request('/api/auth/me', { token }),
    },
    // Feed
    feed: {
      get: (params: Record<string, string | number | boolean | undefined>) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString();
        return request(`/api/feed?${qs}`, { token });
      },
      trending: (window: string = 'day') =>
        request(`/api/feed/trending/hashtags?window=${window}`, { token }),
    },
    // Posts
    posts: {
      get: (postId: string) => request(`/api/posts/${postId}`, { token }),
      thread: (postId: string) => request(`/api/posts/${postId}/thread`, { token }),
      create: (data: Record<string, unknown>) =>
        request('/api/posts', { method: 'POST', body: JSON.stringify(data), token }),
      update: (postId: string, data: Record<string, unknown>) =>
        request(`/api/posts/${postId}`, { method: 'PATCH', body: JSON.stringify(data), token }),
      delete: (postId: string) =>
        request(`/api/posts/${postId}`, { method: 'DELETE', token }),
      like: (postId: string) =>
        request(`/api/posts/${postId}/like`, { method: 'POST', token }),
      unlike: (postId: string) =>
        request(`/api/posts/${postId}/like`, { method: 'DELETE', token }),
      bookmark: (postId: string) =>
        request(`/api/posts/${postId}/bookmark`, { method: 'POST', token }),
      unbookmark: (postId: string) =>
        request(`/api/posts/${postId}/bookmark`, { method: 'DELETE', token }),
    },
    // Users
    users: {
      get: (username: string) => request(`/api/users/${username}`, { token }),
      search: (query: string, limit = 10) =>
        request(`/api/users/search?query=${encodeURIComponent(query)}&limit=${limit}`, { token }),
      update: (data: Record<string, unknown>) =>
        request('/api/users/me', { method: 'PATCH', body: JSON.stringify(data), token }),
      followers: (username: string, cursor?: string) =>
        request(`/api/users/${username}/followers${cursor ? `?cursor=${cursor}` : ''}`, { token }),
      following: (username: string, cursor?: string) =>
        request(`/api/users/${username}/following${cursor ? `?cursor=${cursor}` : ''}`, { token }),
      follow: (username: string) =>
        request(`/api/users/${username}/follow`, { method: 'POST', token }),
      unfollow: (username: string) =>
        request(`/api/users/${username}/follow`, { method: 'DELETE', token }),
    },
    // Notifications
    notifications: {
      list: (cursor?: string, onlyUnread = false) =>
        request(`/api/notifications?${onlyUnread ? 'onlyUnread=true' : ''}${cursor ? `&cursor=${cursor}` : ''}`, { token }),
      markRead: (id: string) =>
        request(`/api/notifications/${id}/read`, { method: 'POST', token }),
      markAllRead: () =>
        request('/api/notifications/read-all', { method: 'POST', token }),
    },
    // Conversations
    conversations: {
      list: () => request('/api/conversations', { token }),
      create: (data: Record<string, unknown>) =>
        request('/api/conversations', { method: 'POST', body: JSON.stringify(data), token }),
      messages: (id: string, cursor?: string) =>
        request(`/api/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ''}`, { token }),
      send: (id: string, data: Record<string, unknown>) =>
        request(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify(data), token }),
    },
  };
}

export { ApiError };
export type ApiClient = ReturnType<typeof createApiClient>;
