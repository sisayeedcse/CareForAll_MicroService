const DEFAULT_BASE = "http://localhost:8080";
const baseFromEnv = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (baseFromEnv || DEFAULT_BASE).replace(/\/$/, "");

function buildUrl(path, params) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);
  if (params) {
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .forEach(([key, value]) => url.searchParams.append(key, value));
  }
  return url.toString();
}

export async function apiRequest(
  path,
  { method = "GET", headers = {}, body, token, params, signal } = {}
) {
  const finalHeaders = new Headers(headers);

  if (body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token && !finalHeaders.has("Authorization")) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload;
}

export { API_BASE_URL };
