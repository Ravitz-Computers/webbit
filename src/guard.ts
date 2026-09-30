import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { resolveLocalPath, type SiteProject } from './project';
export type Finding={id:string;path:string;level:'critical'|'warning'|'deployment';message:string;offset:number;line:number;help:string;fix?:'viewport'|'charset'};
export function inspectProject(project:SiteProject):Finding[]{
  const findings:Finding[]=[];
  const add=(id:string,path:string,level:Finding['level'],message:string,offset=0,help='security',fix?:Finding['fix'])=>findings.push({id,path,level,message,offset,line:(project.files[path]?.slice(0,offset).match(/\n/g)?.length??0)+1,help,fix});
  for(const [path,source]of Object.entries(project.files)){
    if(!/\.(?:html?|php|css|js|mjs|json)$/i.test(path))continue;
    const publicCode=!/\.php$/i.test(path);
    const secret=/\b(?:api[_-]?key|smtp[_-]?(?:password|pass)|totp[_-]?secret|session[_-]?secret|resend[_-]?key|database[_-]?password)\s*["']?\s*[:=]\s*["'][^"'\n]{4,}["']|\bre_[A-Za-z0-9_]{24,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.exec(source);
    if(publicCode&&secret)add('exposed-secret',path,'critical','A possible server credential is exposed in a public file. Remove it from public output and rotate it if it was shared.',secret.index);
    if(/\.json$/i.test(path)){try{JSON.parse(source);}catch{add('invalid-json',path,'warning','This JSON file cannot be parsed. Check its syntax.',0,'source');}}
    if(/\.(?:js|mjs)$/i.test(path)){
      const unsafe=/\beval\s*\(|\binnerHTML\s*=|document\.write\s*\(/.exec(source);
      if(unsafe)add('unsafe-js',path,'warning','Review dynamic HTML or code execution. Untrusted input here can create an injection vulnerability.',unsafe.index);
    }
    if(/\.php$/i.test(path)){
      const unsafe=/\b(?:eval|include|require)(?:_once)?\s*\(?\s*\$_(?:GET|POST|REQUEST)|\becho\s+\$_(?:GET|POST|REQUEST)/i.exec(source);
      if(unsafe)add('php-input',path,'critical','Request input reaches output or executable code without an evident protection step.',unsafe.index,'php');
      const sql=/\b(?:query|exec)\s*\([^;\n]*\$/.exec(source);
      if(sql)add('sql-review',path,'warning','Review this database call for parameterized queries. Source heuristics cannot prove query safety.',sql.index,'php');
      const cookies=/session\.cookie_(?:secure|httponly)\s*['"]?\s*,\s*(?:0|false|['"]0['"])/i.exec(source);
      if(cookies)add('session-cookie',path,'critical','A session cookie protection appears to be disabled.',cookies.index,'manager');
      add('php-runtime',path,'deployment','PHP must be tested on compatible PHP hosting; the desktop preview does not execute it.',0,'php');
      continue;
    }
    if(!/\.html?$/i.test(path))continue;
    const doc=parse(source,{sourceCodeLocationInfo:true});
    const elements:DefaultTreeAdapterMap['element'][]=[];
    const walk=(node:DefaultTreeAdapterMap['node'])=>{if('tagName'in node)elements.push(node);if('childNodes'in node)node.childNodes.forEach(walk);};walk(doc);
    const attr=(n:DefaultTreeAdapterMap['element'],key:string)=>n.attrs.find(a=>a.name===key)?.value;
    const html=elements.find(n=>n.tagName==='html')!;
    if(!attr(html,'lang'))add('language',path,'warning','Choose the page language and set the html lang attribute.',html.sourceCodeLocation?.startOffset??0,'accessibility');
    if(!elements.some(n=>n.tagName==='title'&&n.childNodes.some(c=>'value'in c&&c.value.trim())))add('title',path,'warning','Add a descriptive page title.',0,'search');
    if(!elements.some(n=>n.tagName==='meta'&&attr(n,'name')?.toLowerCase()==='viewport'))add('viewport',path,'warning','Add a viewport declaration so mobile browsers use the device width.',0,'responsive','viewport');
    if(!elements.some(n=>n.tagName==='meta'&&attr(n,'charset')))add('charset',path,'warning','Declare UTF-8 for consistent text rendering.',0,'source','charset');
    if(!elements.some(n=>n.tagName==='meta'&&attr(n,'name')?.toLowerCase()==='description'))add('description',path,'warning','Write a page description for search and sharing.',0,'search');
    for(const node of elements){
      const offset=node.sourceCodeLocation?.startOffset??0;
      if(node.tagName==='img'&&attr(node,'alt')===undefined)add('image-alt',path,'warning','Add meaningful alternative text, or empty alt text if this image is decorative.',offset,'accessibility');
      if(['center','font','marquee'].includes(node.tagName))add('obsolete-html',path,'warning',`Replace the obsolete ${node.tagName} element with semantic markup and CSS.`,offset,'source');
      if(node.attrs.some(a=>a.name.startsWith('on')))add('inline-handler',path,'warning','An inline event handler needs review for CSP and input handling.',offset);
      for(const a of node.attrs.filter(a=>['src','href','poster','action'].includes(a.name))){
        if(/^javascript:/i.test(a.value))add('javascript-url',path,'critical','Replace this executable JavaScript URL with a safe event handler or link.',offset);
        if(/^http:\/\//i.test(a.value)&&['img','script','link','video','audio','source','iframe','form'].includes(node.tagName))add('mixed-content',path,'warning','This HTTP resource or form target is unsuitable for an HTTPS deployment. Verify an HTTPS replacement.',offset);
        if(a.name==='action'||!a.value||/^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(a.value))continue;
        const local=resolveLocalPath(path,a.value);
        if(local&&project.files[local]===undefined&&project.assets[local]===undefined&&project.files[`${local.replace(/\/$/,'')}/index.html`]===undefined)add('missing-file',path,'warning',`The referenced local file is missing: ${local}`,offset,'files');
      }
      if(node.tagName==='script'&&/^https?:/i.test(attr(node,'src')??'')&&!attr(node,'integrity'))add('script-integrity',path,'warning','Review the third-party script and consider a pinned version with integrity protection.',offset);
      if(node.tagName==='script'&&attr(node,'type')==='application/ld+json'){
        try{const data=JSON.parse(node.childNodes.map(c=>'value'in c?c.value:'').join(''));if(!data||typeof data!=='object')throw new Error();}
        catch{add('structured-data',path,'warning','Structured data is not valid JSON. Fix it before checking the page with a search validation tool.',offset,'search');}
      }
    }
  }
  add('deployment-tls','','deployment','Verify HTTPS, origin certificates, TLS versions, redirects, and security headers on the deployed host.',0,'deployment');
  add('deployment-cloudflare','','deployment','If using Cloudflare, verify DNS, Full (strict), caching, Access/WAF and origin settings there. Cloudflare is optional.',0,'deployment');
  if(Object.values(project.files).some(s=>/Theme Name:/.test(s)))add('wordpress','','deployment','Test this theme in WordPress; hooks, escaping, permissions and PHP behavior need runtime checks.',0,'wordpress');
  return findings;
}
export function applySafeFix(source:string,fix:Finding['fix']):string{
  if(!fix||!/<head\b[^>]*>/i.test(source))return source;
  if(fix==='viewport'&&!/<meta\b[^>]*name\s*=\s*['"]?viewport/i.test(source))return source.replace(/<head\b[^>]*>/i,m=>`${m}\n  <meta name="viewport" content="width=device-width, initial-scale=1">`);
  if(fix==='charset'&&!/<meta\b[^>]*charset\s*=/i.test(source))return source.replace(/<head\b[^>]*>/i,m=>`${m}\n  <meta charset="utf-8">`);
  return source;
}
