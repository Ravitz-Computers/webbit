import {type SiteProject,safeRelativePath} from './project';
export type ProjectFont={family:string;path:string;weight:string;style:'normal'|'italic'};
export function projectFonts(project:SiteProject):ProjectFont[]{try{const value=JSON.parse(project.files['assets/fonts/webbit-fonts.json']??'[]');return Array.isArray(value)?value.filter(f=>typeof f.family==='string'&&/^[\w -]{1,80}$/.test(f.family)&&typeof f.path==='string'&&safeRelativePath(f.path)&&/^(?:[1-9]00)(?: [1-9]00)?$/.test(f.weight)&&['normal','italic'].includes(f.style)):[];}catch{return [];}}
export function registerFont(project:SiteProject,font:ProjectFont,data:string):SiteProject{
 if(!/^[\w -]{1,80}$/.test(font.family)||!safeRelativePath(font.path)||!/^assets\/fonts\/[\w.-]+\.(woff2?|ttf|otf)$/i.test(font.path)||!/^(?:[1-9]00)(?: [1-9]00)?$/.test(font.weight)||!['normal','italic'].includes(font.style))throw new Error('Use a font family name containing letters, numbers, spaces or hyphens and a valid weight.');
 if(!/^data:[^,]*;base64,[a-z0-9+/=]+$/i.test(data))throw new Error('Invalid font data.');
 const list=projectFonts(project).filter(f=>f.path!==font.path);list.push(font);
 const files:Record<string,string>={...project.files,'assets/fonts/webbit-fonts.json':JSON.stringify(list,null,2),'assets/fonts/webbit-fonts.css':list.map(f=>`@font-face { font-family: "${f.family}"; src: url("${f.path.split('/').pop()}"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`).join('\n')+'\n'};
 for(const path of Object.keys(files).filter(p=>/\.html?$/i.test(p))){const href='../'.repeat(path.split('/').length-1)+'assets/fonts/webbit-fonts.css';if(!files[path].includes(href))files[path]=files[path].replace(/<\/head\s*>/i,`  <link rel="stylesheet" href="${href}">\n</head>`);}
 return {...project,files,assets:{...project.assets,[font.path]:data}};
}

