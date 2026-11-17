#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { checkTokens } from './contrast.mjs';

const tokens = JSON.parse(await readFile(new URL('../src/ui/theme/tokens.json', import.meta.url), 'utf8'));
const rows = checkTokens(tokens);
const bad = rows.filter((r) => !r.ok);
for (const r of rows) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.theme.padEnd(5)} ${r.fg.padEnd(12)} on ${r.bg.padEnd(12)} ${r.ratio.toFixed(2).padStart(5)} (min ${r.min})`);
}
if (bad.length) {
  console.error(`\n${bad.length} contrast pairing(s) below threshold.`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} pairings pass.`);
