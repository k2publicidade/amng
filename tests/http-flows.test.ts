import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApplication } from '../server/app.ts';
import type { BootstrapData, MinerStatementData } from '../shared/types.ts';
import { database, TEST_CONFIG } from './helpers.ts';

test('HTTP acceptance with isolated sessions and a disposable database', async t => {
  const resetLinks: string[] = [];
  const runtime = await createApplication(TEST_CONFIG, { db: await database(), sendReset: async (_email, url) => { resetLinks.push(url); } });
  const server = runtime.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  class Client {
    cookie = '';
    csrf = '';
    async request<T = { code: string }>(path: string, method = 'GET', payload?: unknown, headers: Record<string, string> = {}) {
      const response = await fetch(origin + '/api' + path, {
        method, headers: { 'Content-Type': 'application/json', Cookie: this.cookie, 'X-CSRF-Token': this.csrf, Origin: TEST_CONFIG.origin, ...headers },
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      const cookie = response.headers.getSetCookie()[0];
      if (cookie) this.cookie = cookie.split(';')[0];
      const body = await response.json() as T;
      const token = (body as { csrfToken?: string }).csrfToken;
      if (token) this.csrf = token;
      return { response, body };
    }
    async bootstrap() { return (await this.request<BootstrapData>('/bootstrap')).body; }
    async demo() { await this.bootstrap(); return (await this.request<BootstrapData>('/auth/demo', 'POST', {})).body; }
  }
  try {
    await t.test('sessions require CSRF and reject a foreign origin', async () => {
      const client = new Client();
      const anonymous = await client.bootstrap();
      assert.equal(anonymous.user, null);
      assert.ok(client.cookie);
      const noCsrf = await client.request('/auth/demo', 'POST', {}, { 'X-CSRF-Token': '' });
      assert.equal(noCsrf.response.status, 403);
      assert.equal(noCsrf.body.code, 'CSRF_INVALID');
      const foreign = await client.request('/auth/demo', 'POST', {}, { Origin: 'https://untrusted.invalid' });
      assert.equal(foreign.response.status, 403);
      assert.equal(foreign.body.code, 'ORIGIN_REJECTED');
    });
    await t.test('private demonstrations cannot operate or read another session machine', async () => {
      const first = new Client(), second = new Client();
      const a = await first.demo(), b = await second.demo();
      assert.notEqual(a.user?.id, b.user?.id);
      assert.ok(a.miners.every(m => !b.miners.some(other => other.id === m.id)));
      const foreign = await second.request(`/miners/${a.miners[0].id}/activate`, 'POST', { idempotencyKey: 'foreign-cycle-01' });
      assert.equal(foreign.response.status, 404);
      const statement = await second.request(`/miners/${a.miners[0].id}/statement`);
      assert.equal(statement.response.status, 404);
    });
    await t.test('activation replay, pause and resume preserve one confirmed cycle across HTTP', async () => {
      const client = new Client();
      const data = await client.demo();
      const miner = data.miners.find(m => m.status === 'READY')!;
      assert.ok(miner);
      const activate = () => client.request<BootstrapData>(`/miners/${miner.id}/activate`, 'POST', { idempotencyKey: 'activate-http-01' });
      const [first, replay] = await Promise.all([activate(), activate()]);
      assert.equal(first.response.status, 200);
      assert.equal(replay.response.status, 200);
      const find = (value: BootstrapData) => value.miners.find(m => m.id === miner.id)!;
      assert.equal(find(first.body).status, 'MINING');
      assert.equal(find(first.body).cycleEndsAt, find(replay.body).cycleEndsAt);
      const paused = await client.request<BootstrapData>(`/miners/${miner.id}/pause`, 'POST', { idempotencyKey: 'pause-http-01' });
      assert.equal(find(paused.body).status, 'PAUSED');
      assert.ok(find(paused.body).pausedAt);
      assert.equal(find(await client.bootstrap()).pausedAt, find(paused.body).pausedAt);
      const resumed = await client.request<BootstrapData>(`/miners/${miner.id}/resume`, 'POST', { idempotencyKey: 'resume-http-01' });
      assert.equal(find(resumed.body).status, 'MINING');
      assert.equal(find(resumed.body).pausedAt, null);
      const cycles = await runtime.db.get('SELECT COUNT(*) AS total FROM mining_cycles WHERE contract_id=? AND settled_at IS NULL', [miner.id]);
      assert.equal(cycles?.total, 1);
      const statement = await client.request<MinerStatementData>(`/miners/${miner.id}/statement?days=7&page=1`);
      assert.equal(statement.response.status, 200);
      assert.equal(statement.body.period.days, 7);
      assert.equal(statement.body.productionHistory.length, 7);
      assert.equal(statement.body.confirmedOnly, true);
    });
    const real = new Client();
    const email = 'http-acceptance@example.invalid';
    const password = 'Test-only-password-2026';
    await t.test('new real accounts have no money, cannot escalate role or bypass financial gates', async () => {
      await real.bootstrap();
      const registered = await real.request<BootstrapData>('/auth/register', 'POST', { name: 'HTTP Acceptance', email, password, termsAccepted: true });
      assert.equal(registered.response.status, 201);
      assert.equal(registered.body.user?.role, 'MEMBER');
      assert.equal(registered.body.miners.length, 0);
      assert.ok(registered.body.wallets.every(w => w.balanceCents === 0));
      for (const secret of ['password_hash', 'mfa_secret', 'sessionSecret', 'twoPpApiKey']) assert.ok(!JSON.stringify(registered.body).includes(secret));
      assert.equal((await real.request('/admin/overview')).response.status, 403);
      assert.equal((await real.request('/profile', 'PATCH', { name: 'HTTP Acceptance', role: 'ADMIN' })).response.status, 422);
      for (const [path, payload] of [
        ['/wallets/deposits', { amountCents: 1000, idempotencyKey: 'real-deposit-01' }],
        ['/wallets/withdrawals', { wallet: 'earnings', amountCents: 1000, idempotencyKey: 'real-withdraw-01' }],
        ['/orders', { planId: 'sc', idempotencyKey: 'real-purchase-01' }],
      ] as const) {
        const result = await real.request(path, 'POST', payload);
        assert.equal(result.response.status, 409);
        assert.ok(['RULE_PENDING', 'INTEGRATION_REQUIRED'].includes(result.body.code));
      }
      assert.ok((await real.bootstrap()).wallets.every(w => w.balanceCents === 0));
      const webhook = await real.request('/payments/2pp/webhook', 'POST', { status: 'CONFIRMED', amountCents: 1000 });
      assert.equal(webhook.response.status, 503);
      assert.equal(webhook.body.code, 'PROVIDER_CONTRACT_PENDING');
    });
    await t.test('password reset revokes active sessions and every older reset link', async () => {
      const recovery = new Client();
      await recovery.bootstrap();
      await recovery.request('/auth/reset-request', 'POST', { email });
      await recovery.request('/auth/reset-request', 'POST', { email });
      assert.equal(resetLinks.length, 2);
      const token = (index: number) => new URL(resetLinks[index]).searchParams.get('token');
      const result = await recovery.request('/auth/reset-confirm', 'POST', { token: token(0), newPassword: 'Changed-test-password-2026' });
      assert.equal(result.response.status, 200);
      assert.equal((await real.bootstrap()).user, null);
      const reused = await recovery.request('/auth/reset-confirm', 'POST', { token: token(1), newPassword: 'Another-test-password-2026' });
      assert.equal(reused.response.status, 409);
      assert.equal(reused.body.code, 'RESET_EXPIRED');
      const login = await recovery.request<BootstrapData>('/auth/login', 'POST', { email, password: 'Changed-test-password-2026' });
      assert.equal(login.response.status, 200);
      assert.equal(login.body.user?.email, email);
      await recovery.request('/auth/logout', 'POST', {});
      assert.equal((await recovery.bootstrap()).user, null);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await runtime.close();
  }
});
