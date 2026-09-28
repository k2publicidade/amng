import type { LedgerEntry, WalletId } from './types.ts';

export type LedgerProduct = 'cloud' | 'market' | 'affiliate' | 'career' | 'wallet';
export interface LedgerFilters {
  wallet?: WalletId;
  kind?: string;
  status?: LedgerEntry['status'];
  product?: LedgerProduct;
  contractId?: string;
  coin?: string;
  from?: string;
  to?: string;
  search?: string;
}
export interface LedgerStatementRequest extends LedgerFilters { page: number; pageSize: number; }
export interface WalletStatementEntry extends LedgerEntry {
  journalId: string;
  businessKey: string;
  storedStatus: LedgerEntry['status'];
  currency: 'USD';
  product: LedgerProduct;
  contract: null | {
    id: string; planId: string; name: string; coin: string; machine: string;
    principalCents: number; rateBps: number; termsVersion: string | null;
    calculation: string | null; planVersion: number | null;
  };
  payment: null | { id: string; status: string; grossCents: number; feeCents: number; netCents: number; };
}
export interface WalletStatementData {
  generatedAt: string;
  timezone: 'UTC';
  currency: 'USD';
  isDemo: boolean;
  filters: LedgerFilters;
  entries: WalletStatementEntry[];
  pagination: { page: number; pageSize: number; totalPages: number; totalEntries: number; };
  totals: { creditsCents: number; debitsCents: number; netCents: number; };
  balances: { wallet: WalletId; availableCents: number; reservedCents: number; balanceCents: number; }[];
  options: {
    kinds: string[];
    contracts: { id: string; label: string; planId: string; coin: string; }[];
    coins: string[];
  };
  exportMaxRows: number;
}
