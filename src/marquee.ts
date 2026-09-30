export type SelectionBox={x:number;y:number;width:number;height:number};
export type MarqueeCandidate={id:number;parent:number|null;box:SelectionBox;group?:string|null};
export function selectionBox(start:{x:number;y:number},end:{x:number;y:number}):SelectionBox{
 return {x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};
}
export function touchesBox(a:SelectionBox,b:SelectionBox){
 return b.width>0&&b.height>0&&a.x<=b.x+b.width&&a.x+a.width>=b.x&&a.y<=b.y+b.height&&a.y+a.height>=b.y;
}
const containsBox=(a:SelectionBox,b:SelectionBox)=>a.x<=b.x&&a.y<=b.y&&a.x+a.width>=b.x+b.width&&a.y+a.height>=b.y+b.height;
/** Avoid selecting a wrapper and its children together, which would move content twice. */
export function marqueeHits(candidates:MarqueeCandidate[],box:SelectionBox,existing:number[]=[]):number[]{
 const nodes=new Map(candidates.map(n=>[n.id,n])),hit=candidates.filter(n=>touchesBox(box,n.box));
 const ancestors=(node:MarqueeCandidate)=>{const list:MarqueeCandidate[]=[];let parent=node.parent;const visited=new Set<number>();while(parent!==null&&!visited.has(parent)){visited.add(parent);const p=nodes.get(parent);if(!p)break;list.push(p);parent=p.parent;}return list;};
 const descendants=new Set(hit.flatMap(n=>ancestors(n).map(p=>p.id)));
 const chosen=hit.filter(n=>!ancestors(n).some(p=>touchesBox(box,p.box)&&containsBox(box,p.box))&&(!descendants.has(n.id)||containsBox(box,n.box)));
 const ids=new Set([...existing,...chosen.map(n=>n.id)]),groups=new Set(candidates.filter(n=>ids.has(n.id)&&n.group).map(n=>n.group));
 for(const n of candidates)if(n.group&&groups.has(n.group))ids.add(n.id);
 return candidates.filter(n=>ids.has(n.id)&&!ancestors(n).some(p=>ids.has(p.id))).map(n=>n.id);
}
