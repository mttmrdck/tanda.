/**
 * Benchmark metrics for isolated-sign recognition: confusion matrix (truth × prediction, with a "not sure"
 * column), per-sign precision and recall. Pure arithmetic; the UI labels who the clips came from.
 */
export const NOT_SURE = '∅';

export interface BenchItem {
  truth: string;
  /** null = the recogniser said "not sure" */
  pred: string | null;
}

export interface BenchResult {
  labels: string[];
  /** matrix[i][j]: truth labels[i] predicted as labels[j]; last column = not sure */
  matrix: number[][];
  perSign: { label: string; precision: number | null; recall: number | null; support: number }[];
  accuracy: number | null;
  notSureRate: number | null;
  total: number;
}

export function benchmark(labels: readonly string[], items: readonly BenchItem[]): BenchResult {
  const idx = new Map(labels.map((l, i) => [l, i]));
  const k = labels.length;
  const matrix = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  let correct = 0;
  let notSure = 0;
  let total = 0;
  for (const it of items) {
    const i = idx.get(it.truth);
    if (i === undefined) continue;
    total++;
    const j = it.pred === null ? k : (idx.get(it.pred) ?? k);
    matrix[i]![j]!++;
    if (j === i) correct++;
    if (j === k) notSure++;
  }
  const perSign = labels.map((label, i) => {
    const support = matrix[i]!.reduce((a, b) => a + b, 0);
    const predicted = matrix.reduce((a, row) => a + row[i]!, 0);
    const tp = matrix[i]![i]!;
    return { label, support, recall: support ? tp / support : null, precision: predicted ? tp / predicted : null };
  });
  return { labels: [...labels], matrix, perSign, accuracy: total ? correct / total : null, notSureRate: total ? notSure / total : null, total };
}

/** Parse a labels file: one `filename,gloss` per line (header and blank lines ignored). */
export function parseLabels(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const comma = t.indexOf(',');
    if (comma <= 0) continue;
    const file = t.slice(0, comma).trim();
    const gloss = t.slice(comma + 1).trim();
    if (file.toLowerCase() === 'filename' || !gloss) continue;
    out.set(file, gloss);
  }
  return out;
}
