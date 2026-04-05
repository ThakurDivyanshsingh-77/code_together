const LOCAL_BACKEND = "http://localhost:5000/api";
const DEPLOYED_BACKEND = "https://code-together-km28.onrender.com/api";

// Auto-switch: uses local backend running `npm run dev`, otherwise deployed backend. Override with .env
const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? LOCAL_BACKEND : DEPLOYED_BACKEND);

const TOKEN_STORAGE_KEY = "codecollab_auth_token";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export const authTokenStore = {
  get: () => sessionStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_STORAGE_KEY),
};

export const apiRequest = async <T>(
  path: string,
  { method = "GET", body, token, signal }: ApiRequestOptions = {}
): Promise<T> => {
  const resolvedToken = token ?? authTokenStore.get();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

export const apiBaseUrl = API_BASE_URL;
