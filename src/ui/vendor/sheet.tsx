/** EasyUI Sheet drag/spring, adapted to compose with Radix's focus-managed dialog. */
import { forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps, type DragControls } from 'motion/react';
interface SheetSurfaceProps extends HTMLMotionProps<'div'> { sheet:boolean; expanded:boolean; controls:DragControls; onDismiss:()=>void; }
export const SheetSurface = forwardRef<HTMLDivElement,SheetSurfaceProps>(function SheetSurface({ sheet, expanded, controls, onDismiss, ...props },ref) {
  const reduce = useReducedMotion();
  return <motion.div ref={ref} initial={reduce?{opacity:0}:sheet?{y:'100%',opacity:1}:{opacity:0,scale:0.97}} animate={{y:0,opacity:1,scale:1}} transition={{type:'spring',stiffness:360,damping:34}} drag={sheet?'y':false} dragListener={false} dragControls={controls} dragConstraints={{top:0,bottom:0}} dragElastic={{top:0.05,bottom:0.5}} onDragEnd={(_,info)=>{if(info.offset.y>90||info.velocity.y>500)onDismiss();}} style={sheet?{maxHeight:expanded?'90dvh':'65dvh'}:undefined} {...props} />;
});
