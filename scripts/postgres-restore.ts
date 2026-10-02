import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { postgresDatabase, type Database } from '../server/database.ts';
import { migrate } from '../server/schema.ts';
import { seedCatalog } from '../server/catalog.ts';
import { createDemo } from '../server/fixtures.ts';
import { activate, deposit, pauseCycle, purchase, resumeCycle } from '../server/finance.ts';
import { createApplication } from '../server/app.ts';
import { TEST_CONFIG } from '../tests/helpers.ts';

const exec = promisify(execFile);
const connectionString = process.env.AMNG_TEST_POSTGRES_URL;
const bin = process.env.AMNG_TEST_POSTGRES_BIN;
const directory = process.env.AMNG_TEST_POSTGRES_DIR;
if (!connectionString || !bin || !directory) throw new Error('Run this acceptance through npm run test:postgres.');
const url = new URL(connectionString);
if (url.hostname !== '127.0.0.1' || url.pathname !== '/amng_test') throw new Error('Acceptance requires the disposable local test cluster');
const runtimeRoot = resolve('.amng-runtime');
if (!resolve(directory).startsWith(runtimeRoot + sep)) throw new Error('Backup must stay within the test runtime');
const dump = join(directory, 'acceptance.dump');
const common = ['-h', url.hostname, '-p', url.port, '-U', decodeURIComponent(url.username)];
const run = (name: string, args: string[]) => exec(join(bin, name + (process.platform === 'win32' ? '.exe' : '')), args, {
  env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) }, windowsHide: true, timeout: 60_000, maxBuffer: 2_000_000,
});

async function snapshot(db: Database) {
  const tables = await db.all("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const result: Record<string, { count: number; digest: string }> = {};
  for (const table of tables) {
    const name = String(table.tablename);
    if (!/^[a-z_]+$/.test(name)) throw new Error('Unexpected table identifier');
    const rows = await db.all(`SELECT row_to_json(t) AS value FROM "${name}" t`);
    const contents = rows.map(row => JSON.stringify(row.value)).sort().join('\n');
    result[name] = { count: rows.length, digest: createHash('sha256').update(contents).digest('hex') };
  }
  return result;
}

const source = postgresDatabase(connectionString);
let restored: Database | undefined;
try {
  await migrate(source);
  await source.transaction(tx => seedCatalog(tx));
  const user = await source.transaction(tx => createDemo(tx));
  await source.transaction(tx => deposit(tx, user, { amountCents: 10_000, idempotencyKey: 'restore-deposit-01' }));
  const contractId = await source.transaction(tx => purchase(tx, user, { planId: 'sc', idempotencyKey: 'restore-purchase-01' }));
  await source.transaction(tx => activate(tx, user, contractId));
  await source.transaction(tx => pauseCycle(tx, user, contractId));
  await source.transaction(tx => resumeCycle(tx, user, contractId));
  const before = await snapshot(source);
  assert.ok(before.ledger_entries.count > 0);
  assert.ok(before.career_funding.count > 0);
  await run('pg_dump', [...common, '-d', 'amng_test', '--format=custom', '--file=' + dump]);
  await run('createdb', [...common, 'amng_test_restore']);
  await run('pg_restore', [...common, '-d', 'amng_test_restore', '--exit-on-error', dump]);
  url.pathname = '/amng_test_restore';
  restored = postgresDatabase(url.toString());
  assert.deepEqual(await snapshot(restored), before, 'Every table must preserve its rows and content');
  await migrate(restored);
  assert.deepEqual(await snapshot(restored), before, 'Repeated migrations must not rewrite restored records');
  assert.equal((await restored.get('SELECT COUNT(*) AS unbalanced FROM (SELECT journal_id FROM accounting_lines GROUP BY journal_id HAVING SUM(amount_cents)<>0) AS journals'))?.unbalanced, 0);
  await assert.rejects(restored.run('UPDATE ledger_entries SET amount_cents=1 WHERE user_id=?', [String(user.id)]));
  await assert.rejects(restored.run('DELETE FROM accounting_journals WHERE scope=?', [String(user.scope)]));
  assert.deepEqual(await snapshot(restored), before, 'Immutability must survive a backup restoration');
  console.log(`PostgreSQL backup/restoration passed: ${Object.keys(before).length} tables match, balanced journals and immutable ledger preserved.`);

  // This uses the production application gates against the disposable restored database.
  // No production destination, TLS proxy, SMTP or external provider is contacted.
  const runtime = await createApplication({ ...TEST_CONFIG, production: true, demoEnabled: false, origin: 'https://amng-test.invalid' }, { db: restored });
  restored = undefined; // runtime now owns the connection.
  const server = runtime.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(address + '/api/health')).status, 200);
    const response = await fetch(address + '/api/bootstrap');
    const data = await response.json() as { csrfToken: string; user: unknown };
    assert.equal(data.user, null);
    const cookie = response.headers.getSetCookie()[0];
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('Secure'));
    assert.ok(cookie.includes('SameSite=Lax'));
    const demo = await fetch(address + '/api/auth/demo', { method: 'POST', headers: { Cookie: cookie.split(';')[0], 'X-CSRF-Token': data.csrfToken, Origin: 'https://amng-test.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(demo.status, 404);
    const page = await fetch(address + '/app/miners');
    assert.equal(page.status, 200);
    assert.ok(page.headers.get('content-security-policy'));
    console.log('Production application gates passed against PostgreSQL: health, secure session cookie, demo disabled, SPA and CSP.');
  } finally {
    await new Promise<void>((accept, reject) => server.close(error => error ? reject(error) : accept()));
    await runtime.close();
  }
} finally {
  await source.close();
  await restored?.close();
}
