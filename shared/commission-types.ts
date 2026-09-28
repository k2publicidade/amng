export type CommissionPurchase = 'first' | 'repeat' | 'unknown';
export type CommissionStatus = 'CONFIRMED' | 'INELIGIBLE' | 'PENDING_RATE' | 'REVERSED' | 'UNAVAILABLE';
export type CommissionEligibility = 'eligible' | 'ineligible' | 'unknown';

export interface CommissionFilters {
  from?: string;
  to?: string;
  level?: number;
  purchase?: CommissionPurchase;
  status?: CommissionStatus;
  eligibility?: CommissionEligibility;
}
export interface CommissionStatementRequest extends CommissionFilters { page: number; pageSize: number; }

export interface CommissionEvent {
  id: string;
  reference: string;
  createdAt: string;
  isDemo: boolean;
  level: number;
  purchase: CommissionPurchase;
  status: CommissionStatus;
  storedStatus: string;
  eligibility: CommissionEligibility;
  baseCents: number;
  rateBps: number | null;
  amountCents: number | null;
  creditedCents: number;
  reversedCents: number;
  netCents: number;
  condition: string;
  evidenceWarning: string | null;
  snapshot: { version: string | null; base: 'NET_CONTRACT_PRICE' | null; eligibility: 'ACTIVE_CONTRACT' | null; compression: boolean | null; };
  origin: { contractReference: string; planId: string; planName: string; machine: string; coin: string; planVersion: number | null; };
  ledger: { id: string; kind: 'AFFILIATE_COMMISSION' | 'AFFILIATE_REVERSAL'; amountCents: number; createdAt: string; }[];
  reversal: { reference: string | null; recordedAt: string; recorded: boolean; } | null;
}

export interface CommissionStatementData {
  generatedAt: string;
  isDemo: boolean;
  currency: 'USD';
  timezone: 'UTC';
  periodBasis: 'EVENT_ORIGIN';
  filters: CommissionFilters;
  events: CommissionEvent[];
  pagination: { page: number; pageSize: number; totalPages: number; totalEvents: number; };
  totals: { creditedCents: number; reversedCents: number; netCents: number; ineligibleEvents: number; pendingRateEvents: number; reversedEvents: number; };
  firstN7: { rateDefinedInCurrentTable: boolean; recordedEvents: number; pendingRateEvents: number; };
  exportMaxRows: number;
}
