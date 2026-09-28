import type { BootstrapData, Plan, ProductRule, Integration, CycleOffer } from '../../shared/types';
import { MINER_ACCENTS } from '../../shared/miner-theme';

export const DEFAULT_PLANS: Plan[] = [
  { id: 'sc', name: 'SC Miner', coin: 'SC', algorithm: 'Blake2B-Sia', machine: 'Goldshell SC Box', priceCents: 2500, durationDays: 130, rateBps: 70, powerWeight: 1, color: MINER_ACCENTS.sc, image: '/assets/miners/sc.png', status: 'DOCUMENTED' },
  { id: 'etc', name: 'ETC Miner', coin: 'ETC', algorithm: 'Etchash', machine: 'Jasminer X16', priceCents: 8000, durationDays: 130, rateBps: 74, powerWeight: 2, color: MINER_ACCENTS.etc, image: '/assets/miners/etc.png', status: 'DOCUMENTED' },
  { id: 'ckb', name: 'CKB Miner', coin: 'CKB', algorithm: 'Eaglesong', machine: 'Antminer K7', priceCents: 16000, durationDays: 130, rateBps: 77, powerWeight: 4, color: MINER_ACCENTS.ckb, image: '/assets/miners/ckb.png', status: 'DOCUMENTED' },
  { id: 'kda', name: 'KDA Miner', coin: 'KDA', algorithm: 'Blake2S', machine: 'Antminer KA3', priceCents: 35000, durationDays: 130, rateBps: 82, powerWeight: 7, color: MINER_ACCENTS.kda, image: '/assets/miners/kda.png', status: 'DOCUMENTED' },
  { id: 'alph', name: 'ALPH Miner', coin: 'ALPH', algorithm: 'Blake3', machine: 'IceRiver AL3', priceCents: 60000, durationDays: 130, rateBps: 86, powerWeight: 11, color: MINER_ACCENTS.alph, image: '/assets/miners/alph.png', status: 'DOCUMENTED' },
  { id: 'doge', name: 'DOGE Miner', coin: 'DOGE', algorithm: 'Scrypt', machine: 'VolcMiner D1', priceCents: 140000, durationDays: 130, rateBps: 89, powerWeight: 20, color: MINER_ACCENTS.doge, image: '/assets/miners/doge.png', status: 'DOCUMENTED' },
  { id: 'btc', name: 'BTC Miner', coin: 'BTC', algorithm: 'SHA-256', machine: 'Avalon A1566', priceCents: 300000, durationDays: 130, rateBps: 92, powerWeight: 36, color: MINER_ACCENTS.btc, image: '/assets/miners/btc.png', status: 'DOCUMENTED' },
];

export const DEFAULT_RULES: ProductRule[] = [
  { id: 'cloud-purchases', label: 'Contratação Cloud', status: 'PENDING', enabled: false, description: 'Preços e prazo de 130 dias documentados.', source: 'Escopo AMNG, p. 2' },
  { id: 'mining-income', label: 'Mining Income', status: 'PENDING', enabled: false, description: 'Base e ativação operacional.', source: 'Escopo AMNG, p. 2' },
  { id: 'profit-sharing', label: 'Profit Sharing', status: 'PENDING', enabled: false, description: 'Faixa documentada: 0,90%–1,10%.', source: 'Escopo AMNG, p. 2 e 6' },
  { id: 'deposits', label: 'Depósitos', status: 'PENDING', enabled: false, description: 'Provedor, limites e conciliação.', source: 'Plano mestre §7E' },
  { id: 'withdrawals', label: 'Saques', status: 'PENDING', enabled: false, description: 'Mínimos, taxas e processamento.', source: 'Plano mestre §7E' },
  { id: 'conversions', label: 'Conversões', status: 'PENDING', enabled: false, description: 'Cotações e moedas convertidas.', source: 'Escopo AMNG, p. 4' },
  { id: 'market', label: 'Hashrate Market', status: 'PENDING', enabled: false, description: 'Mínimo US$ 25 e taxa 0,40%.', source: 'Escopo AMNG, p. 5' },
  { id: 'cycles', label: 'Planos de ciclo', status: 'PENDING', enabled: false, description: 'Taxas a definir.', source: 'Escopo AMNG, p. 5' },
  { id: 'affiliate', label: 'Comissões de afiliados', status: 'PENDING', enabled: false, description: 'N7 da primeira compra.', source: 'Escopo AMNG, p. 5' },
  { id: 'career', label: 'Carreira Pulso + Potência', status: 'PENDING', enabled: false, description: 'Estágios, salários e bônus.', source: 'Proposta de carreira AMNG' },
];

