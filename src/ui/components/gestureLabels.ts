import type { GestureName } from '../../engine/simulator';
import type { MsgKey } from '../../i18n';

/** Demo-performer gesture → its button label. */
export const GESTURE_LABEL: Record<GestureName, MsgKey> = {
  wave: 'gWave',
  handToMouth: 'gHandToMouth',
  coverEars: 'gCoverEars',
  armsUp: 'gArmsUp',
  pointRight: 'gPointRight',
  tapTable: 'gTapTable',
  rock: 'gRock',
  flap: 'gFlap',
  idle: 'gIdle',
  flail: 'gFlap',
  squeeze: 'gSqueeze',
  shapeOpen: 'gShapeOpen',
  shapeFist: 'gShapeFist',
  shapePoint: 'gShapePoint',
  shapeThumb: 'gShapeThumb',
};
