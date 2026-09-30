export type SnapBox={x:number;y:number;width:number;height:number};
export type SnapGuide={axis:'x'|'y';value:number;label:string};
export function snapMovement(box:SnapBox,dx:number,dy:number,targets:{box:SnapBox;label:string}[],threshold=6){
 const guides:SnapGuide[]=[];
 const axis=(name:'x'|'y',size:'width'|'height',delta:number)=>{
  let best=threshold+1,adjust=0,guide:SnapGuide|undefined;
  for(const target of targets)for(const [i,p] of [0,.5,1].entries())for(const [j,q] of [0,.5,1].entries()){
   const value=target.box[name]+target.box[size]*q;
   const distance=value-(box[name]+delta+box[size]*p);
   if(Math.abs(distance)<best&&Math.abs(distance)<=threshold){best=Math.abs(distance);adjust=distance;guide={axis:name,value,label:`${target.label} ${['start','center','end'][j]} → ${['start','center','end'][i]}`};}
  }
  if(guide)guides.push(guide);return delta+adjust;
 };
 return {dx:axis('x','width',dx),dy:axis('y','height',dy),guides};
}
