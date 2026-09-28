import { MINER_ACCENTS } from '../shared/miner-theme.ts';
import type { CareerData, CycleOffer, Integration, Plan, ProductRule } from '../shared/types.ts';
import type { Executor } from './database.ts';

export const PLANS: Plan[] = [
  { id: 'sc', name: 'SC Miner', coin: 'SC', algorithm: 'Blake2B-Sia', machine: 'Goldshell SC Box', priceCents: 2500, durationDays: 130, rateBps: 70, powerWeight: 1, color: MINER_ACCENTS.sc, image: '/assets/miners/sc.png', status: 'DOCUMENTED' },
  { id: 'etc', name: 'ETC Miner', coin: 'ETC', algorithm: 'Etchash', machine: 'Jasminer X16', priceCents: 8000, durationDays: 130, rateBps: 74, powerWeight: 2, color: MINER_ACCENTS.etc, image: '/assets/miners/etc.png', status: 'DOCUMENTED' },
  { id: 'ckb', name: 'CKB Miner', coin: 'CKB', algorithm: 'Eaglesong', machine: 'Antminer K7', priceCents: 16000, durationDays: 130, rateBps: 77, powerWeight: 4, color: MINER_ACCENTS.ckb, image: '/assets/miners/ckb.png', status: 'DOCUMENTED' },
  { id: 'kda', name: 'KDA Miner', coin: 'KDA', algorithm: 'Blake2S', machine: 'Antminer KA3', priceCents: 35000, durationDays: 130, rateBps: 82, powerWeight: 7, color: MINER_ACCENTS.kda, image: '/assets/miners/kda.png', status: 'DOCUMENTED' },
  { id: 'alph', name: 'ALPH Miner', coin: 'ALPH', algorithm: 'Blake3', machine: 'IceRiver AL3', priceCents: 60000, durationDays: 130, rateBps: 86, powerWeight: 11, color: MINER_ACCENTS.alph, image: '/assets/miners/alph.png', status: 'DOCUMENTED' },
  { id: 'doge', name: 'DOGE Miner', coin: 'DOGE', algorithm: 'Scrypt', machine: 'VolcMiner D1', priceCents: 140000, durationDays: 130, rateBps: 89, powerWeight: 20, color: MINER_ACCENTS.doge, image: '/assets/miners/doge.png', status: 'DOCUMENTED' },
  { id: 'btc', name: 'BTC Miner', coin: 'BTC', algorithm: 'SHA-256', machine: 'Avalon A1566', priceCents: 300000, durationDays: 130, rateBps: 92, powerWeight: 36, color: MINER_ACCENTS.btc, image: '/assets/miners/btc.png', status: 'DOCUMENTED' },
];

export const RULES: ProductRule[] = [
  { id: 'cloud-purchases', label: 'Contratação Cloud', status: 'PENDING', enabled: false, description: 'Preços e prazo de 130 dias documentados. Termos, capacidade, limites, devolução do principal e cancelamento aguardam aprovação.', source: 'Escopo AMNG, p. 2; plano mestre §7C' },
  { id: 'mining-income', label: 'Mining Income', status: 'PENDING', enabled: false, description: 'Base, arredondamento, ativação, conversão e origem operacional pendentes. ALPH documentado em 0,86%; exemplo de 0,90% exige reconciliação.', source: 'Escopo AMNG, p. 2–5; plano mestre §7D' },
  { id: 'profit-sharing', label: 'Profit Sharing', status: 'PENDING', enabled: false, description: 'Faixa documentada: 0,90%–1,10%. Base, participação, funding e evidência de resultados ainda não definidos.', source: 'Escopo AMNG, p. 2 e 6' },
  { id: 'deposits', label: 'Depósitos', status: 'PENDING', enabled: false, description: 'Provedor, moeda, rede, confirmações, identidade, limites e conciliação pendentes.', source: 'Plano mestre §7E e §11' },
  { id: 'withdrawals', label: 'Saques', status: 'PENDING', enabled: false, description: 'Mínimos, taxas, janela, origem permitida, KYC, processamento e estorno pendentes.', source: 'Plano mestre §7E e §11' },
  { id: 'conversions', label: 'Conversões', status: 'PENDING', enabled: false, description: 'Fonte da cotação, moeda minerada, custos, base e destino da conversão pendentes.', source: 'Escopo AMNG, p. 4; plano mestre §7E' },
  { id: 'market', label: 'Hashrate Market', status: 'PENDING', enabled: false, description: 'Mínimo US$ 25 e taxa 0,40% documentados. Base, composição, funding, capacidade e retirada pendentes.', source: 'Escopo AMNG, p. 5; plano mestre §7F' },
  { id: 'cycles', label: 'Planos de ciclo', status: 'PENDING', enabled: false, description: 'Taxas a definir. Calendário, fuso, estoque, elegibilidade e liquidação não aprovados.', source: 'Escopo AMNG, p. 5' },
  { id: 'affiliate', label: 'Comissões de afiliados', status: 'PENDING', enabled: false, description: 'N7 da primeira compra, base, elegibilidade, compressão, crédito e estorno pendentes.', source: 'Escopo AMNG, p. 5; plano mestre §7G' },
  { id: 'career', label: 'Carreira Pulso + Potência', status: 'PENDING', enabled: false, description: 'Pesos, estágios, salários, bônus, caixa de 5% e fuso de fechamento são propostas. Nenhuma folha real autorizada.', source: 'Proposta de carreira AMNG, p. 1–10' },
];

