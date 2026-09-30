import aiInstructions from '../help/PROJECT-AI.md?raw';
import {templateFiles} from './templates';
export type SiteProject = {
  name: string;
  entry: string;
  files: Record<string, string>;
  assets: Record<string, string>;
  root?: string;
};

export {aiInstructions};

export function safeRelativePath(path: string): boolean {
  if (!path || path.length > 240 || /[\\:\x00-\x1f<>"|?*]/.test(path) || path.startsWith('/')) return false;
  return path.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p));
}

export function validateFiles(files: Record<string, string>): void {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Expected a map of project files');
  const seen = new Set<string>();
  for (const [path, content] of Object.entries(files)) {
    if (!safeRelativePath(path) || seen.has(path.toLowerCase())) throw new Error(`Unsafe or duplicate file path: ${path}`);
    if (typeof content !== 'string') throw new Error(`Invalid text file: ${path}`);
    seen.add(path.toLowerCase());
  }
}

export function projectFromFiles(files: Record<string, string>, assets: Record<string,string> = {}, root?: string): SiteProject {
  validateFiles(files);
  let meta: Record<string,unknown> = {};
  if (files['webbit.json']) { try { const parsed:unknown = JSON.parse(files['webbit.json']); if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))meta=parsed as Record<string,unknown>; } catch { /* Guard will report invalid JSON. */ } }
  const pages = Object.keys(files).filter(p => /\.(?:html?|php)$/i.test(p));
  const entry = typeof meta.entry === 'string' && files[meta.entry] !== undefined ? meta.entry : pages.find(p=>/^index\.(?:html?|php)$/i.test(p)) ?? pages[0] ?? Object.keys(files)[0] ?? Object.keys(assets)[0] ?? '';
  return { name: typeof meta.name === 'string' ? meta.name : 'Website project', entry, files, assets, root };
}

export function createProject(kind: string = 'business'): SiteProject {
  if(kind==='blank')return projectFromFiles({
    'webbit.json':JSON.stringify({format:1,name:'My Website',entry:'index.html',securityProfile:'modern-web'},null,2),
    'index.html':'<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My Website</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n</body>\n</html>\n',
    'styles.css':'* { box-sizing: border-box; }\nhtml { min-height: 100%; }\nbody { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; color: #222; background: #fff; }\n',
    'script.js':'// Add optional page interactions here.\n',
    'assets/manifest.json':'{"version":1,"assets":[]}\n',
    'WEBBIT_AI.md':aiInstructions
  });
  const extra=templateFiles(kind);if(extra)return projectFromFiles({...extra,'WEBBIT_AI.md':aiInstructions,'assets/manifest.json':'{"version":1,"assets":[]}'});
  const legacy=kind as 'business'|'portfolio'|'blog'|'blank';
  const names = {business:'Northstar Computer Care',portfolio:'Alex Morgan — Portfolio',blog:'Notes from the Workshop',blank:'My Website'};
  const title = names[legacy];
  const heading = {business:'Technology that works for you.',portfolio:'Good work. Thoughtfully made.',blog:'Ideas worth sharing.',blank:'Welcome to your website.'}[legacy];
  const cards = kind === 'business' ? ['Computer repair','Setup & upgrades','Friendly support'] : kind === 'portfolio' ? ['Recent work','My process','Get in touch'] : ['First story','From the workshop','What comes next'];
  const section = kind === 'blank' ? '' : `<section class="cards">\n${cards.map((name,i)=>`  <article><p class="eyebrow">0${i+1}</p><h2>${name}</h2><p>Click this text and tell visitors what makes your work special.</p></article>`).join('\n')}\n</section>`;
  const html = (pageTitle:string,body:string)=>`<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${pageTitle}</title>\n  <meta name="description" content="${title}: discover our work and get in touch.">\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <header><a class="logo" href="index.html">${title}</a><nav><a href="index.html">Home</a><a href="about.html">About</a></nav></header>\n  <main>${body}</main>\n  <footer><p>© 2026 ${title}</p></footer>\n  <script src="script.js"></script>\n</body>\n</html>\n`;
  const files = {
    'webbit.json': JSON.stringify({format:1,name:title,entry:'index.html',securityProfile:'modern-web'},null,2),
    'index.html': html(title, `<section class="hero"><p class="eyebrow">Welcome to ${title}</p><h1>${heading}</h1><p class="intro">A little expertise. A lot of care. Start a conversation and discover what we can do together.</p><a class="button" href="about.html">Explore our story</a></section>${section}`),
    'about.html': html(`About — ${title}`, '<section class="hero"><p class="eyebrow">Our story</p><h1>People make the difference.</h1><p class="intro">Tell your story here. Make it personal, clear, and easy to understand.</p></section>'),
    'styles.css': `:root{font-family:system-ui,sans-serif;color:#1d2d35;background:#f5f2eb}*{box-sizing:border-box}body{margin:0}header,footer{max-width:1100px;margin:auto;padding:28px 36px;display:flex;justify-content:space-between;align-items:center}a{color:inherit}.logo{font-weight:750;text-decoration:none}nav{display:flex;gap:24px}nav a{text-decoration:none}main{max-width:1100px;margin:auto;padding:0 36px}.hero{padding:76px 0 70px;max-width:820px}h1{font-size:clamp(2.6rem,7vw,5.6rem);letter-spacing:-.055em;line-height:1.03;margin:20px 0 28px}.eyebrow{text-transform:uppercase;font-size:.75rem;letter-spacing:.14em;color:#50766a;font-weight:700}.intro{font-size:1.2rem;line-height:1.7;max-width:640px;color:#53636b}.button{display:inline-block;background:#214d40;color:white;padding:15px 23px;border-radius:6px;text-decoration:none;margin-top:14px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:60px}.cards article{background:#fffdf8;border:1px solid #deded1;padding:28px;border-radius:10px}.cards p{line-height:1.65}footer{font-size:.85rem;color:#5c6c74;border-top:1px solid #d6d9ce}@media(max-width:650px){header{align-items:flex-start;gap:20px;flex-direction:column}.cards{grid-template-columns:1fr}.hero{padding:45px 0}main,header,footer{padding-left:22px;padding-right:22px}}`,
    'script.js': '// Add progressive enhancements here. This file is preserved by visual edits.\n',
    'assets/manifest.json': '{"version":1,"assets":[]}\n',
    'WEBBIT_AI.md': aiInstructions
  };
  return projectFromFiles(files);
}

export const example = createProject();
export function isPublicPath(p:string):boolean {
  return !/(^|\/)(?:\.webbit|\.git|node_modules|private)(?:\/|$)/i.test(p)&&!/(^|\/)\.env(?:\.|$)/i.test(p)&&!/\.(?:sql|py|java|ts|tsx|jsx|sqlite|sqlite3|db|pem|key|pfx|p12)$/i.test(p)&&!['WEBBIT_AI.md','webbit.json','webbit.manager.json','webbit.access.json','webbit.security.json'].includes(p);
}
export function publicAssets(project:SiteProject):Record<string,string> {return Object.fromEntries(Object.entries(project.assets).filter(([p])=>isPublicPath(p)));}
export function publicFiles(project:SiteProject):Record<string,string> {
  return Object.fromEntries(Object.entries(project.files).filter(([p])=>isPublicPath(p)));
}

export function resolveLocalPath(page:string,reference:string):string|null {
  try { const url=new URL(reference, `https://webbit.invalid/${page}`); if(url.origin!=='https://webbit.invalid')return null; return decodeURIComponent(url.pathname.slice(1)); } catch {return null;}
}
