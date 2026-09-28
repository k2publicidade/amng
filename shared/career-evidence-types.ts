import type { CareerComponent } from './types.ts';

export type CareerEvidenceSource = 'all' | 'own' | 'network';
export type CareerEvidenceEligibility = 'eligible' | 'excluded' | 'all';
export type CareerAwardEvidenceStatus = 'PAID' | 'AWAITING_FUNDING' | 'SUSPENDED' | 'NOT_QUALIFIED' | 'UNPROCESSED' | 'UNAVAILABLE';

export interface CareerContractEvidence {
  id: string;
  reference: string;
  owner: { id: string; name: string; reference: string; level: number; isSelf: boolean };
  lineId: string | null;
  planId: string;
  planName: string;
  coin: string;
  machine: string;
  weight: number;
  contributedPower: number;
  included: boolean;
  powerStatus: 'INCLUDED' | 'EXPIRED' | 'CANCELLED' | 'NOT_STARTED' | 'EXCLUDED';
  contractStatus: string;
  startedAt: string;
  expiresAt: string;
  cancelledAt: string | null;
  snapshotVersion: number | null;
}

export interface CareerAwardEvidence {
  amountCents: number | null;
  creditedCents: number;
  status: CareerAwardEvidenceStatus;
  awardId: string | null;
  recordedAt: string | null;
  formulaVersion: string | null;
  reasonCode: string;
  explanation: string;
  ledger: { id: string; amountCents: number; createdAt: string; reference: string }[];
}

export interface CareerEvidenceData {
  month: string;
  generatedAt: string;
  isDemo: boolean;
  timezone: 'UTC';
  cutoffAt: string;
  mode: 'CLOSED' | 'IN_PROGRESS' | 'UNPROCESSED';
  formulaVersion: string | null;
  contractEvidenceAvailable: boolean;
  closing: { id: string; recordedAt: string; formulaVersion: string } | null;
  availableMonths: string[];
  metrics: {
    pulse: number | null;
    power: number | null;
    ownPower: number | null;
    networkPower: number | null;
    previousPower: number | null;
    retainedPower: number | null;
    completedWeighted: number | null;
    eligibleWeighted: number | null;
    ownContracts: number | null;
    networkContracts: number | null;
    components: CareerComponent[];
  };
  qualification: {
    achievedStage: string | null;
    payableStage: string | null;
    missedMonths: number | null;
    maintenanceBps: number | null;
  };
  salary: CareerAwardEvidence;
  bonus: CareerAwardEvidence;
  funding: {
    month: string;
    observedAt: string;
    collective: true;
    salary: { fundedCents: number; paidCents: number; availableCents: number };
    bonus: { fundedCents: number; paidCents: number; availableCents: number };
    reserve: { fundedCents: number; paidCents: number; availableCents: number };
  };
  contracts: CareerContractEvidence[];
  filters: { source: CareerEvidenceSource; eligibility: CareerEvidenceEligibility };
  pagination: { page: number; pageSize: number; totalEntries: number; totalPages: number };
}