export const CYCLES: CycleOffer[] = [
  { id: 'cycle-7', name: 'Ciclo 7', days: 7, priceCents: 3000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-15', name: 'Ciclo 15', days: 15, priceCents: 6000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-30', name: 'Ciclo 30', days: 30, priceCents: 12000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-60', name: 'Ciclo 60', days: 60, priceCents: 25000, rateBps: null, coin: 'A definir', status: 'PENDING' },
  { id: 'cycle-90', name: 'Ciclo 90', days: 90, priceCents: 75000, rateBps: null, coin: 'A definir', status: 'PENDING' },
];
export const INTEGRATIONS: Integration[] = [
  { id: 'payments', name: '2PP', category: 'FINANCE', status: 'NOT_CONFIGURED', description: 'Provedor selecionado. Credenciais, contrato de API e homologação serão configurados na etapa final.', updatedAt: null },
  { id: 'telemetry', name: 'Telemetria ASIC', category: 'MINING', status: 'NOT_CONFIGURED', description: 'Hardware, hashrate e disponibilidade exigem fonte operacional.', updatedAt: null },
  { id: 'pool', name: 'AMNG Pool', category: 'MINING', status: 'NOT_CONFIGURED', description: 'Shares, workers e produção dependem da API do pool.', updatedAt: null },
  { id: 'quotes', name: 'Binance · Spot USDT', category: 'MARKET', status: 'NOT_CONFIGURED', description: 'Cotações públicas em USDT via REST/WebSocket, com indisponibilidade explícita para pares ausentes ou dados vencidos.', updatedAt: null },
  { id: 'hosting', name: 'AMNG Host', category: 'ECOSYSTEM', status: 'NOT_CONFIGURED', description: 'Inventário, localização, SLA e consumo ainda não definidos.', updatedAt: null },
  { id: 'os', name: 'AMNG OS', category: 'ECOSYSTEM', status: 'NOT_CONFIGURED', description: 'Comandos de hardware aguardam integração e permissões.', updatedAt: null },
  { id: 'equipment', name: 'Equipment Market', category: 'ECOSYSTEM', status: 'NOT_CONFIGURED', description: 'Estoque, entrega, garantia e catálogo comercial não configurados.', updatedAt: null },
];
export const STAGES: CareerData['stages'] = [
  { name: 'IGNITION', pulse: 45, power: 20, salaryCents: 2000 },
  { name: 'RIG', pulse: 55, power: 50, salaryCents: 4000 },
  { name: 'CLUSTER', pulse: 65, power: 100, salaryCents: 6000 },
  { name: 'GRID', pulse: 75, power: 180, salaryCents: 10000 },
  { name: 'GENESIS', pulse: 85, power: 300, salaryCents: 22000 },
];
export const COMMISSIONS = [800, 400, 300, 200, 200, 100, null].map((firstBps, index) => ({ level: index + 1, firstBps, recurringBps: [400, 200, 100, 100, 100, 100, 100][index] }));

export async function seedCatalog(tx: Executor, scope = 'real') {
  for (const p of PLANS) {
    await tx.run(`INSERT INTO plans(scope,id,name,coin,algorithm,machine,price_cents,duration_days,rate_bps,power_weight,color,image,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(scope,id) DO NOTHING`,
      [scope,p.id,p.name,p.coin,p.algorithm,p.machine,p.priceCents,p.durationDays,p.rateBps,p.powerWeight,p.color,p.image,p.status]);
  }
  for (const r of RULES) {
    await tx.run(`INSERT INTO product_rules(scope,id,label,status,description,source,enabled) VALUES(?,?,?,?,?,?,?) ON CONFLICT(scope,id) DO NOTHING`,
      [scope,r.id,r.label,r.status,r.description,r.source,0]);
  }
}
