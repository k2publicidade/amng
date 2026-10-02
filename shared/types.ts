export type WalletId = 'deposit' | 'earnings' | 'affiliate';
export type AppMode = 'demo' | 'account' | 'public';
export interface User {
  id: string; name: string; email: string; role: UserRole; permissions: AdminPermission[];
  isDemo: boolean; twoFactorEnabled: boolean; referralCode: string; createdAt: string;
  status?: 'ACTIVE' | 'BLOCKED';
}
export interface Plan {
  id: string; name: string; coin: string; algorithm: string; machine: string;
  priceCents: number; durationDays: number; rateBps: number; powerWeight: number;
  color: string; image: string; status: 'DOCUMENTED' | 'APPROVED' | 'PAUSED';
}
export interface Wallet {
  id: WalletId; label: string; balanceCents: number; reservedCents: number; availableCents: number;
}
export interface Miner {
  id: string; planId: string; planName: string; coin: string; machine: string; image: string;
  color: string; principalCents: number; rateBps: number; powerWeight: number;
  status: 'READY' | 'MINING' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  startedAt: string; expiresAt: string; cycleStartedAt: string | null;
  cycleEndsAt: string | null; pausedAt: string | null; nextActivationAt: string | null; cycleCount: number;
  totalEarnedCents: number; cycleEstimatedCents: number; allocatedHashrate: number | null;
  hashrateUnit: string | null; hardwareStatus: 'UNAVAILABLE' | 'ONLINE' | 'OFFLINE'; isDemo: boolean;
}
export interface LedgerEntry {
  id: string; wallet: WalletId; amountCents: number; kind: string; description: string;
  status: 'CONFIRMED' | 'PENDING' | 'RESERVED' | 'REVERSED';
  createdAt: string; reference: string; isDemo: boolean;
}
export interface MinerStatementData {
  minerId: string; isDemo: boolean; confirmedOnly: true; generatedAt: string;
  period: { days: number; from: string; until: string; timezone: 'UTC' };
  productionHistory: { date: string; miningCents: number; sharingCents: number }[];
  totals: { miningCents: number; sharingCents: number; totalCents: number };
  ledger: LedgerEntry[];
  pagination: { page: number; pageSize: number; totalPages: number; totalEntries: number };
}
export interface NetworkMember {
  id: string; name: string; level: number; sponsorId: string | null; active: boolean;
  contracts: number; power: number; joinedAt: string; line: string;
}
export interface NetworkData {
  members: NetworkMember[]; directCount: number; activeCount: number; totalCount: number;
  referralCode: string; commissionCents: number;
  commissionRates: { level: number; firstBps: number | null; recurringBps: number }[];
}
export interface CareerComponent {
  id: string; name: string; score: number; max: number; description: string;
}
export interface CareerData {
  pulse: number; power: number; stage: string | null; nextStage: string;
  nextPulse: number; nextPower: number; confirmedSalaryCents: number; proposedSalaryCents: number;
  qualificationMonths: number; components: CareerComponent[];
  history: { month: string; pulse: number; power: number }[];
  stages: { name: string; pulse: number; power: number; salaryCents: number }[];
  status: 'PROPOSAL' | 'AWAITING_FUNDING' | 'CONFIRMED'; nextClosingAt: string;
  lastClosedMonth?: string | null; ownPower?: number; networkPower?: number;
  salaryStatus?: 'PAID' | 'AWAITING_FUNDING' | 'SUSPENDED' | 'NOT_QUALIFIED'; maintenanceBps?: number;
  bonusCents?: number; bonusStatus?: 'PAID' | 'AWAITING_FUNDING' | 'NOT_QUALIFIED';
  funding?: {
    month: string; salaryFundedCents: number; salaryPaidCents: number; salaryAvailableCents: number;
    bonusFundedCents: number; bonusPaidCents: number; bonusAvailableCents: number; reserveCents: number;
  };
}
export interface MarketPosition {
  id: string; principalCents: number; earningsCents: number; createdAt: string;
  status: 'ACTIVE' | 'WITHDRAWAL_PENDING' | 'CLOSED';
}
export interface CycleOffer {
  id: string; name: string; days: number; priceCents: number; rateBps: number | null;
  coin: string; status: 'PENDING' | 'APPROVED';
}
export interface ProductRule {
  id: string; label: string; status: 'CONFIRMED' | 'PENDING' | 'NOT_APPLICABLE';
  description: string; source: string; enabled: boolean;
}
export interface Integration {
  id: string; name: string; category: string; status: 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR';
  description: string; updatedAt: string | null;
}
export interface SupportTicket {
  id: string; subject: string; message: string; status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  createdAt: string; reply: string | null;
}
export interface BootstrapData {
  mode: AppMode; user: User | null; csrfToken: string; demoEnabled?: boolean;
  plans: Plan[]; wallets: Wallet[]; miners: Miner[]; ledger: LedgerEntry[];
  network: NetworkData; career: CareerData; marketPositions: MarketPosition[];
  cycles: CycleOffer[]; rules: ProductRule[]; integrations: Integration[]; tickets: SupportTicket[];
  dashboard: {
    todayMiningCents: number; totalMiningCents: number; profitSharingCents: number;
    productionHistory: { date: string; miningCents: number; sharingCents: number }[];
    quoteUpdatedAt: string | null; quotes: { coin: string; usd: number | null; symbol?: string | null; updatedAt?: string | null }[];
    quoteAsset?: 'USDT'; quoteStatus?: string;
  };
}
export interface AdminData {
  actor: User;
  contracts: { id: string; userName: string | null; machine: string; coin: string; planName: string; status: Miner['status']; startedAt: string; expiresAt: string; cycleEndsAt: string | null; hardwareStatus: 'UNAVAILABLE'; isDemo: boolean }[];
  users: User[]; rules: ProductRule[]; plans: Plan[]; integrations: Integration[];
  audit: { id: string; actor: string; action: string; target: string; details: string; createdAt: string }[];
  tickets: (SupportTicket & { userName: string })[];
  payments: { id: string; userName: string; type: string; amountCents: number; status: string; createdAt: string }[];
  coupons: { id: string; code: string; discountBps: number; maxUses: number; uses: number; expiresAt: string; active: boolean }[];
  totals: { users: number | null; contracts: number | null; depositsCents: number | null; pendingPayments: number | null };
}
export interface CareerPreview {
  month: string; isDemo: boolean; closed: boolean; nextMonth: string; canClose: boolean; users: number;
  salary: { fundedCents: number; paidCents: number; availableCents: number };
  bonus: { fundedCents: number; paidCents: number; availableCents: number };
  reserve: { fundedCents: number; paidCents: number; availableCents: number };
  predictedSalaryCents: number; salaryGapCents: number; awaitingCents: number;
}
import type { AdminPermission, UserRole } from './permissions.ts';
