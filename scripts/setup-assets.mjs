#!/usr/bin/env node
// Copies MediaPipe WASM into public/ and downloads the two model files once.
// Idempotent. Node 20+, no dependencies. Usage: node scripts/setup-assets.mjs [--if-missing]
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDst = join(root, 'public/mediapipe/wasm');
const modelsDst = join(root, 'public/models');
const ifMissing = process.argv.includes('--if-missing');

const MODELS = [
  {
    name: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  },
  {
    name: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },
];

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

function validateModel(name, buf) {
  if (buf.length <= 1024 * 1024) throw new Error(`${name}: too small (${buf.length} bytes)`);
  // Google's .task files are zips but may carry a few padding bytes before the
  // local-file-header signature (observed: 2 null bytes), so search the first 16 bytes.
  const sig = buf.subarray(0, 16).indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (sig < 0) throw new Error(`${name}: not a .task (zip) file`);
}

async function copyWasm() {
  if (!(await exists(wasmSrc))) {
    throw new Error('node_modules/@mediapipe/tasks-vision/wasm not found. Run `npm install` first.');
  }
  await mkdir(wasmDst, { recursive: true });
  const files = await readdir(wasmSrc);
  let copied = 0;
  for (const f of files) {
    const dst = join(wasmDst, f);
    const srcStat = await stat(join(wasmSrc, f));
    if (ifMissing && (await exists(dst)) && (await stat(dst)).size === srcStat.size) continue;
    await copyFile(join(wasmSrc, f), dst);
    copied++;
  }
  return { total: files.length, copied };
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureModel(model) {
  const dst = join(modelsDst, model.name);
  if (await exists(dst)) {
    const buf = await readFile(dst);
    try {
      validateModel(model.name, buf);
      if (ifMissing) return buf;
    } catch {
      // fall through and re-download
    }
  }
  let buf;
  try {
    buf = await download(model.url);
  } catch (err) {
    const fallback = model.url.replace('/1/', '/latest/');
    console.warn(`[setup] ${model.name}: ${err.message}; trying ${fallback}`);
    buf = await download(fallback);
  }
  validateModel(model.name, buf);
  await writeFile(dst, buf);
  console.log(`[setup] downloaded ${model.name} (${(buf.length / 1e6).toFixed(1)} MB)`);
  return buf;
}

async function main() {
  const wasm = await copyWasm();
  await mkdir(modelsDst, { recursive: true });
  const manifest = [];
  for (const m of MODELS) {
    const buf = await ensureModel(m);
    manifest.push({ name: m.name, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  }
  await writeFile(join(modelsDst, 'MANIFEST.json'), JSON.stringify({ models: manifest }, null, 2) + '\n');
  if (!ifMissing || wasm.copied > 0) console.log(`[setup] wasm: ${wasm.copied}/${wasm.total} files copied`);
  if (!ifMissing) console.log('[setup] assets ready in public/mediapipe and public/models');
}

main().catch((err) => {
  console.error(`\n[setup] FAILED: ${err.message}\nRun \`npm run setup\` with an internet connection (needed once).\n`);
  process.exit(1);
});
