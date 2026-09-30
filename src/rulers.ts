import {createContextMenu} from './context-menu';

export function attachRulers(doc:Document,onHide?:()=>void){
 const win=doc.defaultView,frame=win?.frameElement as HTMLIFrameElement|null,stage=frame?.parentElement;if(!win||!frame||!stage)return()=>{};
 const outer=stage.ownerDocument,root=outer.createElement('div');root.dataset.webbitRulers='';root.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:3';stage.append(root);
 const strips=(['x','y'] as const).map(axis=>{const strip=outer.createElement('div');strip.dataset.webbitRuler=axis;strip.setAttribute('aria-label',axis==='x'?'Horizontal ruler':'Vertical ruler');strip.title='Right-click for ruler options';strip.style.cssText=`position:absolute;${axis==='x'?'top:-20px;left:0;height:20px':'left:-20px;top:0;width:20px'};background:#202637;color:#e8e4ff;border:1px solid #566079;overflow:hidden;font:10px Arial;pointer-events:auto`;root.append(strip);return strip;});
 const corner=outer.createElement('span');corner.dataset.webbitRuler='corner';corner.textContent='px';corner.title='Right-click for ruler options';corner.style.cssText='position:absolute;top:-20px;left:-20px;width:20px;height:20px;background:#202637;color:white;font:10px Arial;text-align:center;line-height:20px;pointer-events:auto';root.append(corner);
 // Positions use local CSS pixels; the preview parent applies magnification once.
 const draw=()=>{strips.forEach((strip,index)=>{strip.replaceChildren();const horizontal=index===0,offset=horizontal?win.scrollX:win.scrollY,length=horizontal?frame.clientWidth:frame.clientHeight;strip.style[horizontal?'width':'height']=length+'px';
  for(let value=Math.ceil(offset/10)*10;value<offset+length;value+=10){const major=value%100===0,mid=value%50===0,tick=outer.createElement('span');tick.style.cssText=`position:absolute;${horizontal?`left:${value-offset}px;bottom:0;width:1px;height:${major?9:mid?6:3}px`:`top:${value-offset}px;right:0;height:1px;width:${major?9:mid?6:3}px`};background:#b7b9ce;pointer-events:none`;strip.append(tick);if(major){const label=outer.createElement('span');label.textContent=String(value);label.style.cssText=`position:absolute;font:9px Arial;color:#eee;pointer-events:none;${horizontal?`left:${value-offset+3}px;top:1px`:`top:${value-offset+3}px;left:1px;writing-mode:vertical-rl`}`;strip.append(label);}}
 });};
 let menu:HTMLElement|null=null;
 const close=()=>{menu?.remove();menu=null;};
 const context=(event:MouseEvent)=>{if(!(event.target as Element).closest('[data-webbit-ruler]'))return;event.preventDefault();event.stopPropagation();close();const controls=createContextMenu(outer,outer.body,{x:event.clientX,y:event.clientY},'Ruler options');menu=controls.menu;menu.style.zIndex='2147483647';controls.add(menu,'Hide rulers',()=>{close();onHide?.();});controls.fit();menu.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});};
 const outside=(event:PointerEvent)=>{if(menu&&!menu.contains(event.target as Node))close();};
 const key=(event:KeyboardEvent)=>{if(menu&&event.key==='Escape'){event.preventDefault();close();}};
 root.addEventListener('contextmenu',context);outer.addEventListener('pointerdown',outside,true);outer.addEventListener('keydown',key);doc.addEventListener('pointerdown',close,true);
 draw();const observer=new ResizeObserver(draw);observer.observe(frame);win.addEventListener('scroll',draw,true);win.addEventListener('resize',draw);
 return()=>{close();observer.disconnect();root.remove();outer.removeEventListener('pointerdown',outside,true);outer.removeEventListener('keydown',key);doc.removeEventListener('pointerdown',close,true);win.removeEventListener('scroll',draw,true);win.removeEventListener('resize',draw);};
}
