const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super('API Error');
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const sessionId =
    localStorage.getItem('session_id') ||
    crypto.randomUUID();

  localStorage.setItem('session_id', sessionId);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.headers) {
    Object.assign(
      headers,
      options.headers as Record<string, string>
    );
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));

    console.error('API request failed:', {
      endpoint,
      status: res.status,
      data,
    });

    throw new ApiError(res.status, data);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  auth: {
    register: (
      data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
      }
    ) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (
      data: {
        email: string;
        password: string;
      }
    ) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request('/auth/me'),

    logout: () => {
      localStorage.removeItem('auth_token');
    },
  },

  products: {
    list: (params?: {
      category?: string;
      search?: string;
      sort?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            q.set(key, String(value));
          }
        });
      }

      return request(`/products?${q.toString()}`);
    },

    get: (id: string) =>
      request(`/products/${id}`),

    variants: (id: string) =>
      request(`/products/${id}/variants`),
  },

  cart: {
    get: () =>
      request('/cart'),

    add: (
      data: {
        productId: string;
        variantId?: number;
        quantity: number;
      }
    ) =>
      request('/cart', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      itemId: string,
      quantity: number
    ) =>
      request(`/cart/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity,
        }),
      }),

    remove: (itemId: string) =>
      request(`/cart/${itemId}`, {
        method: 'DELETE',
      }),

    clear: () =>
      request('/cart', {
        method: 'DELETE',
      }),
  },

  orders: {
    create: (data: {
      email: string;
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      postalCode: string;
      country?: string;
      paymentMethodId?: string;
    }) =>
      request('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: () =>
      request('/orders'),

    get: (id: string) =>
      request(`/orders/${id}`),
  },

  subscribers: {
    subscribe: (email: string) =>
      request('/subscribers', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      }),
  },
};

export { ApiError };
