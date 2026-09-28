import type { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Database, Row } from './database.ts';
import { reject } from './domain.ts';
import { spoolLedgerCsv, walletStatement } from './ledger-queries.ts';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.').refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Informe uma data existente.');
const filtersSchema = z.object({
  wallet: z.enum(['deposit', 'earnings', 'affiliate']).optional(),
  kind: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/, 'Tipo de lançamento inválido.').optional(),
  status: z.enum(['CONFIRMED', 'PENDING', 'RESERVED', 'REVERSED']).optional(),
  product: z.enum(['cloud', 'market', 'affiliate', 'career', 'wallet']).optional(),
  contractId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_.:-]+$/, 'Referência de contrato inválida.').optional(),
  coin: z.string().regex(/^[A-Z0-9]{1,20}$/, 'Moeda minerada inválida.').optional(),
  from: day.optional(), to: day.optional(),
  search: z.string().trim().min(1).max(120, 'Use até 120 caracteres na busca.').optional(),
}).strict();
const statementSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).max(10_000_000).default(1),
  pageSize: z.coerce.number().int().refine(value => [12, 20, 50, 100].includes(value), 'Selecione 12, 20, 50 ou 100 registros por página.').default(12),
}).strict();
function query<T extends { from?: string; to?: string }>(schema: z.ZodType<T>, request: Request): T {
  const parsed = schema.safeParse(request.query);
  if (!parsed.success) reject(422, 'INVALID_STATEMENT_FILTER', parsed.error.issues.map(issue => issue.message).join(' '));
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) reject(422, 'INVALID_STATEMENT_PERIOD', 'A data final deve ser igual ou posterior à inicial.');
  return parsed.data;
}
const route = (handler: (request: Request, response: Response) => Promise<unknown>) => (request: Request, response: Response, next: NextFunction) => { Promise.resolve(handler(request, response)).catch(next); };
export interface LedgerRoutesOptions { db: Database; currentUser: (request: Request) => Row; }

/** Register after session resolution and before the API fallback/error middleware. */
export function registerLedgerRoutes(app: Express, { db, currentUser }: LedgerRoutesOptions) {
  const privateResponse = (_request: Request, response: Response, next: NextFunction) => { response.setHeader('Cache-Control', 'no-store'); next(); };
  app.get('/api/wallets/statement', privateResponse, route(async (request, response) => {
    const user = currentUser(request);
    response.json(await walletStatement(db, user, query(statementSchema, request)));
  }));
  app.get('/api/wallets/statement/export', privateResponse, rateLimit({
    windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Aguarde um minuto antes de preparar outra exportação.', code: 'EXPORT_RATE_LIMITED' },
  }), route(async (request, response) => {
    const user = currentUser(request);
    const filters = query(filtersSchema, request);
    const controller = new AbortController();
    const cancel = () => { if (!response.writableFinished) controller.abort(); };
    response.once('close', cancel);
    let report: Awaited<ReturnType<typeof spoolLedgerCsv>> | undefined;
    try {
      report = await spoolLedgerCsv(db, user, filters, controller.signal);
      if (controller.signal.aborted || response.destroyed) return;
      response.setHeader('X-Export-Row-Count', String(report.rows));
      await new Promise<void>((resolve, rejectDownload) => {
        response.download(report!.path, report!.filename, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' } }, error => error ? rejectDownload(error) : resolve());
      });
    } catch (error) {
      if (!controller.signal.aborted && !response.destroyed) throw error;
    } finally {
      response.off('close', cancel);
      await report?.cleanup();
    }
  }));
}
