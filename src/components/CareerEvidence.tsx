import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FileCheck2, LoaderCircle, Network, RotateCw, ShieldCheck, UserRound, X, Zap } from 'lucide-react';
import type { CareerAwardEvidence, CareerContractEvidence, CareerEvidenceData, CareerEvidenceEligibility, CareerEvidenceSource } from '../../shared/career-evidence-types';
import { minerAccent } from '../../shared/miner-theme';
import { api } from '../lib/api';
import { money, number } from '../lib/format';
import './career-evidence.css';

const utcDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const utcDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value));
const competence = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T00:00:00Z'));
const currentMonth = () => new Date().toISOString().slice(0, 7);
const metric = (value: number | null, digits = 0) => value === null ? '—' : number(value, digits);
const modeLabels: Record<CareerEvidenceData['mode'], string> = { CLOSED: 'Apuração registrada', IN_PROGRESS: 'Competência em andamento', UNPROCESSED: 'Sem fechamento registrado' };
const awardLabels: Record<CareerAwardEvidence['status'], string> = { PAID: 'Pago', AWAITING_FUNDING: 'Aguardando financiamento', SUSPENDED: 'Suspenso', NOT_QUALIFIED: 'Sem valor elegível', UNPROCESSED: 'Não apurado', UNAVAILABLE: 'Registro incompleto' };
const contractLabels: Record<CareerContractEvidence['powerStatus'], string> = { INCLUDED: 'Compõe a Potência', EXPIRED: 'Expirou antes da apuração', CANCELLED: 'Cancelado antes da apuração', NOT_STARTED: 'Ainda não iniciado', EXCLUDED: 'Não compõe a Potência' };

