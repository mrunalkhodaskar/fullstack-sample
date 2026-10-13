const API_URL = 'http://localhost:8080/api/orders';
const PRODUCTS_URL = 'http://localhost:8080/api/products';
const AUTH_URL = 'http://localhost:8080/api/auth';

const accessTokenKey = Symbol.for('orderly.accessToken');

export function setAccessToken(token) {
  globalThis[accessTokenKey] = token;
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers);
  const accessToken = globalThis[accessTokenKey];
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed (${response.status})`);
    }
    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the backend. Start the Spring Boot server and confirm http://localhost:8080 is reachable.');
    }
    throw error;
  }
}

export function login(credentials) {
  return request(`${AUTH_URL}/login`, {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export function register(details) {
  return request(`${AUTH_URL}/register`, {
    method: 'POST',
    body: JSON.stringify(details)
  });
}

export function fetchOrders({ page = 0, size = 10, sort = 'newest', status = '', search = '' } = {}) {
  const params = new URLSearchParams({ page, size, sort });
  if (status && status !== 'ALL') params.set('status', status);
  if (search.trim()) params.set('search', search.trim());
  return request(`${API_URL}?${params}`);
}

export function fetchOrderReport(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  return request(`${API_URL}/report?${params}`);
}

export async function createOrder(order) {
  return request(API_URL, {
    method: 'POST',
    body: JSON.stringify(order)
  });
}

export function updateOrder(id, order) {
  return request(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(order)
  });
}

export function updateOrderStatus(id, status) {
  return request(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function deleteOrder(id) {
  return request(`${API_URL}/${id}`, { method: 'DELETE' });
}

export function bulkUpdateOrderStatus(ids, status) {
  return request(`${API_URL}/bulk/status`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, status })
  });
}

export function bulkDeleteOrders(ids) {
  return request(`${API_URL}/bulk`, {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  });
}

export function fetchProducts(search = '') {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();
  return request(`${PRODUCTS_URL}${query ? `?${query}` : ''}`);
}

export function createProduct(product) {
  return request(PRODUCTS_URL, {
    method: 'POST',
    body: JSON.stringify(product)
  });
}

export function updateProduct(id, product) {
  return request(`${PRODUCTS_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  });
}

export function updateProductStock(id, stockQuantity) {
  return request(`${PRODUCTS_URL}/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stockQuantity })
  });
}

export function deleteProduct(id) {
  return request(`${PRODUCTS_URL}/${id}`, { method: 'DELETE' });
}