// Shared WCAG 2.x contrast helpers (used by the CLI check and the unit test).
export function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export function checkTokens(tokens) {
  const rows = [];
  for (const theme of ['light', 'dim']) {
    for (const p of tokens.pairs) {
      const ratio = contrast(tokens[theme][p.fg], tokens[theme][p.bg]);
      rows.push({ theme, fg: p.fg, bg: p.bg, ratio: Math.round(ratio * 100) / 100, min: p.min, ok: ratio >= p.min });
    }
  }
  return rows;
}
