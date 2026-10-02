import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { readConfig } from '../server/config.ts';

test('in-memory development uses an ephemeral session secret without writing a workspace credential', () => {
  const names = ['NODE_ENV', 'SQLITE_PATH', 'SESSION_SECRET'] as const;
  const previous = names.map(name => process.env[name]);
  const existed = existsSync(resolve('.session-secret'));
  try {
    process.env.NODE_ENV = 'development';
    process.env.SQLITE_PATH = ':memory:';
    process.env.SESSION_SECRET = '';
    const first = readConfig(), second = readConfig();
    assert.ok(first.sessionSecret.length >= 32);
    assert.notEqual(first.sessionSecret, second.sessionSecret);
    assert.equal(existsSync(resolve('.session-secret')), existed);
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