export const DEFAULT_CYCLES: CycleOffer[] = [
  { id: 'cycle-7', name: 'Ciclo 7', days: 7, priceCents: 3000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-15', name: 'Ciclo 15', days: 15, priceCents: 6000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-30', name: 'Ciclo 30', days: 30, priceCents: 12000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-60', name: 'Ciclo 60', days: 60, priceCents: 25000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-90', name: 'Ciclo 90', days: 90, priceCents: 75000, rateBps: null, coin: 'A definir', status: 'PENDING' },
];

export const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'payments', name: '2PP', category: 'FINANCE', status: 'NOT_CONFIGURED', description: 'Provedor selecionado. Credenciais e homologação pendentes.', updatedAt: null },
  { id: 'telemetry', name: 'Telemetria ASIC', category: 'MINING', status: 'NOT_CONFIGURED', description: 'Hardware, hashrate e telemetria operacional.', updatedAt: null },
  { id: 'pool', name: 'AMNG Pool', category: 'MINING', status: 'NOT_CONFIGURED', description: 'Workers e shares da pool.', updatedAt: null },
  { id: 'quotes', name: 'Binance · Spot USDT', category: 'MARKET', status: 'NOT_CONFIGURED', description: 'Cotações públicas em USDT via Binance.', updatedAt: null },
];

export const DEFAULT_BOOTSTRAP: BootstrapData = {
  mode: 'public',
  user: null,
  csrfToken: 'public-preview-token',
  plans: DEFAULT_PLANS,
  wallets: [
    { id: 'deposit', label: 'Depósitos', balanceCents: 0, reservedCents: 0, availableCents: 0 },
    { id: 'earnings', label: 'Rendimentos', balanceCents: 0, reservedCents: 0, availableCents: 0 },
    { id: 'affiliate', label: 'Afiliados', balanceCents: 0, reservedCents: 0, availableCents: 0 },
  ],
  miners: [],
  ledger: [],
  network: { members: [], directCount: 0, activeCount: 0, totalCount: 0, referralCode: '', commissionCents: 0, commissionRates: [] },
  career: {
    pulse: 0, power: 0, stage: null, nextStage: 'IGNITION', nextPulse: 45, nextPower: 20,
    confirmedSalaryCents: 0, proposedSalaryCents: 2000, qualificationMonths: 0,
    components: [], history: [],
    stages: [
      { name: 'IGNITION', pulse: 45, power: 20, salaryCents: 2000 },
      { name: 'RIG', pulse: 55, power: 50, salaryCents: 4000 },
      { name: 'CLUSTER', pulse: 65, power: 100, salaryCents: 6000 },
      { name: 'GRID', pulse: 75, power: 180, salaryCents: 10000 },
      { name: 'GENESIS', pulse: 85, power: 300, salaryCents: 22000 },
    ],
    status: 'PROPOSAL', nextClosingAt: new Date().toISOString()
  },
  marketPositions: [],
  cycles: DEFAULT_CYCLES,
  rules: DEFAULT_RULES,
  integrations: DEFAULT_INTEGRATIONS,
  tickets: [],
  dashboard: {
    todayMiningCents: 0,
    totalMiningCents: 0,
    profitSharingCents: 0,
    productionHistory: [],
    quoteUpdatedAt: null,
    quotes: DEFAULT_PLANS.map(p => ({ coin: p.coin, usd: null }))
  }
};
