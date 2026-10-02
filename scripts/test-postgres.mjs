import { execFile, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { dirname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.AMNG_POSTGRES_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
const executable = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
if (!bin || !existsSync(executable('initdb'))) throw new Error('Set AMNG_POSTGRES_BIN to the installed PostgreSQL 17 bin directory. No installation or existing database is modified.');
const runtimeRoot = resolve(workspace, '.amng-runtime');
const directory = resolve(runtimeRoot, `postgres-test-${randomUUID()}`);
if (!directory.startsWith(runtimeRoot + sep)) throw new Error('Invalid temporary cluster path');
const cluster = join(directory, 'cluster');
const passwordFile = join(directory, 'password');
const password = randomBytes(32).toString('hex');
const env = { ...process.env, PGPASSWORD: password };
const port = await new Promise((accept, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    probe.close(error => error ? reject(error) : accept(address.port));
  });
});
await mkdir(directory, { recursive: true });
await writeFile(passwordFile, password, { mode: 0o600, flag: 'wx' });
let started = false;
let stopped = false;
const run = (name, args) => exec(executable(name), args, { env, cwd: workspace, windowsHide: true, timeout: 60_000, maxBuffer: 2_000_000 });
const child = args => new Promise((accept, reject) => {
  const childProcess = spawn(process.execPath, args, { cwd: workspace, env, windowsHide: true, stdio: 'inherit' });
  childProcess.once('error', reject);
  childProcess.once('exit', code => code === 0 ? accept() : reject(new Error(`PostgreSQL acceptance exited with code ${code}`)));
});
try {
  console.log('Preparing disposable PostgreSQL cluster on loopback...');
  await run('initdb', ['-D', cluster, '-U', 'amng_test', '--auth=scram-sha-256', '--pwfile=' + passwordFile, '--encoding=UTF8', '--no-locale']);
  started = true;
  await run('pg_ctl', ['-D', cluster, '-l', join(directory, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c max_connections=50`, '-w', 'start']);
  await run('createdb', ['-h', '127.0.0.1', '-p', String(port), '-U', 'amng_test', 'amng_test']);
  env.AMNG_TEST_POSTGRES_URL = `postgresql://amng_test:${password}@127.0.0.1:${port}/amng_test`;
  env.AMNG_TEST_POSTGRES_BIN = bin;
  env.AMNG_TEST_POSTGRES_DIR = directory;
  const tests = (await readdir(join(workspace, 'tests'))).filter(name => name.endsWith('.test.ts')).map(name => join('tests', name));
  await child(['--import', 'tsx', '--test', ...tests]);
  await child(['--import', 'tsx', 'scripts/postgres-restore.ts']);
} finally {
  if (started) {
    try { await run('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop']); stopped = true; }
    catch { console.error('Temporary PostgreSQL cluster could not be stopped. Its files were preserved under .amng-runtime.'); process.exitCode = 1; }
  } else stopped = true;
  if (stopped) {
    await rm(directory, { recursive: true, force: true });
    console.log('Disposable cluster and its credentials removed. Existing databases were untouched.');
  }
}
