export const API_BASE_URL = "http://localhost:3001";

export async function backendPost(path: string, body: any, method: string = 'POST') {
  const url = `${API_BASE_URL}${path}`;
  console.log('API CALL:', method, url, body);

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { response: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || `${response.status} ${response.statusText}`;
    console.error("Backend error", url, response.status, message, data);
    throw new Error(message);
  }

  return data;
}
