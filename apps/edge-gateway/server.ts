import { createServer, type IncomingMessage } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { careSchema, initialSnapshot, observationSchema, snapshotSchema } from '../../src/platform/contracts.js';
import { MonitoringRuntime } from '../../src/platform/runtime.js';
import { SimulatedCameraAdapter } from '../../src/platform/adapters.js';

const command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('configure'), care: careSchema }),
  z.object({ action: z.enum(['start', 'stop', 'disconnect', 'baseline', 'reset']) }),
  z.object({ action: z.literal('sample'), observation: observationSchema }),
  z.object({
    action: z.literal('review'),
    id: z.string(),
    review: z.enum(['acknowledge', 'dismiss', 'note']),
    note: z.string().max(500),
  }),
]);
async function readBody(req: IncomingMessage): Promise<unknown> {
  let text = '';
  for await (const c of req) {
    text += String(c);
    if (Buffer.byteLength(text) > 65536) throw new Error('Request too large.');
  }
  return JSON.parse(text);
}
export async function createGateway(options: { token: string; file: string; origin: string; individualId: string }) {
  if (options.token.length < 24) throw new Error('Gateway token must contain at least 24 characters.');
  let snapshot = initialSnapshot(options.individualId);
  try {
    snapshot = snapshotSchema.parse(JSON.parse(await readFile(options.file, 'utf8')));
  } catch (e) {
    if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e;
  }
  const runtime = new MonitoringRuntime(snapshot, randomUUID);
  runtime.stop(); // A persisted running flag cannot prove camera availability after restart.
  const adapter = new SimulatedCameraAdapter();
  adapter.subscribe((o) => runtime.ingest(o));
  const persist = async () => {
    await mkdir(dirname(options.file), { recursive: true, mode: 0o700 });
    const temp = `${options.file}.next`;
    await writeFile(temp, JSON.stringify(runtime.snapshot()), { mode: 0o600 });
    await rename(temp, options.file);
  };
  let queue: Promise<unknown> = Promise.resolve();
  const server = createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && origin !== options.origin) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', options.origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.writeHead(204);
      res.end();
      return;
    }
    const expected = Buffer.from(`Bearer ${options.token}`),
      actual = Buffer.from(req.headers.authorization ?? '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.writeHead(401);
      res.end();
      return;
    }
    const task = queue
      .catch(() => undefined)
      .then(async () => {
        try {
          if (req.method === 'GET' && req.url === '/health') {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                service: 'tanda-edge',
                adapter: 'simulated',
                remoteNotifications: 'unavailable',
                audio: 'not-implemented',
              }),
            );
            return;
          }
          if (req.method === 'GET' && req.url === '/snapshot') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(runtime.snapshot()));
            return;
          }
          if (req.method !== 'POST' || req.url !== '/command') {
            res.writeHead(404);
            res.end();
            return;
          }
          const c = command.parse(await readBody(req));
          if (c.action === 'configure') runtime.configure(c.care);
          if (c.action === 'start') {
            await adapter.start();
            runtime.start(new Date().toISOString(), 'edge-simulation');
          }
          if (c.action === 'stop') {
            await adapter.stop();
            runtime.stop();
          }
          if (c.action === 'disconnect') {
            await adapter.stop();
            runtime.disconnect(new Date().toISOString());
          }
          if (c.action === 'baseline') runtime.beginBaseline();
          if (c.action === 'reset') runtime.resetDemo();
          if (c.action === 'sample') adapter.push(c.observation);
          if (c.action === 'review') runtime.review(c.id, c.review, c.note, new Date().toISOString());
          await persist();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(runtime.snapshot()));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid command, missing consent, or local persistence unavailable.' }));
        }
      });
    queue = task;
  });
  return {
    server,
    close: async () => {
      await adapter.stop();
      await queue.catch(() => undefined);
      await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.TANDA_GATEWAY_TOKEN ?? '';
  const port = Number(process.env.TANDA_GATEWAY_PORT ?? 4321);
  const gateway = await createGateway({
    token,
    file: process.env.TANDA_GATEWAY_FILE ?? '.tanda-gateway/events.json',
    origin: process.env.TANDA_WEB_ORIGIN ?? 'http://127.0.0.1:5173',
    individualId: 'individual-1',
  });
  gateway.server.listen(port, '127.0.0.1');
  const close = () => {
    void gateway.close().then(() => process.exit(0));
  };
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}
