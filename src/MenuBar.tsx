import React,{useEffect,useRef,useState} from 'react';

export type MenuAction={label:string;shortcut?:string;disabled?:boolean;checked?:boolean;action:()=>void};
export type MenuGroup={label:string;items:(MenuAction|null)[]};

/** Desktop-style menus with keyboard navigation and focus returned to the editor. */
export function MenuBar({groups,disabled=false}:{groups:MenuGroup[];disabled?:boolean}){
  const [open,setOpen]=useState<number|null>(null);
  const bar=useRef<HTMLDivElement>(null);
  const priorFocus=useRef<HTMLElement|null>(null);
  const triggers=()=>Array.from(bar.current?.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]')??[]);
  const commands=()=>Array.from(bar.current?.querySelectorAll<HTMLButtonElement>('[data-menu-command]:not(:disabled)')??[]);
  const close=(restore=false)=>{setOpen(null);if(restore)priorFocus.current?.focus();};
  const show=(index:number)=>{
    if(open===null&&document.activeElement instanceof HTMLElement&&!bar.current?.contains(document.activeElement))priorFocus.current=document.activeElement;
    setOpen(index);
  };
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(!bar.current?.contains(event.target as Node))setOpen(null);};
    const blur=()=>setOpen(null);
    document.addEventListener('pointerdown',outside);window.addEventListener('blur',blur);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>{if(disabled)setOpen(null);},[disabled]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(disabled)return;
      if(event.key==='F10'&&!event.shiftKey){event.preventDefault();triggers()[0]?.focus();}
      if(event.altKey&&!event.ctrlKey&&!event.metaKey){const index=groups.findIndex(g=>g.label[0].toLowerCase()===event.key.toLowerCase());if(index>=0){event.preventDefault();show(index);requestAnimationFrame(()=>commands()[0]?.focus());}}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  const moveMenu=(index:number)=>{const next=(index+groups.length)%groups.length;show(next);triggers()[next]?.focus();requestAnimationFrame(()=>commands()[0]?.focus());};
  return <div className="menu-bar" role="menubar" aria-label="Application menu" ref={bar}>
    {groups.map((group,index)=><div className="menu-group" key={group.label}>
      <button data-menu-trigger role="menuitem" aria-haspopup="menu" aria-expanded={open===index} aria-controls={`menu-${index}`} disabled={disabled} className={open===index?'menu-trigger active':'menu-trigger'}
        onPointerDown={()=>{if(open===null&&document.activeElement instanceof HTMLElement)priorFocus.current=document.activeElement;}}
        onClick={()=>open===index?close(true):show(index)} onPointerEnter={()=>{if(open!==null)setOpen(index);}}
        onKeyDown={event=>{
          if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){event.preventDefault();show(index);requestAnimationFrame(()=>{const items=commands();items[event.key==='ArrowUp'?items.length-1:0]?.focus();});}
          else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(index+(event.key==='ArrowRight'?1:-1)+groups.length)%groups.length;triggers()[next]?.focus();if(open!==null)setOpen(next);}
          else if(event.key==='Escape'){event.preventDefault();close(true);}
        }}>{group.label}</button>
      {open===index&&<div className="menu-popup" id={`menu-${index}`} role="menu" aria-label={group.label} onKeyDown={event=>{
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();const items=commands(),current=items.indexOf(document.activeElement as HTMLButtonElement);
          const next=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
        }else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveMenu(index+(event.key==='ArrowRight'?1:-1));}
        else if(event.key==='Escape'){event.preventDefault();setOpen(null);triggers()[index]?.focus();}
        else if(event.key==='Tab'){setOpen(null);triggers()[index]?.focus();}
      }}>
        {group.items.map((item,itemIndex)=>item?<button key={item.label} data-menu-command role={item.checked===undefined?'menuitem':'menuitemcheckbox'} aria-checked={item.checked} disabled={item.disabled} onClick={()=>{close(true);item.action();}}>
          <span className="menu-check" aria-hidden="true">{item.checked?'✓':''}</span><span>{item.label}</span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}
        </button>:<div key={`separator-${itemIndex}`} role="separator" className="menu-separator"/>)}
      </div>}
    </div>)}
  </div>;
}
