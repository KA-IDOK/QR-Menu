/**
 * API utility to handle base URL for different deployment environments.
 * Defaults to current origin if VITE_API_BASE_URL is not set.
 */
const BASE_URL = '';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  console.log(`[API] Fetching: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    console.log(`[API] Response from ${url}: status=${response.status}, contentType=${contentType}`);

    if (!response.ok) {
      const errorResponse = response.clone();
      const text = await errorResponse.text();
      console.error(`[API] Request failed: ${response.status}`, text);
    }

    return response;
  } catch (error) {
    console.error(`[API] Fetch error for ${url}:`, error);
    throw error;
  }
};
