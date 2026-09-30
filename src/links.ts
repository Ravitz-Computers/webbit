import {safeRelativePath} from './project';
export type LinkDestination={kind:'page';path:string;hash:string}|{kind:'external';url:string}|{kind:'unavailable';message:string};
export function linkDestination(files:Record<string,string>,page:string,href:string):LinkDestination{
 try{
  if(/[\x00-\x1f\x7f]/.test(href))throw Error();
  const base='https://webbit.invalid',url=new URL(href,base+'/'+page);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return {kind:'unavailable',message:'This link is not a supported web address.'};
  if(url.origin!==base)return {kind:'external',url:url.href};
  const path=decodeURIComponent(url.pathname.slice(1)),stem=path.replace(/\/$/,'');
  const candidates=path.endsWith('/')?[path+'index.html',path+'index.htm',path+'index.php']:[path,...(!/\.[^/]+$/.test(path)?[path+'.html',path+'.htm',path+'.php',stem+'/index.html',stem+'/index.htm',stem+'/index.php']:[])];
  const found=candidates.find(p=>safeRelativePath(p)&&/\.(html?|php)$/i.test(p)&&files[p]!==undefined);
  return found?{kind:'page',path:found,hash:url.hash}:{kind:'unavailable',message:'That page is not in this project: '+(path||'/')};
 }catch{return {kind:'unavailable',message:'This link has an invalid address.'};}
}
