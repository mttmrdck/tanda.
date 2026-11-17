import { Laptop, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { useT } from '../../i18n';

type Appearance = 'light' | 'dim' | 'system';
/** Sun/moon selection inspired by Colorion, with the existing Match device option preserved. */
export function AppearanceControl({ value, onChange }: { value:Appearance; onChange:(value:Appearance)=>void }) {
  const t = useT();
  const id = useId();
  return <fieldset><legend className="mb-3 font-semibold">{t('themeLabel')}</legend><div className="appearance-control">
    {([{value:'light',label:'themeLight',Icon:Sun},{value:'dim',label:'themeDim',Icon:Moon},{value:'system',label:'themeSystem',Icon:Laptop}] as const).map(({value:choice,label,Icon})=><label key={choice} className="appearance-choice"><input type="radio" name={id} value={choice} checked={value===choice} onChange={()=>onChange(choice)}/><Icon aria-hidden className="size-5"/><span>{t(label)}</span></label>)}
  </div></fieldset>;
}
