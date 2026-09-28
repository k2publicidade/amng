import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, Cpu, Layers, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, Users, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminData, Plan, ProductRule, User } from '../../shared/types';
import type { PortalProps } from '../lib/portal';
import { api, patch, post } from '../lib/api';
import { date, money, number, percent } from '../lib/format';
import { pageVariants, fadeUp, scaleIn, staggerContainer, dynamicEase } from '../lib/animations';
import Dialog from '../components/Dialog';
import CareerClosingPanel from '../components/CareerClosingPanel';
import './admin.css';

const statusText: Record<string, string> = { CONFIRMED: 'Confirmado', PENDING: 'Pendente', NOT_APPLICABLE: 'Não aplicável', DOCUMENTED: 'Documentado', APPROVED: 'Aprovado', PAUSED: 'Pausado', ACTIVE: 'Ativo', BLOCKED: 'Bloqueado', RESERVED: 'Reservado', PROCESSING: 'Processando', REVIEW: 'Em análise', REVIEW_REQUIRED: 'Conciliação necessária', PAID: 'Pago', CANCELLED: 'Cancelado', REJECTED: 'Rejeitado', OPEN: 'Aberto', ANSWERED: 'Respondido', CLOSED: 'Encerrado' };
const num = (value: FormDataEntryValue | null) => Number(String(value ?? '').replace(',', '.'));
function AuditStatus({ value }: { value: string }) { return <span className={'badge ' + (['CONFIRMED', 'APPROVED', 'ACTIVE', 'PAID'].includes(value) ? 'badge-green' : ['PENDING', 'REVIEW', 'RESERVED'].includes(value) ? 'badge-warning' : '')}>{statusText[value] ?? value}</span>; }

