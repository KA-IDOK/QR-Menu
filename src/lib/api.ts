/**
 * API utility to handle base URL for different deployment environments.
 * Defaults to current origin if VITE_API_BASE_URL is not set.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};
