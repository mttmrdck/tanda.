import { useState } from 'react';
import { Activity, BookOpen } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SegmentedControl, Switch } from '../components/Controls';
import { Dialog } from '../components/Dialog';
import { SummaryStat } from '../components/SummaryStat';

/** Unlisted design review route; no profile, recognition or storage mutations. */
export default function Styleguide() {
  const [choice, setChoice] = useState('7d');
  const [on, setOn] = useState(true);
  const [sheet, setSheet] = useState(false);
  return <div className="space-y-6 py-8"><h1>Interface library</h1><p className="text-ink-muted">Tanda · System materials and controls</p>
    <Card><h2 className="text-xl">Type</h2><p className="mt-4 text-[34px] font-bold tracking-tight">A little more understanding.</p><p className="mt-4 text-[22px] font-semibold">Title · 22</p><p className="mt-2 text-[17px]">Body · 17</p><p className="mt-2 text-[13px] text-ink-muted">Footnote · 13</p></Card>
    <div className="grid grid-cols-2 gap-3"><SummaryStat label="Signals learned" value={8} detail="In your library" icon={BookOpen} /><SummaryStat label="Confirmed today" value={12} detail="On this device" icon={Activity} /></div>
    <Card className="space-y-5"><h2 className="text-xl">Controls</h2><SegmentedControl label="Period" value={choice} onChange={setChoice} options={[{ value:'7d',label:'7 days' },{value:'31d',label:'31 days'}]} /><Switch label="Show pose points" hint="A thin overlay in the camera view." checked={on} onChange={setOn} /><div className="flex flex-wrap gap-3"><Button onClick={() => setSheet(true)}>Open sheet</Button><Button variant="secondary">Secondary</Button><Button disabled>Disabled</Button></div></Card>
    <Card><h2 className="text-xl">Semantic states</h2><div className="mt-4 flex gap-3">{[['Calm','calm'],['Rising','rising'],['High','high']].map(([label,tone])=><span key={tone} style={{ color:`var(--${tone}-fg)`,background:`var(--${tone}-bg)` }} className="rounded-xl px-4 py-3">{label}</span>)}</div></Card>
    <Dialog open={sheet} onOpenChange={setSheet} sheet title="A familiar gesture" description="You decide what it means." footer={<Button onClick={() => setSheet(false)}>Done</Button>}><p className="mt-4">Sheets keep the current task in view, with a grabber and a clear close action.</p></Dialog>
  </div>;
}
