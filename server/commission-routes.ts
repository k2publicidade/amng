import type { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { CommissionFilters, CommissionStatementRequest } from '../shared/commission-types.ts';
import type { Database, Row } from './database.ts';
import { reject } from './domain.ts';
import { commissionCsv, commissionStatement, COMMISSION_EXPORT_MAX_ROWS } from './commission-queries.ts';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.').refine(value => {
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Informe uma data existente.');
const filtersSchema = z.object({
  from: day.optional(), to: day.optional(), level: z.coerce.number().int().min(1).max(7).optional(),
  purchase: z.enum(['first', 'repeat', 'unknown']).optional(),
  status: z.enum(['CONFIRMED', 'INELIGIBLE', 'PENDING_RATE', 'REVERSED', 'UNAVAILABLE']).optional(),
  eligibility: z.enum(['eligible', 'ineligible', 'unknown']).optional(),
}).strict();
const statementSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().refine(value => [12, 20, 50].includes(value), 'Selecione 12, 20 ou 50 eventos por página.').default(12),
}).strict();
function parse<T extends CommissionFilters>(schema: z.ZodType<T>, request: Request): T {
  const result = schema.safeParse(request.query);
  if (!result.success) reject(422, 'INVALID_COMMISSION_FILTER', result.error.issues.map(issue => issue.message).join(' '));
  if (result.data.from && result.data.to && result.data.from > result.data.to) reject(422, 'INVALID_COMMISSION_PERIOD', 'A data final deve ser igual ou posterior à inicial.');
  return result.data;
}
const route = (handler: (request: Request, response: Response) => Promise<unknown>) => (request: Request, response: Response, next: NextFunction) => { Promise.resolve(handler(request, response)).catch(next); };

/** Private reads only, installed after session middleware and before the API fallback. */
export function registerCommissionRoutes(app: Express, db: Database, currentUser: (request: Request) => Row) {
  const privateResponse = (_request: Request, response: Response, next: NextFunction) => { response.setHeader('Cache-Control', 'no-store'); next(); };
  app.get('/api/network/commissions', privateResponse, route(async (request, response) => {
    const user = currentUser(request);
    response.json(await commissionStatement(db, user, parse<CommissionStatementRequest>(statementSchema, request)));
  }));
  app.get('/api/network/commissions/export', privateResponse, rateLimit({
    windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Aguarde um minuto antes de preparar outra exportação.', code: 'COMMISSION_EXPORT_RATE_LIMITED' },
  }), route(async (request, response) => {
    const user = currentUser(request), filters = parse<CommissionFilters>(filtersSchema, request);
    const controller = new AbortController();
    const cancel = () => { if (!response.writableFinished) controller.abort(); };
    response.once('close', cancel);
    try {
      const report = await commissionCsv(db, user, filters, controller.signal);
      if (controller.signal.aborted || response.destroyed) return;
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', 'attachment; filename="' + report.filename + '"');
      response.setHeader('X-Export-Row-Count', String(report.rows));
      response.setHeader('X-Export-Max-Rows', String(COMMISSION_EXPORT_MAX_ROWS));
      response.send(report.csv);
    } catch (error) { if (!controller.signal.aborted && !response.destroyed) throw error; }
    finally { response.off('close', cancel); }
  }));
}
