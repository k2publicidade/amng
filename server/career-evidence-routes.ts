import type { Express, Request } from 'express';
import { z } from 'zod';
import type { Database, Row } from './database.ts';
import { careerEvidence } from './career-evidence.ts';
import { iso } from './domain.ts';

/** Install after authentication/CSRF middleware and before the /api 404 handler. */
export function registerCareerEvidenceRoutes(app: Express, db: Database, currentUser: (request: Request) => Row) {
  app.get('/api/career/evidence', (request, response, next) => {
    void (async () => {
      const user = currentUser(request);
      const input = z.object({
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).default(iso().slice(0, 7)),
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce.number().int().refine(value => value === 12 || value === 20, 'Escolha 12 ou 20 contratos por página.').default(12),
        source: z.enum(['all', 'own', 'network']).default('all'),
        eligibility: z.enum(['eligible', 'excluded', 'all']).default('eligible'),
      }).strict().parse(request.query);
      const data = await careerEvidence(db, user, input);
      response.setHeader('Cache-Control', 'no-store');
      response.json(data);
    })().catch(next);
  });
}
