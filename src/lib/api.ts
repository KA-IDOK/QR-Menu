/**
 * API utility to handle base URL for different deployment environments.
 * Defaults to current origin if VITE_API_BASE_URL is not set.
 */
const BASE_URL = '';
console.log(`[API] Using relative paths`);

export const apiFetch = async (endpoint: string, options: RequestInit = {}, retries = 2) => {
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };
  const url = typeof window !== 'undefined' ? (window.location.origin + endpoint) : endpoint;
  console.log(`[API] Fetching: ${url}`);
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[API] Request failed: ${response.status}`, text);
      }

      return response;
    } catch (error) {
      if (i === retries) {
        console.error(`[API] Fetch error for ${url} after ${retries} retries:`, error);
        throw error;
      }
      console.warn(`[API] Retrying fetch for ${url} (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Fetch failed after retries');
};
