/** EasyUI PressButton, adapted to a native button and the shared 0.97 press treatment. */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
export const PressButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function PressButton(props, ref) {
  return <button ref={ref} {...props} />;
});
