import { Eye } from 'lucide-react';
import type { GuessHand, GuessHeight, HandShapeName } from '../../engine/guess';
import type { Sighting } from '../../engine/recognizer';
import { useT, type MsgKey, type TFn } from '../../i18n';
import { Button } from './Button';
import { Card } from './Card';

const HAND: Record<GuessHand, MsgKey> = { left: 'sightHandLeft', right: 'sightHandRight', both: 'sightHandBoth' };
const SHAPE: Record<HandShapeName, MsgKey> = {
  open: 'sightShapeOpen',
  fist: 'sightShapeFist',
  point: 'sightShapePoint',
  thumbsUp: 'sightShapeThumbsUp',
  changing: 'sightShapeChanging',
};
const HEIGHT: Record<GuessHeight, MsgKey> = { high: 'sightHeightHigh', mid: 'sightHeightMid', low: 'sightHeightLow' };

/** "Right hand · pointing finger · at chest height" */
export function describeSighting(s: Pick<Sighting, 'hand' | 'shape' | 'height'>, t: TFn): string {
  return [t(HAND[s.hand]), t(SHAPE[s.shape]), t(HEIGHT[s.height])].join(' · ');
}

/** Shown on Live when the child moves but no taught signal matches. Describes; never assigns a meaning. */
export function SightingCard({ sighting, onTeach }: { sighting: Sighting; onTeach: () => void }) {
  const t = useT();
  return (
    <Card aria-labelledby="sight-h" data-testid="sighting-card" className="live-sighting space-y-3">
      <h2 id="sight-h" className="flex items-center gap-2 text-lg">
        <Eye aria-hidden className="size-5 shrink-0 text-ink-muted" />
        {t('sightTitle')}
      </h2>
      <div>
        <p className="text-sm text-ink-muted">{t('sightLooksLike')}</p>
        <p className="text-lg font-bold" data-testid="sighting-text">
          {describeSighting(sighting, t)}
        </p>
      </div>
      <p className="text-ink-muted">{t('sightHint')}</p>
      <Button size="lg" className="w-full" onClick={onTeach}>
        {t('sightTeach')}
      </Button>
    </Card>
  );
}
