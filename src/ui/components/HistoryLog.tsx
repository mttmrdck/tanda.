import type { EventRecord } from '../../engine/types';
import { useT, type Lang } from '../../i18n';
import { DataTable } from '../vendor/data-table';
import { timeOfDay } from './format';
import { ConfidenceBar, FeedbackState, SimulatedTag, tierLabel } from './LiveBits';
export function HistoryLog({ events, name, lang }: { events:EventRecord[]; name:(id?:string)=>string; lang:Lang }) {
  const t = useT();
  return <DataTable rows={[...events].reverse()} ariaLabel={t('eventsTitle')} columns={[
    {key:'time',header:t('colTime'),cell:e=><time dateTime={e.ts} className="tabular text-sm text-ink-muted">{timeOfDay(e.ts,lang)}</time>},
    {key:'event',header:t('colEvent'),cell:e=><span className="flex flex-col items-start gap-1"><span className="font-semibold">{e.kind==='signal'?name(e.signalId):t('eventTier',{tier:t(tierLabel(e.tier??'calm'))})}</span>{e.source==='demo'&&<SimulatedTag/>}{e.note&&<span className="caregiver-note text-sm">{t('mvYourNote')}: {e.note}</span>}</span>},
    {key:'confidence',header:t('colConfidence'),cell:e=>e.kind==='signal'&&e.confidence!==undefined?<ConfidenceBar confidence={e.confidence} compact/>:'—'},
    {key:'feedback',header:t('colFeedback'),cell:e=>e.kind==='signal'?<FeedbackState fb={e.feedback}/>:'—'},
  ]}/>;
}
