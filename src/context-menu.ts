/** Editor controls are independent of site styles and selection repainting. */
export function createContextMenu(doc:Document,parent:HTMLElement,point:{x:number;y:number},label:string){
 const win=doc.defaultView!;
 const chrome=win.frameElement?.ownerDocument??doc;
 const scale=Math.max(.75,Math.min(1.5,Number(chrome.documentElement.style.getPropertyValue('--ui-scale'))||.85));
 const menu=doc.createElement('div');menu.dataset.webbitMenu='';menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);
 menu.style.cssText=`all:initial;position:fixed;left:${point.x}px;top:${point.y}px;width:${228*scale}px;max-height:calc(100vh - 8px);overflow:auto;box-sizing:border-box;padding:5px;background:#202637;border:1px solid #8f7abd;border-radius:6px;pointer-events:auto;z-index:2;box-shadow:0 8px 30px #0008`;
 const style=doc.createElement('style');style.textContent='[data-webbit-menu] [data-menu-action]:hover:not(:disabled){background:#443657!important}[data-webbit-menu] [data-menu-action]:focus-visible{outline:1px solid #c9b1ff!important}';menu.append(style);parent.append(menu);
 const fit=()=>{const r=menu.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(point.x,win.innerWidth-r.width-4))+'px';menu.style.top=Math.max(4,Math.min(point.y,win.innerHeight-r.height-4))+'px';};
 const add=(container:HTMLElement,text:string,action:()=>void,disabled=false)=>{const button=doc.createElement('button');button.type='button';button.dataset.menuAction=text;button.setAttribute('role','menuitem');button.textContent=text;button.disabled=disabled;button.style.cssText=`all:initial;display:block;box-sizing:border-box;width:100%;padding:${9*scale}px;border-radius:3px;color:${disabled?'#838799':'white'};font:${13*scale}px Arial;cursor:${disabled?'default':'pointer'};pointer-events:auto;user-select:none`;
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!disabled){action();if(menu.isConnected)fit();}});container.append(button);return button;};
 return {menu,add,fit};
}
