// src/api.js

// Base URL for the backend API.
// In Vite, env vars must start with VITE_ to be exposed to the client.
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:8080";

/**
 * Build a query string from an object, skipping null/undefined/empty.
 * Example: { name: "chicken", limit: 5 } -> "?name=chicken&limit=5"
 */
function buildQuery(params = {}) {
  const esc = encodeURIComponent;

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${esc(k)}=${esc(v)}`)
    .join("&");

  return query ? `?${query}` : "";
}

/**
 * Generic GET helper for JSON APIs.
 * Usage:
 *   apiGet("/api/recipes/leaderboard");
 *   apiGet("/api/recipes/search", { name: "chicken", limit: 5 });
 */
export async function apiGet(path, params) {
  const url = `${API_BASE}${path}${buildQuery(params)}`;

  const res = await fetch(url);

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data && (data.error || data.detail)) {
        detail = data.error || data.detail;
      }
    } catch {
      // ignore JSON parse error, keep statusText
    }
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Optional: if you later need POST, you can add this:
 *
 * export async function apiPost(path, body) {
 *   const url = `${API_BASE}${path}`;
 *   const res = await fetch(url, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(body ?? {}),
 *   });
 *
 *   if (!res.ok) {
 *     let detail = res.statusText;
 *     try {
 *       const data = await res.json();
 *       if (data && (data.error || data.detail)) {
 *         detail = data.error || data.detail;
 *       }
 *     } catch {}
 *     throw new Error(`Request failed (${res.status}): ${detail}`);
 *   }
 *
 *   return res.json();
 * }
 */
