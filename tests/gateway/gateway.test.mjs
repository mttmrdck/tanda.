import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGateway } from '../../.gateway-build/apps/edge-gateway/server.js';
import { initialSnapshot } from '../../.gateway-build/src/platform/contracts.js';

test('loopback gateway validates commands, enforces consent and authentication, persists events and reviews', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tanda-gateway-test-'));
  const token = 'test-only-not-a-real-secret-123456';
  const options = { token, file: join(dir, 'events.json'), origin: 'http://127.0.0.1:5173', individualId: 'p' };
  let g = await createGateway(options);
  const listen = async () => {
    await new Promise((resolve) => g.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${g.server.address().port}`;
  };
  let base = await listen();
  const request = (path, body, extra = {}) =>
    fetch(base + path, {
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra },
    });
  try {
    assert.equal((await fetch(base + '/snapshot')).status, 401);
    assert.equal((await request('/snapshot', null, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await request('/command', { action: 'start' })).status, 400);
    const care = initialSnapshot('p').care;
    care.consent = { video: true, authorityConfirmed: true, audio: false, reviewedAt: new Date().toISOString() };
    care.movementEnabled = true;
    care.baselineContextReviewed = true;
    assert.equal((await request('/command', { action: 'configure', care })).status, 200);
    assert.equal((await request('/command', { action: 'start' })).status, 200);
    assert.equal((await request('/command', { action: 'baseline' })).status, 200);
    const start = Date.parse('2026-11-17T10:00:00Z');
    for (let i = 0; i < 24; i++)
      assert.equal(
        (
          await request('/command', {
            action: 'sample',
            observation: {
              individualId: 'p',
              sourceId: 'camera-1',
              roomId: 'room-1',
              at: new Date(start + i * 1000).toISOString(),
              localHour: 10,
              quality: 'good',
              energy: i < 20 ? 0.2 : 3,
              sourceMode: 'simulated',
              reviewedContext: true,
            },
          })
        ).status,
        200,
      );
    let s = await (await request('/snapshot')).json();
    const event = s.events.find((e) => e.type === 'movement-deviation');
    assert.ok(event);
    assert.equal(event.simulated, true);
    assert.equal(
      (await request('/command', { action: 'review', id: event.id, review: 'acknowledge', note: 'Checked locally' }))
        .status,
      200,
    );
    assert.equal(
      (await request('/command', { action: 'sample', observation: { energy: 'not-a-number' } })).status,
      400,
    );
    await g.close();
    g = await createGateway(options);
    base = await listen();
    s = await (await request('/snapshot')).json();
    assert.equal(s.events.find((e) => e.id === event.id).status, 'acknowledged');
    assert.equal(s.health.gateway.state, 'stopped');
    assert.equal(s.health.gateway.remoteNotifications, 'unavailable');
  } finally {
    await g.close();
    await rm(dir, { recursive: true, force: true });
  }
});