export default function AdminPage({ data, refresh, notify }: PortalProps) {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [tab, setTab] = useState('rules');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ type: 'rule' | 'plan' | 'user'; value: ProductRule | Plan | User } | null>(null);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => { const value = await api<AdminData>('/admin/overview'); setAdmin(value); }, []);
  useEffect(() => { load().catch(e => setError((e as Error).message)); }, [load]);
  const action = async (path: string, body: unknown, method: 'post' | 'patch' = 'post') => {
    if (busy) return false;
    setBusy(true); setError('');
    try { await (method === 'post' ? post : patch)(path, { ...(body as Record<string, unknown>), totp: totp || undefined }); await load(); await refresh(); notify('Alteração registrada na auditoria.'); return true; }
    catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  };
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!editing) return;
    const f = new FormData(e.currentTarget);
    let body: Record<string, unknown>;
    if (editing.type === 'rule') body = { status: f.get('status'), enabled: f.get('enabled') === 'on', description: f.get('description') };
    else if (editing.type === 'plan') body = { priceCents: Math.round(num(f.get('price')) * 100), rateBps: Math.round(num(f.get('rate')) * 100), powerWeight: num(f.get('power')), status: f.get('status') };
    else {
      const user = editing.value as User;
      body = { name: f.get('name') };
      if (f.get('role') !== user.role) body.role = f.get('role');
      if ((f.get('blocked') === 'on') !== (user.status === 'BLOCKED')) body.blocked = f.get('blocked') === 'on';
    }
    const path = editing.type === 'rule' ? '/admin/rules/' : editing.type === 'plan' ? '/admin/plans/' : '/admin/users/';
    if (await action(path + editing.value.id, body, 'patch')) setEditing(null);
  };
  const coupon = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    if (await action('/admin/coupons', { code: String(f.get('code')).trim().toUpperCase(), discountBps: Math.round(num(f.get('discount')) * 100), maxUses: num(f.get('maxUses')), expiresAt: new Date(String(f.get('expires'))).toISOString() })) form.reset();
  };
  const sharing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await action('/admin/profit-sharing', { date: f.get('date'), rateBps: Math.round(num(f.get('rate')) * 100), idempotencyKey: 'profit-sharing:' + f.get('date') });
  };
  const closeCareer = (month: string) => action('/admin/career/close', { month, idempotencyKey: 'career-close:' + month });
  const answer = async (e: FormEvent<HTMLFormElement>, id: string) => { e.preventDefault(); const f = new FormData(e.currentTarget); await action('/admin/tickets/' + id, { reply: f.get('reply'), status: f.get('status') }, 'patch'); };

  return (
    <motion.div
      className="admin-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="page-heading" variants={fadeUp}>
        <div>
          <p className="eyebrow">AMNG / OPERATION CONTROL</p>
          <h1>Administração<span className="heading-dot">.</span></h1>
          <p>Configuração, atendimento e registro das decisões da operação.</p>
        </div>
        <button className="button button-secondary" onClick={() => load().catch(e => setError((e as Error).message))}>
          <RefreshCw size={15} />Atualizar dados
        </button>
      </motion.div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!admin ? (
        <div className="page-loading">
          <span className="loader-line" /><p>Carregando painel administrativo...</p>
        </div>
      ) : (
        <>
          <motion.div className="admin-totals" variants={staggerContainer(0.06)}>
            {[
              { label: 'Participantes', value: number(admin.totals.users), icon: Users },
              { label: 'Contratos', value: number(admin.totals.contracts), icon: Cpu },
              { label: 'Depósitos confirmados', value: money(admin.totals.depositsCents), icon: Wallet },
              { label: 'Pagamentos pendentes', value: number(admin.totals.pendingPayments), icon: Layers },
            ].map(k => (
              <motion.div className="panel" key={k.label} variants={scaleIn}>
                <span><k.icon size={14} /> {k.label}</span>
                <strong>{k.value}</strong>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="admin-mfa-bar" variants={fadeUp}>
            <LockKeyhole size={17} />
            <span>{data.mode === 'demo' ? 'Configurações isoladas da demonstração.' : 'Alterações sensíveis exigem seu autenticador.'}</span>
            {data.mode !== 'demo' && (
              <input
                aria-label="Código de dois fatores para administração"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={e => setTotp(e.target.value)}
                maxLength={6}
                pattern="[0-9]{6}"
              />
            )}
            <span className="badge">{data.mode === 'demo' ? 'SANDBOX' : 'AUDITORIA ATIVA'}</span>
          </motion.div>

          <motion.div className="admin-tabs" role="tablist" aria-label="Áreas da administração" variants={fadeUp}>
            {[
              ['rules', 'Regras'],
              ['plans', 'Planos & cupons'],
              ['users', 'Participantes'],
              ['finance', 'Financeiro'],
              ['support', 'Atendimento'],
              ['integrations', 'Integrações'],
              ['audit', 'Auditoria'],
            ].map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                aria-controls={'admin-' + id}
                id={'tab-' + id}
                key={id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </motion.div>

          <motion.div
            role="tabpanel"
            id={'admin-' + tab}
            aria-labelledby={'tab-' + tab}
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: dynamicEase }}
          >
            {tab === 'rules' && (
              <>
                <div className="pending-notice">
                  <ShieldCheck size={20} />
                  <p>Regras pendentes são preservadas como decisões operacionais. Alterar o estado de uma regra mantém as verificações de funding, termos e integrações do servidor. Contratos existentes preservam suas condições.</p>
                </div>
                <div className="admin-rule-grid">
                  {admin.rules.map(rule => (
                    <article className="panel admin-rule" key={rule.id}>
                      <header>
                        <h3>{rule.label}</h3>
                        <AuditStatus value={rule.status} />
                      </header>
                      <p>{rule.description}</p>
                      <small>{rule.source}</small>
                      <footer>
                        <span>{rule.enabled ? 'Habilitada no escopo' : 'Desabilitada no escopo'}</span>
                        <button className="button button-secondary" onClick={() => setEditing({ type: 'rule', value: rule })}>
                          Configurar <ArrowUpRight size={13} />
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              </>
            )}

            {tab === 'plans' && (
              <>
                <section className="panel">
                  <header className="panel-header">
                    <h2>Catálogo Cloud</h2>
                    <span className="badge">SNAPSHOTS DE CONTRATO</span>
                  </header>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Plano / modelo</th>
                          <th>Preço</th>
                          <th>Taxa / ciclo</th>
                          <th>Potência</th>
                          <th>Estado</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admin.plans.map(plan => (
                          <tr key={plan.id}>
                            <td><strong>{plan.name}</strong><br /><small>{plan.machine}</small></td>
                            <td>{money(plan.priceCents)}</td>
                            <td>{percent(plan.rateBps)}</td>
                            <td>{plan.powerWeight}</td>
                            <td><AuditStatus value={plan.status} /></td>
                            <td>
                              <button className="button button-secondary" onClick={() => setEditing({ type: 'plan', value: plan })}>
                                Editar <ArrowUpRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <div className="admin-two-col" style={{ marginTop: 22 }}>
                  <section className="panel">
                    <header className="panel-header">
                      <h2>Cupons promocionais</h2>
                      <span className="badge">{admin.coupons.length} ATIVOS / CADASTRADOS</span>
                    </header>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Desconto</th>
                            <th>Usos</th>
                            <th>Expira</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admin.coupons.map(c => (
                            <tr key={c.id}>
                              <td>{c.code}</td>
                              <td>{percent(c.discountBps)}</td>
                              <td>{c.uses} / {c.maxUses}</td>
                              <td>{date(c.expiresAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!admin.coupons.length && <div className="empty-state"><p>Nenhum cupom cadastrado.</p></div>}
                    </div>
                  </section>
                  <form className="panel admin-form-panel" onSubmit={coupon}>
                    <h2>Novo cupom</h2>
                    <div className="admin-form-grid">
                      <label className="field">Código<input name="code" required minLength={3} maxLength={32} placeholder="BLACKFRIDAY" /></label>
                      <label className="field">Desconto em %<input name="discount" type="number" min="0.01" max="50" step="0.01" required /></label>
                      <label className="field">Limite de usos<input name="maxUses" type="number" min="1" max="100000" required /></label>
                      <label className="field">Expiração local<input name="expires" type="datetime-local" required /></label>
                    </div>
                    <button className="button button-primary" disabled={busy}>Criar cupom <Plus size={15} /></button>
                    <p className="form-hint">Validade e uso são verificados pelo servidor. As campanhas de sexta podem usar cupons com limites explícitos.</p>
                  </form>
                </div>
              </>
            )}

            {tab === 'users' && (
              <section className="panel">
                <header className="panel-header">
                  <h2>Participantes</h2>
                  <input aria-label="Buscar participantes" style={{ maxWidth: 210 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou e-mail" />
                </header>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Perfil</th>
                        <th>Indicação</th>
                        <th>2FA</th>
                        <th>Estado</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.users.filter(u => (u.name + u.email).toLowerCase().includes(search.toLowerCase())).map(u => (
                        <tr key={u.id}>
                          <td><strong>{u.name}</strong><br /><small>{u.email}</small></td>
                          <td>{u.role === 'ADMIN' ? 'Administrador' : 'Participante'}</td>
                          <td className="mono">{u.referralCode}</td>
                          <td>{u.twoFactorEnabled ? 'Ativo' : 'Não configurado'}</td>
                          <td><AuditStatus value={u.status ?? 'ACTIVE'} /></td>
                          <td>
                            <button className="button button-secondary" onClick={() => setEditing({ type: 'user', value: u })}>
                              Gerenciar <ArrowUpRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === 'finance' && (
              <>
                <div className="admin-two-col">
                  <section className="panel admin-form-panel">
                    <h2>Fechamento de ciclos</h2>
                    <p className="muted" style={{ fontSize: 12, lineHeight: 1.8 }}>Processa somente ciclos vencidos. A mesma origem é creditada uma vez, com registro no ledger.</p>
                    <button className="button button-secondary" disabled={busy} onClick={() => action('/admin/process', {})} style={{ marginTop: 20 }}>
                      <RefreshCw size={15} />Processar vencimentos
                    </button>
                  </section>
                  <form className="panel admin-form-panel" onSubmit={sharing}>
                    <h2>Profit Sharing diário</h2>
                    <div className="admin-form-grid">
                      <label className="field">Data de competência<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                      <label className="field">Taxa documentada (%)<input name="rate" type="number" required defaultValue="0.90" min="0.90" max="1.10" step="0.01" /></label>
                    </div>
                    <button className="button button-primary" disabled={busy || data.mode !== 'demo'}>Registrar simulação <ArrowRight size={15} /></button>
                    <p className="form-hint">Base e funding reais aguardam definição operacional. Um registro por competência.</p>
                  </form>
                </div>
                <CareerClosingPanel isDemo={data.mode === 'demo'} busy={busy} onClose={closeCareer} />
                <section className="panel" style={{ marginTop: 22 }}>
                  <header className="panel-header">
                    <h2>Pagamentos e solicitações</h2>
                    <span className="badge">2PP</span>
                  </header>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Referência / participante</th>
                          <th>Tipo</th>
                          <th>Valor</th>
                          <th>Estado</th>
                          <th>Data</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admin.payments.map(p => (
                          <tr key={p.id}>
                            <td><strong>{p.userName}</strong><br /><small className="mono">{p.id.slice(-12)}</small></td>
                            <td>{p.type === 'DEPOSIT' ? 'Depósito' : p.type === 'WITHDRAWAL' ? 'Saque' : p.type}</td>
                            <td>{money(p.amountCents)}</td>
                            <td><AuditStatus value={p.status} /></td>
                            <td>{date(p.createdAt)}</td>
                            <td>
                              <div className="admin-row-actions">
                                {!['PAID', 'CONFIRMED', 'CANCELLED', 'REJECTED'].includes(p.status) && (
                                  <>
                                    <button className="button button-secondary" disabled={busy || data.mode !== 'demo'} onClick={() => action('/admin/payments/' + p.id, { status: 'PAID', reference: 'sandbox:' + p.id }, 'patch')}>
                                      Simular pagamento
                                    </button>
                                    <button className="button button-ghost" disabled={busy || data.mode !== 'demo'} onClick={() => action('/admin/payments/' + p.id, { status: 'REJECTED', reference: 'sandbox-cancel:' + p.id }, 'patch')}>
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!admin.payments.length && <div className="empty-state"><Wallet size={26} /><p>Nenhuma solicitação registrada neste escopo.</p></div>}
                  </div>
                </section>
              </>
            )}

            {tab === 'support' && (
              <section className="panel">
                <header className="panel-header">
                  <h2>Atendimento da operação</h2>
                  <span className="badge">{admin.tickets.length} CHAMADOS</span>
                </header>
                {admin.tickets.map(t => (
                  <article className="admin-ticket" key={t.id}>
                    <header>
                      <div>
                        <h3>{t.subject}</h3>
                        <small>{t.userName} · {date(t.createdAt)} · #{t.id.slice(-8)}</small>
                      </div>
                      <AuditStatus value={t.status} />
                    </header>
                    <p>{t.message}</p>
                    <form onSubmit={e => answer(e, t.id)}>
                      <textarea aria-label={'Resposta para ' + t.subject} name="reply" minLength={3} maxLength={4000} required defaultValue={t.reply ?? ''} placeholder="Resposta da equipe" />
                      <div className="admin-action-row">
                        <select name="status" aria-label="Estado do chamado" defaultValue={t.status === 'OPEN' ? 'ANSWERED' : t.status}>
                          <option value="ANSWERED">Respondido</option>
                          <option value="CLOSED">Encerrado</option>
                          <option value="OPEN">Aberto</option>
                        </select>
                        <button className="button button-primary" disabled={busy}>Salvar resposta <ArrowRight size={14} /></button>
                      </div>
                    </form>
                  </article>
                ))}
                {!admin.tickets.length && <div className="empty-state"><p>Nenhum chamado recebido.</p></div>}
              </section>
            )}

            {tab === 'integrations' && (
              <section className="panel">
                <header className="panel-header">
                  <h2>Fontes & provedores</h2>
                  <span className="badge">CONFIGURAÇÃO OPERACIONAL</span>
                </header>
                {admin.integrations.map(i => (
                  <article key={i.id} className="admin-integration-row">
                    <Layers size={20} />
                    <div>
                      <h3>{i.name}</h3>
                      <p>{i.description}</p>
                      <small>{i.updatedAt ? 'Última atualização: ' + date(i.updatedAt) : 'Aguardando configuração'}</small>
                    </div>
                    <span className={'badge ' + (i.status === 'CONNECTED' ? 'badge-green' : '')}>
                      {i.status === 'CONNECTED' ? 'Conectado' : i.status === 'ERROR' ? 'Sem conexão' : 'A configurar'}
                    </span>
                  </article>
                ))}
                <div className="pending-notice" style={{ margin: 20 }}>
                  <LockKeyhole size={18} />
                  <p>As credenciais ficam no ambiente do servidor. A configuração final da 2PP será feita com a documentação e as chaves do painel. O servidor distribui as cotações públicas da Binance.</p>
                </div>
              </section>
            )}

            {tab === 'audit' && (
              <section className="panel">
                <header className="panel-header">
                  <h2>Trilha de auditoria</h2>
                  <span className="badge">{admin.audit.length} REGISTROS</span>
                </header>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Responsável</th>
                        <th>Ação</th>
                        <th>Alvo</th>
                        <th>Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.audit.map(a => (
                        <tr key={a.id}>
                          <td>{new Date(a.createdAt).toLocaleString('pt-BR')}</td>
                          <td>{a.actor}</td>
                          <td className="mono">{a.action}</td>
                          <td className="mono">{a.target?.slice(-18)}</td>
                          <td className="admin-audit-detail">{a.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!admin.audit.length && <div className="empty-state"><p>A auditoria começa com as primeiras ações.</p></div>}
                </div>
              </section>
            )}
          </motion.div>
        </>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => { if (!busy) { setEditing(null); setError(''); } }}
        title={editing?.type === 'rule' ? 'Configurar regra' : editing?.type === 'plan' ? 'Editar plano' : 'Gerenciar participante'}
      >
        {editing && (
          <form onSubmit={save}>
            {editing.type === 'rule' ? (
              <>
                <h3 style={{ marginBottom: 18 }}>{(editing.value as ProductRule).label}</h3>
                <label className="field">Estado
                  <select name="status" defaultValue={(editing.value as ProductRule).status}>
                    <option value="PENDING">Pendente</option>
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="NOT_APPLICABLE">Não aplicável</option>
                  </select>
                </label>
                <label className="field">Descrição operacional
                  <textarea name="description" required minLength={10} maxLength={2000} defaultValue={(editing.value as ProductRule).description} />
                </label>
                <label className="checkbox-field">
                  <input type="checkbox" name="enabled" defaultChecked={(editing.value as ProductRule).enabled} />
                  <span>Habilitar no escopo atual. As condições do servidor continuam obrigatórias.</span>
                </label>
              </>
            ) : editing.type === 'plan' ? (
              <>
                <h3 style={{ marginBottom: 20 }}>{(editing.value as Plan).machine}</h3>
                <div className="admin-form-grid">
                  <label className="field">Preço (USD)
                    <input type="number" name="price" min="1" step="0.01" max="1000000" required defaultValue={(editing.value as Plan).priceCents / 100} />
                  </label>
                  <label className="field">Taxa / ciclo (%)
                    <input type="number" name="rate" min="0" max="5" step="0.01" required defaultValue={(editing.value as Plan).rateBps / 100} />
                  </label>
                  <label className="field">Potência
                    <input type="number" name="power" min="1" step="1" max="10000" required defaultValue={(editing.value as Plan).powerWeight} />
                  </label>
                  <label className="field">Estado
                    <select name="status" defaultValue={(editing.value as Plan).status}>
                      <option value="DOCUMENTED">Documentado</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="PAUSED">Pausado</option>
                    </select>
                  </label>
                </div>
                <p className="form-hint">A alteração vale para novos contratos. Os existentes mantêm seu snapshot original.</p>
              </>
            ) : (
              <>
                <label className="field">Nome
                  <input name="name" minLength={2} maxLength={80} required defaultValue={(editing.value as User).name} />
                </label>
                <label className="field">Perfil
                  <select name="role" defaultValue={(editing.value as User).role}>
                    <option value="MEMBER">Participante</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </label>
                <label className="checkbox-field">
                  <input name="blocked" type="checkbox" defaultChecked={(editing.value as User).status === 'BLOCKED'} />
                  <span>Bloquear o acesso desta conta</span>
                </label>
                <p className="form-hint">O patrocinador e os registros financeiros são preservados.</p>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary full-width" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar alteração'}<Check size={16} />
            </button>
          </form>
        )}
      </Dialog>
    </motion.div>
  );
}


