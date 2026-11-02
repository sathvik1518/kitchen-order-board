export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** fetch only fails on a dead network. A 404 or 500 is a "successful" fetch, so res.ok is checked. */
export async function requestJSON(url, { method = "GET", signal } = {}) {
  let res;
  try {
    res = await fetch(url, { method, signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the server.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) throw new ApiError(typeof data?.detail === "string" ? data.detail : res.statusText || `HTTP ${res.status}`, res.status);
  return data;
}

export const fetchOrders = ({ signal } = {}) => requestJSON("/api/orders", { signal });
export const markReady = (id) => requestJSON(`/api/orders/${id}/ready`, { method: "POST" });
export const cancelOrder = (id) => requestJSON(`/api/orders/${id}/cancel`, { method: "POST" });
