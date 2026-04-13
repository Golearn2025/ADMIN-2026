/**
 * API Client - Enterprise version
 * NO localStorage dependency
 * Organization context is controlled by backend
 */

export interface ApiFetchOptions extends RequestInit {
  // No organization header options - backend controls context
  headers?: Record<string, string>;
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Spread additional headers if they exist
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper for GET requests
 */
export function apiGet(url: string, options: ApiFetchOptions = {}) {
  return apiFetch(url, { ...options, method: "GET" });
}

/**
 * Helper for POST requests
 */
export function apiPost(url: string, body?: any, options: ApiFetchOptions = {}) {
  return apiFetch(url, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for PUT requests
 */
export function apiPut(url: string, body?: any, options: ApiFetchOptions = {}) {
  return apiFetch(url, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete(url: string, options: ApiFetchOptions = {}) {
  return apiFetch(url, { ...options, method: "DELETE" });
}
