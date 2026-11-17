/** EasyUI Data Table adapted to a quiet grouped history list. No selection or bulk actions. */
import type { ReactNode } from 'react';
export interface DataTableColumn<T> { key: string; header: string; cell: (row:T) => ReactNode; }
export function DataTable<T extends {id:string}>({ rows, columns, ariaLabel }: { rows:T[]; columns:DataTableColumn<T>[]; ariaLabel:string }) {
  return <table className="history-list w-full text-left" aria-label={ariaLabel} data-testid="events-table"><thead><tr>{columns.map(c=><th key={c.key} className="py-3 pr-3 text-sm font-normal text-ink-muted">{c.header}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}>{columns.map(c=><td key={c.key} className="py-4 pr-3">{c.cell(row)}</td>)}</tr>)}</tbody></table>;
}