function AwardEvidence({ kind, award, isDemo }: { kind: 'salary' | 'bonus'; award: CareerAwardEvidence; isDemo: boolean }) {
  return <article className="career-evidence-award">
    <header><span>{kind === 'salary' ? 'Salário da competência' : 'Bônus da competência'}</span><span className={'career-evidence-status career-evidence-status--' + award.status.toLowerCase()}>{awardLabels[award.status]}</span></header>
    <strong>{award.amountCents === null ? '—' : money(award.amountCents)}</strong>
    <p>{award.explanation}</p>
    <div className="career-evidence-credited"><span>{isDemo ? 'Crédito simulado no extrato' : 'Crédito confirmado no extrato'}</span><b>{money(award.creditedCents)}</b></div>
    {award.recordedAt && <small>Registro em {utcDateTime(award.recordedAt)} UTC</small>}
    {award.ledger.length > 0 && <details><summary>Ver vínculo com o extrato</summary><ul>{award.ledger.map(entry => <li key={entry.id}><span>{utcDate(entry.createdAt)}<small>#{entry.id.slice(-8).toUpperCase()}</small></span><b>{money(entry.amountCents)}</b></li>)}</ul></details>}
  </article>;
}

function ContractEvidence({ contract }: { contract: CareerContractEvidence }) {
  return <article className={'career-evidence-contract' + (contract.included ? ' is-included' : '')} style={{ '--evidence-coin': minerAccent(contract.planId) } as CSSProperties}>
    <div className="career-evidence-contract-main"><span className="career-evidence-coin" aria-hidden="true">{contract.coin || 'ASIC'}</span><div><h4>{contract.machine || contract.planName}</h4><span>{contract.planName} · {contract.reference}</span></div><div className="career-evidence-weight"><strong>{number(contract.contributedPower)}</strong><small>Potência</small></div></div>
    <div className="career-evidence-contract-owner">{contract.owner.isSelf ? <UserRound size={13} /> : <Network size={13} />}<span>{contract.owner.isSelf ? 'Seu contrato' : contract.owner.name}<small>{contract.owner.isSelf ? 'Próprio' : 'Nível ' + contract.owner.level} · {contract.owner.reference}</small></span><span className={'career-evidence-inclusion' + (contract.included ? ' is-included' : '')}>{contractLabels[contract.powerStatus]}</span></div>
    <dl><div><dt>Início</dt><dd>{utcDate(contract.startedAt)}</dd></div><div><dt>Expiração</dt><dd>{utcDate(contract.expiresAt)}</dd></div><div><dt>Peso do contrato</dt><dd>{number(contract.weight)}</dd></div>{contract.cancelledAt && <div><dt>Cancelamento</dt><dd>{utcDate(contract.cancelledAt)}</dd></div>}</dl>
  </article>;
}

export default function CareerEvidence({ userId, isDemo, initialMonth }: { userId: string; isDemo: boolean; initialMonth?: string }) {
  const [month, setMonth] = useState(initialMonth ?? currentMonth());
  const [source, setSource] = useState<CareerEvidenceSource>('all');
  const [eligibility, setEligibility] = useState<CareerEvidenceEligibility>('eligible');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ ownerId: string; queryKey: string; data: CareerEvidenceData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const queryKey = [userId, month, page, source, eligibility, revision].join(':');

  useEffect(() => { setMonth(initialMonth ?? currentMonth()); setPage(1); setSource('all'); setEligibility('eligible'); }, [userId, initialMonth]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    controllerRef.current = controller;
    setLoading(true); setError(''); setCancelled(false);
    setResult(previous => previous?.ownerId === userId && previous.data.month === month ? previous : null);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { setLoading(false); setError('Escolha uma competência válida.'); return () => { active = false; controller.abort(); }; }
    const query = new URLSearchParams({ month, page: String(page), source, eligibility });
    api<CareerEvidenceData>('/career/evidence?' + query.toString(), { signal: controller.signal })
      .then(data => { if (active && !controller.signal.aborted) setResult({ ownerId: userId, queryKey, data }); })
      .catch(failure => { if (active && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar a apuração.'); })
      .finally(() => { if (active) setLoading(false); if (controllerRef.current === controller) controllerRef.current = null; });
    return () => { active = false; controller.abort(); if (controllerRef.current === controller) controllerRef.current = null; };
  }, [userId, month, page, source, eligibility, revision]);

  const data = result?.ownerId === userId && result.data.month === month ? result.data : null;
  const contractsReady = result?.queryKey === queryKey && !loading && !error && !cancelled;
  const changeMonth = (value: string) => { setMonth(value); setPage(1); };
  const cancelQuery = () => { controllerRef.current?.abort(); setLoading(false); setCancelled(true); };
  const retry = () => setRevision(value => value + 1);
  const queryState = loading ? <div className="career-evidence-query-state" role="status"><LoaderCircle className="career-evidence-spin" size={23} /><p>Consultando sua apuração…</p><button className="button button-ghost" onClick={cancelQuery}><X size={14} />Cancelar consulta</button></div>
    : error || cancelled ? <div className="career-evidence-query-state" role={error ? 'alert' : 'status'}><p>{error || 'Consulta cancelada.'}</p><button className="button button-secondary" onClick={retry}><RotateCw size={15} />Consultar novamente</button></div> : null;

  return <section className="career-evidence" aria-label="Evidências da carreira">
    <header className="career-evidence-heading"><div><p className="eyebrow">SUA APURAÇÃO</p><h2>Por trás dos números</h2><p>Consulte os contratos que compõem sua Potência e os registros de salário e bônus de cada competência.</p></div><label><span><CalendarDays size={14} />Competência · UTC</span><input type="month" aria-label="Competência das evidências da carreira" value={month} max={currentMonth()} min="1900-01" onChange={event => changeMonth(event.target.value)} /></label></header>
    <div className="career-evidence-query" aria-busy={loading}>
      {!data && queryState}
      {data && <>
        <div className="career-evidence-record"><span className={'career-evidence-status career-evidence-status--' + data.mode.toLowerCase()}><FileCheck2 size={13} />{modeLabels[data.mode]}</span><p>{competence(data.month)}{data.closing ? ' · registrada em ' + utcDateTime(data.closing.recordedAt) + ' UTC' : ' · observada até ' + utcDateTime(data.cutoffAt) + ' UTC'}</p><small>{data.isDemo ? 'Demonstração privada. ' : ''}{data.mode === 'CLOSED' ? 'Pulso, Potência e remunerações vêm do registro preservado no fechamento.' : 'Os números desta consulta ainda podem mudar. A consulta não cria créditos.'}</small></div>
        <div className="career-evidence-metrics"><article><span><Zap size={14} />Potência apurada</span><strong>{metric(data.metrics.power)}</strong><small>{data.metrics.ownContracts === null ? 'Composição indisponível neste registro' : number(data.metrics.ownContracts + (data.metrics.networkContracts ?? 0)) + ' contratos elegíveis'}</small></article><article><span><UserRound size={14} />Seus contratos</span><strong>{metric(data.metrics.ownPower)}</strong><small>{metric(data.metrics.ownContracts)} contratos próprios</small></article><article><span><Network size={14} />Sua rede · até N7</span><strong>{metric(data.metrics.networkPower)}</strong><small>{metric(data.metrics.networkContracts)} contratos da rede</small></article><article><span>Pulso da competência</span><strong>{metric(data.metrics.pulse, 1)}<em>/ 100</em></strong><small>{data.mode === 'CLOSED' ? 'Valor registrado no fechamento' : 'Apuração até o momento'}</small></article></div>
        <div className="career-evidence-components"><div className="career-evidence-components-title"><h3>Composição do Pulso</h3><p>Potência anterior {metric(data.metrics.previousPower)} · retida {metric(data.metrics.retainedPower)}</p></div>{data.metrics.components.length ? <div className="career-evidence-component-grid">{data.metrics.components.map(component => <article key={component.id}><div><h4>{component.name}</h4><span>{number(component.score, 1)} <small>/ {number(component.max)}</small></span></div><progress value={Math.max(0, Math.min(component.score, component.max))} max={component.max} aria-label={component.name + ': ' + number(component.score, 1) + ' de ' + number(component.max)} /><p>{component.description}</p></article>)}</div> : <p className="career-evidence-note">Este registro não contém o detalhamento dos componentes.</p>}<p className="career-evidence-cycle-note">Ciclos ponderados: {metric(data.metrics.completedWeighted)} concluídos de {metric(data.metrics.eligibleWeighted)} elegíveis.</p></div>
        <div className="career-evidence-contracts"><header><div><h3>Contratos da apuração</h3><p>A inclusão considera a vigência no instante da apuração, com o peso preservado no contrato.</p></div><label><span>Participação na Potência</span><select aria-label="Filtrar contratos por inclusão na Potência" value={eligibility} onChange={event => { setEligibility(event.target.value as CareerEvidenceEligibility); setPage(1); }}><option value="eligible">Elegíveis</option><option value="excluded">Excluídos</option><option value="all">Todos na competência</option></select></label></header><div className="career-evidence-source" role="group" aria-label="Origem dos contratos"><button aria-pressed={source === 'all'} onClick={() => { setSource('all'); setPage(1); }}>Todos</button><button aria-pressed={source === 'own'} onClick={() => { setSource('own'); setPage(1); }}><UserRound size={13} />Próprios</button><button aria-pressed={source === 'network'} onClick={() => { setSource('network'); setPage(1); }}><Network size={13} />Rede até N7</button></div>
          {!contractsReady ? queryState : !data.contractEvidenceAvailable ? <div className="career-evidence-empty"><ShieldCheck size={25} /><p>O fechamento antigo preserva os totais, mas não contém a lista dos contratos que os compõem.</p><small>Os detalhes históricos não foram recalculados com os dados atuais.</small></div> : data.contracts.length ? <div className="career-evidence-contract-grid">{data.contracts.map(contract => <ContractEvidence key={contract.id} contract={contract} />)}</div> : <div className="career-evidence-empty"><Network size={25} /><p>Nenhum contrato corresponde a estes filtros na competência.</p></div>}
          {contractsReady && data.pagination.totalEntries > 0 && <footer className="career-evidence-pagination"><span>Página {data.pagination.page} de {data.pagination.totalPages} · {number(data.pagination.totalEntries)} contratos</span><div><button className="icon-button" aria-label="Página anterior dos contratos de carreira" disabled={data.pagination.page <= 1} onClick={() => setPage(data.pagination.page - 1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Próxima página dos contratos de carreira" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setPage(data.pagination.page + 1)}><ChevronRight size={18} /></button></div></footer>}
        </div>
        <div className="career-evidence-remuneration"><header><h3>Salário e bônus</h3><p>Registros de carreira da competência. Comissões por indicação são apresentadas na tela da rede.</p></header><dl className="career-evidence-qualification"><div><dt>Etapa alcançada</dt><dd>{data.qualification.achievedStage ?? 'Sem etapa registrada'}</dd></div><div><dt>{data.mode === 'CLOSED' ? 'Etapa remunerada' : 'Etapa da previsão'}</dt><dd>{data.qualification.payableStage ?? 'Sem etapa elegível'}</dd></div><div><dt>{data.mode === 'CLOSED' ? 'Manutenção aplicada' : 'Previsão da manutenção'}</dt><dd>{data.qualification.maintenanceBps === null ? '—' : number(data.qualification.maintenanceBps / 100) + '%'}</dd></div><div><dt>{data.mode === 'CLOSED' ? 'Meses sem manutenção' : 'Prévia dos meses sem manutenção'}</dt><dd>{metric(data.qualification.missedMonths)}</dd></div></dl>{data.mode !== 'CLOSED' && <p className="career-evidence-note career-evidence-preview-note">Etapa e manutenção são uma prévia calculada a partir da competência anterior. Apenas o fechamento pode registrar uma remuneração.</p>}<div className="career-evidence-awards"><AwardEvidence kind="salary" award={data.salary} isDemo={data.isDemo} /><AwardEvidence kind="bonus" award={data.bonus} isDemo={data.isDemo} /></div></div>
        <div className="career-evidence-funding"><header><h3>Caixa coletivo da competência</h3><p>Saldo observado em {utcDateTime(data.funding.observedAt)} UTC. Valores do fundo compartilhado{data.isDemo ? ' dentro desta demonstração' : ''}; não representam seu saldo individual.</p></header><div className="career-evidence-funding-grid">{([['salary', 'Salários'], ['bonus', 'Bônus'], ['reserve', 'Reserva']] as const).map(([key, label]) => <article key={key}><span>{label} · disponível</span><strong>{money(data.funding[key].availableCents)}</strong><small>Financiado {money(data.funding[key].fundedCents)} · pago {money(data.funding[key].paidCents)}</small></article>)}</div><p className="career-evidence-note">Esta consulta mostra a posição atual do fundo para {competence(data.funding.month)}. O fechamento não preservou uma fotografia histórica desse caixa.</p></div>
        <footer className="career-evidence-footnote"><ShieldCheck size={14} /><span>{isDemo || data.isDemo ? 'Fórmula demonstrativa' : data.formulaVersion?.startsWith('PROPOSAL') ? 'Fórmula em proposta' : 'Versão da apuração'}: {data.formulaVersion ?? 'indisponível'} · datas em UTC.</span></footer>
      </>}
    </div>
  </section>;
}
