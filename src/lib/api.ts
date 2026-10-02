let csrfToken = '';
export const setCsrfToken = (value: string) => { csrfToken = value; };
export class ApiError extends Error {
  constructor(message: string, public status: number, public code = '') { super(message); }
}

const getApiBase = () => {
  const envUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const url = `${base}/api${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: base ? 'include' : 'same-origin',
    signal: options.signal ?? AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, ...options.headers },
  }).catch((error: Error) => {
    if (options.signal?.aborted) throw error;
    const command = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method ?? 'GET');
    throw new ApiError(command
      ? 'Não foi possível confirmar a operação. Confira o estado atualizado antes de tentar novamente.'
      : 'Não foi possível atualizar os dados. Verifique sua conexão e tente novamente.', 0, 'CONNECTION_UNCERTAIN');
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('A rota da API retornou formato inválido (HTML). Verifique se o backend está configurado.', response.status, 'INVALID_RESPONSE');
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw new ApiError('Não foi possível processar a resposta do servidor.', response.status, 'PARSE_ERROR');
  }

  if (!response.ok) {
    throw new ApiError((data as { error?: string }).error || 'Não foi possível concluir esta ação.', response.status, (data as { code?: string }).code);
  }

  if (typeof (data as { csrfToken?: unknown }).csrfToken === 'string') {
    setCsrfToken((data as { csrfToken: string }).csrfToken);
  }

  return data as T;
}

export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
