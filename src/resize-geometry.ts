export function resizeGeometry(width:number,height:number,handle:string,dx:number,dy:number,minWidth=1,minHeight=1){
 const w=Math.max(minWidth,width+(handle.includes('w')?-dx:handle.includes('e')?dx:0));
 const h=Math.max(minHeight,height+(handle.includes('n')?-dy:handle.includes('s')?dy:0));
 return {width:w,height:h,x:handle.includes('w')?width-w:0,y:handle.includes('n')?height-h:0};
}
export function translationParts(value:string){
 if(value==='none'||!value)return ['0px','0px'];
 const parts:string[]=[];let depth=0,start=0;
 for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(/\s/.test(value[i])&&depth===0){if(i>start)parts.push(value.slice(start,i));start=i+1;}}
 if(start<value.length)parts.push(value.slice(start));return [parts[0]||'0px',parts[1]||'0px'];
}

export function keyboardNudge(key:string,shift:boolean,control:boolean,alt=false,meta=false):{dx:number;dy:number}|null{
 if(!shift||alt||meta||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key))return null;
 const step=control?1:5;return {dx:key==="ArrowLeft"?-step:key==="ArrowRight"?step:0,dy:key==="ArrowUp"?-step:key==="ArrowDown"?step:0};
}
