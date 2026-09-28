let csrfToken = '';
export const setCsrfToken = (value: string) => { csrfToken = value; };
export class ApiError extends Error {
  constructor(message: string, public status: number, public code = '') { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'Não foi possível concluir esta ação.', response.status, data.code);
  if (typeof data.csrfToken === 'string') setCsrfToken(data.csrfToken);
  return data as T;
}
export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
