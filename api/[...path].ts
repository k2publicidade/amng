import type { Request, Response } from 'express';
import { createApplication, type AppRuntime } from '../server/app.ts';
import { readConfig } from '../server/config.ts';

let runtimePromise: Promise<AppRuntime> | undefined;

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
    const runtime = await getRuntime();
    runtime.app(request, response);
  } catch (error) {
    console.error(JSON.stringify({ event: 'serverless_init_failed', errorType: error instanceof Error ? error.name : 'unknown' }));
    if (!response.headersSent) response.status(503).json({ error: 'Serviço temporariamente indisponível.', code: 'SERVICE_UNAVAILABLE' });
  }
}
