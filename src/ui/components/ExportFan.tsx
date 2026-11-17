import { FileJson, FileSpreadsheet, Plus, Printer } from 'lucide-react';
import { useId } from 'react';
import { useT } from '../../i18n';

/** The checkbox owns expansion; CSS alone handles the fan, focus, and reduced motion. */
export function ExportFan({ disabled, onCsv, onJson }: { disabled:boolean; onCsv:()=>void; onJson:()=>void }) {
  const t = useT();
  const id = useId();
  return <div className="export-fan" role="group" aria-label={t('exportActions')}>
    <input id={id} type="checkbox" className="fan-toggle sr-only" aria-label={t('exportOptions')} aria-controls={`${id}-csv ${id}-json ${id}-print`} />
    <label htmlFor={id} className="fan-trigger" title={t('exportOptions')}>
      <Plus aria-hidden className="size-6" /><span className="fan-caption">{t('exportShort')}</span>
    </label>
    <button id={`${id}-csv`} type="button" className="fan-item" disabled={disabled} onClick={onCsv} aria-label={t('exportCsv')} title={t('exportCsv')}><FileSpreadsheet aria-hidden className="size-5" /><span>CSV</span></button>
    <button id={`${id}-json`} type="button" className="fan-item" disabled={disabled} onClick={onJson} aria-label={t('exportJson')} title={t('exportJson')}><FileJson aria-hidden className="size-5" /><span>JSON</span></button>
    <button id={`${id}-print`} type="button" className="fan-item" disabled={disabled} onClick={() => window.print()} aria-label={t('printTimeline')} title={t('printTimeline')}><Printer aria-hidden className="size-5" /><span>{t('printShort')}</span></button>
  </div>;
}
