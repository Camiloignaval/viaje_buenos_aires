import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeState } from './connectedShell.js';
import { SessionStatus } from './sessionStore.js';

test('describeState en checking', () => {
  assert.deepEqual(describeState({ status: SessionStatus.CHECKING, user: null }), { mode: 'checking' });
});

test('describeState en anonymous', () => {
  assert.deepEqual(describeState({ status: SessionStatus.ANONYMOUS, user: null }), { mode: 'anonymous' });
});

test('describeState en authenticated expone el email del user', () => {
  const state = { status: SessionStatus.AUTHENTICATED, user: { id: '1', email: 'kari@example.com' } };
  assert.deepEqual(describeState(state), { mode: 'authenticated', email: 'kari@example.com' });
});
