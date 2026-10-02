import type { Request, Response } from 'express';
import { createApplication, type AppRuntime } from '../server/app.ts';
import { readConfig } from '../server/config.ts';

let runtimePromise: Promise<AppRuntime> | undefined;

function safeInitializationCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('SESSION_SECRET')) return 'SESSION_SECRET_INVALID';
  if (message.startsWith('Production requires PostgreSQL DATABASE_URL')) return 'DATABASE_URL_MISSING';
  if (message.startsWith('Production demo requires')) return 'DEMO_ENABLED_FORBIDDEN_IN_PRODUCTION';
  if (message.startsWith('Production APP_ORIGIN')) return 'APP_ORIGIN_MUST_USE_HTTPS';
  if (message.startsWith('Both ADMIN_EMAIL and strong ADMIN_PASSWORD')) return 'ADMIN_CREDENTIALS_INVALID';
  if (message === 'SQLite cannot be used in production') return 'PRODUCTION_REQUIRES_POSTGRES';

  const errorCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
  if (['28P01', '28000'].includes(errorCode)) return 'DATABASE_AUTH_FAILED';
  if (errorCode === '3D000') return 'DATABASE_NOT_FOUND';
  if (['42703', '42P01'].includes(errorCode)) return 'DATABASE_SCHEMA_MISMATCH';
  if (['08001', '08003', '08006', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(errorCode)) {
    return 'DATABASE_CONNECTION_FAILED';
  }
  return 'INITIALIZATION_FAILED';
}

function restoreApiPath(request: Request): boolean {
  const forwardedPath = request.query.__amng_path;
  const segments = typeof forwardedPath === 'string'
    ? forwardedPath.split('/')
    : Array.isArray(forwardedPath) && forwardedPath.every(segment => typeof segment === 'string')
      ? forwardedPath as string[]
      : undefined;

  const currentUrl = new URL(request.url || '/', 'https://amng.invalid');
  const path = segments?.join('/') ?? (
    currentUrl.pathname.startsWith('/api/') && !currentUrl.pathname.includes('[...path]')
      ? currentUrl.pathname.slice('/api/'.length)
      : ''
  );
  if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path)) return false;

  currentUrl.pathname = `/api/${path.split('/').map(encodeURIComponent).join('/')}`;
  currentUrl.searchParams.delete('__amng_path');
  request.url = `${currentUrl.pathname}${currentUrl.search}`;
  return true;
}

function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.resolve()
      .then(() => createApplication(readConfig(), { serverless: true }))
      .catch(error => {
        runtimePromise = undefined;
        throw error;
      });
  }
  return runtimePromise;
}

export default async function handler(request: Request, response: Response) {
  try {
    if (!restoreApiPath(request)) {
      response.status(404).json({ error: 'Endpoint não encontrado.', code: 'NOT_FOUND' });
      return;
    }
    const runtime = await getRuntime();
    runtime.app(request, response);
  } catch (error) {
    console.error(JSON.stringify({ event: 'serverless_init_failed', code: safeInitializationCode(error) }));
    if (!response.headersSent) response.status(503).json({ error: 'Serviço temporariamente indisponível.', code: 'SERVICE_UNAVAILABLE' });
  }
}
