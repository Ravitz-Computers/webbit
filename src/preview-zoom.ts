export type ZoomMode='magnify'|'reflow';
/** Round available space down: clientWidth/clientHeight round up at fractional UI sizes. */
export function previewStageSize(rect:{width:number;height:number},offset:{width:number;height:number},client:{width:number;height:number}){
 return {width:Math.max(1,Math.floor(rect.width-Math.max(0,offset.width-client.width))),height:Math.max(1,Math.floor(rect.height-Math.max(0,offset.height-client.height)))};
}
export function previewGeometry(width:number,height:number,viewport:string,percent:number,mode:ZoomMode,rulers:boolean){
 const scale=Math.max(.25,Math.min(3,percent/100)),gutter=rulers?20*scale:0;
 const base=viewport==='phone'?390:viewport==='tablet'?768:viewport==='reading'?Math.min(720,width-(rulers?20:0)):Math.max(1,width-(rulers?20:0));
 const frameWidth=mode==='reflow'?(viewport==='desktop'?Math.max(1,width-gutter):base)/scale:base;
 const frameHeight=Math.max(1,mode==='reflow'?(height-gutter)/scale:height-(rulers?20:0));
 return {scale,gutter,frameWidth,frameHeight,paperWidth:frameWidth*scale+gutter,paperHeight:frameHeight*scale+gutter};
}
