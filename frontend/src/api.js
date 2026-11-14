
const USER_API = "/api/user";
const ORDER_API = "http://localhost:8081";
const ASSISTANT_API = "/api/assistant/chat";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : { message: await response.text().catch(() => "") };

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed: ${response.status}`
    );
  }

  return data;
}

// User Service
export function registerUser(userData) {
  return request(`${USER_API}/register`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function loginUser(credentials) {
  return request(`${USER_API}/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// Order Service
export function createOrder(orderData, token) {
  return request(`${ORDER_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
}

export function getOrders(token) {
  return request(`${ORDER_API}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getOrderById(id, token) {
  return request(`${ORDER_API}/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateOrder(id, orderData, token) {
  return request(`${ORDER_API}/orders/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
}

export function deleteOrder(id, token) {
  return request(`${ORDER_API}/orders/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function chatWithAssistant(payload) {
  return request(ASSISTANT_API, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function transcribeAssistantAudio(payload) {
  return request("/api/assistant/transcribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
