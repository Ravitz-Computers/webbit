import {linkDestination} from './links';
import {previewGeometry,previewStageSize,type ZoomMode} from './preview-zoom';
import {validTheme,validScale,defaultUiScale,type AppTheme} from './appearance';
import {copyElements,pasteElements,type ElementClipboard} from './element-clipboard';
import {editCanvasSelection} from './canvas-edit';

import {VaultDialog} from './VaultDialog';

import {storageMode,type VaultPayload} from './encryption';

import React,{useEffect,useMemo,useRef,useState} from 'react';

import {createRoot} from 'react-dom/client';

import {invoke,isTauri} from '@tauri-apps/api/core';

import {getCurrentWindow} from '@tauri-apps/api/window';

import CodeMirror,{type ReactCodeMirrorRef} from '@uiw/react-codemirror';

import {html} from '@codemirror/lang-html';

import {css} from '@codemirror/lang-css';

import {javascript} from '@codemirror/lang-javascript';

import {EditorView} from '@codemirror/view';

import {example,createProject,projectFromFiles,publicFiles,publicAssets,safeRelativePath,type SiteProject} from './project';

import {previewDocument,replaceDirectText,replaceElementText,sourceOffset} from './preview';

import {inspectProject,applySafeFix,type Finding} from './guard';

import {analyzeSite} from './manager';

import {importPaths,planImport,mergeImport,importedSite,elementMarkup,type ImportBatch} from './imports';



import {sourceElement} from './preview';

import {setElementAttribute,removeElement,moveElement} from './inspector';

import {helpArticles} from './help';

import license from '../LICENSE?raw';

import notices from '../THIRD-PARTY-NOTICES.md?raw';

import {MenuBar,type MenuGroup} from './MenuBar';

import './styles.css';
import './appearance.css';

import {googleReviewFiles,googleReviewMarkup} from './google-reviews';

import {ElementGallery} from './ElementGallery';

import {attachCanvas,placeElement,relocateElement,resizeElement,type CanvasRect} from './canvas';

import {withEnhancements} from './effects';

import {TemplateGallery} from './TemplateGallery';

import {FontManager} from './FontManager';

import {projectFonts} from './fonts';

import {fileKinds,fileKind,listFiles,type FileKind} from './file-list';

import {downloadSite} from './download';

import {ElementRibbon} from './ElementRibbon';

import {sourceNodes} from './blocks';

import {contextualLabel} from './element-styles';

import {BlockEditor,EffectsGallery} from './BlockEditor';

import {blocks} from './blocks';

import {MemberAccess} from './MemberAccess';

import {accessConfig,addMemberExport} from './member-export';

import {Ribbon} from './Ribbon';

import {DataImport} from './DataImport';

import {mountWebbit} from './enhancements.js';



type Snapshot={root:string;files:Record<string,string>;assets:Record<string,string>};

type Panel='new'|'help'|'about'|'guard'|'manager'|'close'|'import'|'settings'|'effects'|'data'|'download'|'gallery'|'google'|'access'|'encryption'|'vault'|'external-link'|null;

const editorTheme=EditorView.theme({'&':{backgroundColor:'#10131d',color:'#d4dbe8',height:'100%'},'.cm-content':{fontFamily:'Consolas,monospace',fontSize:'calc(13px * var(--ui-scale, 1))',padding:'16px 0'},'.cm-gutters':{backgroundColor:'#10131d',color:'#58617a',border:'none'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'#191f30'},'.cm-scroller':{overflow:'auto'},'&.cm-focused .cm-cursor':{borderLeftColor:'#b3a2ff'},'&.cm-focused .cm-selectionBackground,.cm-selectionBackground':{backgroundColor:'#403768'}},{dark:true});



function Preview({project,page,onChange,onSelect,viewport,onShortcut,onFollowLink,navigation,canvas}:{project:SiteProject;page:string;onChange:(value:string)=>void;onSelect:(offset:number,id:number)=>void;viewport:string;onShortcut:(event:KeyboardEvent)=>void;onFollowLink:(href:string)=>void;navigation:{page:string;hash:string;serial:number}|null;canvas:Parameters<typeof attachCanvas>[1]}){

  const frame=useRef<HTMLIFrameElement>(null);
  const stage=useRef<HTMLDivElement>(null);
  const [zoom,setZoom]=useState(100),[zoomMode,setZoomMode]=useState<ZoomMode>('magnify');
  const [stageSize,setStageSize]=useState({width:800,height:500});
  useEffect(()=>{const el=stage.current;if(!el)return;let pending=0;const update=()=>{const next=previewStageSize(el.getBoundingClientRect(),{width:el.offsetWidth,height:el.offsetHeight},{width:el.clientWidth,height:el.clientHeight});setStageSize(previous=>previous.width===next.width&&previous.height===next.height?previous:next);};update();const observer=new ResizeObserver(()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(update);});observer.observe(el);return()=>{observer.disconnect();cancelAnimationFrame(pending);};},[page]);
  const geometry=previewGeometry(stageSize.width,stageSize.height,viewport,zoom,zoomMode,!!canvas.rulers&&!!canvas.enabled);


  const savedScroll=useRef({x:0,y:0});

  const cleanup=useRef<(()=>void)|null>(null);

  const canvasCleanup=useRef<(()=>void)|null>(null);

  const canvasRef=useRef(canvas);canvasRef.current=canvas;
  const followRef=useRef(onFollowLink);followRef.current=onFollowLink;
  const navigationRef=useRef(navigation);navigationRef.current=navigation;
  const previousPage=useRef(page);
  const appliedNavigation=useRef<number|null>(null);
  const scrollAnchor=()=>{const dest=navigationRef.current,doc=frame.current?.contentDocument;if(!dest||dest.page!==page||!doc||appliedNavigation.current===dest.serial)return;appliedNavigation.current=dest.serial;if(!dest.hash){doc.defaultView?.scrollTo(0,0);return;}try{const id=decodeURIComponent(dest.hash.slice(1));const target=doc.getElementById(id)??Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[name]')).find(el=>el.name===id);target?.scrollIntoView({block:'start'});}catch{}};
  useEffect(()=>{if(previousPage.current===page)scrollAnchor();},[navigation]);

  useEffect(()=>{const doc=frame.current?.contentDocument;if(doc){canvasCleanup.current?.();canvasCleanup.current=attachCanvas(doc,{...canvas,onFollowLink:href=>followRef.current(href),onEdit:edit=>canvasRef.current.onEdit?.(edit),onSelect:id=>canvasRef.current.onSelect?.(id),onDeselect:()=>canvasRef.current.onDeselect?.(),onCopy:items=>canvasRef.current.onCopy?.(items),onPaste:(point,origin)=>canvasRef.current.onPaste?.(point,origin),canPaste:()=>canvasRef.current.canPaste?.()??false,clipboardText:()=>canvasRef.current.clipboardText?.()??''});}},[canvas.tool,canvas.markup,canvas.snapping,canvas.rulers,canvas.enabled]);

  useEffect(()=>()=>canvasCleanup.current?.(),[]);

  useEffect(()=>()=>cleanup.current?.(),[]);

  const shortcutRef=useRef(onShortcut);shortcutRef.current=onShortcut;

  const latest=useRef(project);latest.current=project;

  const emitted=useRef<string|null>(null);

  const [document,setDocument]=useState(()=>previewDocument(project,page));

  useEffect(()=>{

    if(emitted.current===project.files[page]){emitted.current=null;return;}

    const previousWindow=frame.current?.contentWindow;if(previousPage.current!==page){savedScroll.current={x:0,y:0};previousPage.current=page;}else if(previousWindow)savedScroll.current={x:previousWindow.scrollX,y:previousWindow.scrollY};let rendered=previewDocument(project,page);if(viewport==='reading')rendered=rendered.replace('</head>','<style>body{font:19px/1.9 Georgia,serif!important;background:#fffdf5!important;color:#252525!important;padding:32px!important}main,section,article{max-width:65ch!important;margin-inline:auto!important}nav,header,footer,video,audio{display:none!important}h1,h2,h3{line-height:1.2!important}img{max-height:320px!important;object-fit:contain!important}</style></head>');setDocument(rendered);

  },[project.files,project.assets,page,viewport,canvas.markup]);

  const attach=()=>{

    const doc=frame.current?.contentDocument;if(!doc)return;

    cleanup.current?.();cleanup.current=mountWebbit(doc);

    canvasCleanup.current?.();canvasCleanup.current=attachCanvas(doc,{...canvasRef.current,onFollowLink:href=>followRef.current(href),onEdit:edit=>canvasRef.current.onEdit?.(edit),onSelect:id=>canvasRef.current.onSelect?.(id),onDeselect:()=>canvasRef.current.onDeselect?.(),onCopy:items=>canvasRef.current.onCopy?.(items),onPaste:(point,origin)=>canvasRef.current.onPaste?.(point,origin),canPaste:()=>canvasRef.current.canPaste?.()??false,clipboardText:()=>canvasRef.current.clipboardText?.()??''});

    if(viewport==='reading'){doc.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));}

    doc.onclick=event=>{
      const link=(event.target as Element)?.closest('a[href]');if(event.ctrlKey&&!event.altKey&&!event.shiftKey&&link){event.preventDefault();event.stopPropagation();followRef.current(link.getAttribute('href')??'');return;}

      if(canvasRef.current.markup||canvasRef.current.tool!=='select'){event.preventDefault();return;}

      const target=event.target as Element;const element=target?.closest('button[data-webbit-node],a[data-webbit-node],input[data-webbit-node],select[data-webbit-node],textarea[data-webbit-node]')??target?.closest('[data-webbit-node]');

      if(element){onSelect(sourceOffset(latest.current.files[page],Number(element.getAttribute('data-webbit-node'))),Number(element.getAttribute('data-webbit-node')));}

      if((event.target as Element)?.closest('a,button'))event.preventDefault();

    };

    doc.defaultView?.scrollTo(savedScroll.current.x,savedScroll.current.y);if(navigationRef.current?.page===page)scrollAnchor();doc.onsubmit=event=>event.preventDefault();doc.onkeydown=event=>shortcutRef.current(event);

    doc.oninput=event=>{

      const element=(event.target as Element)?.closest<HTMLElement>('[data-webbit-text-index],[data-webbit-node][contenteditable]');if(!element)return;

      try{

        const updated=element.hasAttribute('data-webbit-text-index')?replaceDirectText(latest.current.files[page],Number(element.dataset.webbitTextParent),Number(element.dataset.webbitTextIndex),element.textContent??''):replaceElementText(latest.current.files[page],Number(element.getAttribute('data-webbit-node')),element.textContent??'');

        emitted.current=updated;latest.current={...latest.current,files:{...latest.current.files,[page]:updated}};onChange(updated);

      }catch{/* A source change invalidated this node. The next render refreshes it. */}

    };

  };

  if(!/\.html?$/i.test(page))return <div className="empty-preview"><img src="/hare/investigating.svg" alt=""/><h2>Source file</h2><p>Select an HTML page to view it here. PHP and other server code need their own runtime.</p></div>;

  return <div className="preview-view"><div ref={stage} className={`preview-stage zoom-stage ${viewport}`}><div className="preview-paper" style={{width:geometry.paperWidth,height:geometry.paperHeight}}><div className="preview-canvas" style={{left:geometry.gutter,top:geometry.gutter,width:geometry.frameWidth,height:geometry.frameHeight,transform:`scale(${geometry.scale})`}}><iframe ref={frame} style={{width:geometry.frameWidth,height:geometry.frameHeight,maxWidth:'none',minWidth:0}} title="Editable website preview" sandbox="allow-same-origin" srcDoc={document} onLoad={attach}/></div></div></div><div className="preview-zoom" role="group" aria-label="Website view zoom"><label>Zoom mode<select aria-label="Website zoom mode" value={zoomMode} onChange={e=>setZoomMode(e.target.value as ZoomMode)}><option value="magnify">Magnify · keep layout</option><option value="reflow">Browser zoom · reflow</option></select></label><button aria-label="Zoom out website" disabled={zoom<=25} onClick={()=>setZoom(z=>Math.max(25,z-25))}>−</button><label><span className="zoom-label">Magnification</span><select aria-label="Website magnification" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[25,50,75,100,125,150,175,200,225,250,275,300].map(n=><option key={n} value={n}>{n}%</option>)}</select></label><button aria-label="Zoom in website" disabled={zoom>=300} onClick={()=>setZoom(z=>Math.min(300,z+25))}>+</button><button title="Reset website magnification" onClick={()=>setZoom(100)}>100%</button></div></div>;

}



function App(){
  const [appTheme,setAppTheme]=useState<AppTheme>(()=>validTheme(localStorage.getItem('webbit.theme')));
  const [uiScale,setUiScale]=useState(()=>validScale(localStorage.getItem('webbit.uiScale')));
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme=appTheme==='system'?(systemDark?'dark':'light'):appTheme;
  useEffect(()=>{const query=window.matchMedia('(prefers-color-scheme: dark)');const update=()=>setSystemDark(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=resolvedTheme;localStorage.setItem('webbit.theme',appTheme);},[appTheme,resolvedTheme]);
  useEffect(()=>{document.documentElement.style.setProperty('--ui-scale',String(uiScale/100));localStorage.setItem('webbit.uiScale',String(uiScale));},[uiScale]);


  const [project,setProject]=useState<SiteProject>(example);

  const [file,setFile]=useState(example.entry);

  const [page,setPage]=useState(example.entry);

  const [mode,setMode]=useState<'beginner'|'advanced'|'developer'>('advanced');

  const [layout,setLayout]=useState<'split'|'code'|'preview'>('split');

  const [swapped,setSwapped]=useState(true);

  const [blockMode,setBlockMode]=useState(false);

  const [ribbonVisible,setRibbonVisible]=useState(()=>localStorage.getItem('webbit.ribbon')==='true');

  useEffect(()=>localStorage.setItem('webbit.ribbon',String(ribbonVisible)),[ribbonVisible]);

  const [selectedBlock,setSelectedBlock]=useState<number|null>(null);

  const [ratio,setRatio]=useState(47);

  const [pendingMarkup,setPendingMarkup]=useState<string|null>(null);

  const [canvasSelection,setCanvasSelection]=useState<string[]>([]);
  const elementClipboard=useRef<ElementClipboard|null>(null);
  const pasteCount=useRef(0);

  const [canvasTool,setCanvasTool]=useState<'select'|'move'|'resize'|'rotate'>('select');

  const [viewport,setViewport]=useState<'desktop'|'tablet'|'phone'|'reading'>('desktop');

  const [vaultMode,setVaultMode]=useState<'open'|'save'>('save');

  const [vaultPayload,setVaultPayload]=useState<VaultPayload|null>(null);

  const [vaultClose,setVaultClose]=useState<'site'|'app'|null>(null);

  const [siteOpen,setSiteOpen]=useState(false);

  const [googlePlaceId,setGooglePlaceId]=useState('');

  const [downloadUrl,setDownloadUrl]=useState('https://');

  const [closeTarget,setCloseTarget]=useState<'site'|'app'>('app');

  const [fileFilter,setFileFilter]=useState<FileKind>('All');

  const [fileSort,setFileSort]=useState<'name'|'type'>('name');

  const [panel,setPanel]=useState<Panel>(null);

  const [settingsTab,setSettingsTab]=useState('Usability');
  const [externalLink,setExternalLink]=useState('');
  const [navigation,setNavigation]=useState<{page:string;hash:string;serial:number}|null>(null);

  const [snapping,setSnapping]=useState(()=>localStorage.getItem('webbit.snapping')!=='false');

  const [rulers,setRulers]=useState(()=>localStorage.getItem('webbit.rulers')!=='false');

  useEffect(()=>localStorage.setItem('webbit.snapping',String(snapping)),[snapping]);

  useEffect(()=>localStorage.setItem('webbit.rulers',String(rulers)),[rulers]);

  const [importBatch,setImportBatch]=useState<ImportBatch|null>(null);

  const [importKind,setImportKind]=useState<'files'|'folder'|'zip'>('files');

  const [importPrefix,setImportPrefix]=useState('');

  const [importWhole,setImportWhole]=useState(false);

  const [importReplace,setImportReplace]=useState(false);

  const [stripRoot,setStripRoot]=useState(false);

  const [minimizeOnClose,setMinimizeOnClose]=useState(()=>localStorage.getItem('webbit.minimizeOnClose')==='true');

  const minimizeRef=useRef(minimizeOnClose);minimizeRef.current=minimizeOnClose;

  useEffect(()=>localStorage.setItem('webbit.minimizeOnClose',String(minimizeOnClose)),[minimizeOnClose]);

  const [selectedNode,setSelectedNode]=useState<number|null>(null);

  const selected=selectedNode===null?null:sourceElement(project.files[page]??'',selectedNode);

  useEffect(()=>{setSelectedNode(null);setSelectedBlock(null);},[page]);

  const [help,setHelp]=useState('start');

  const [notice,setNotice]=useState('Choose a starter, or open your website folder.');

  const [dirty,setDirty]=useState(false);

  const [external,setExternal]=useState(false);

  const [busy,setBusy]=useState(false);

  const [newName,setNewName]=useState('');

  const [historyTick,setHistoryTick]=useState(0);

  const editor=useRef<ReactCodeMirrorRef>(null);

  const workspace=useRef<HTMLDivElement>(null);

  const undo=useRef<Pick<SiteProject,'files'|'assets'>[]>([]),redo=useRef<Pick<SiteProject,'files'|'assets'>[]>([]);

  const projectRef=useRef(project);projectRef.current=project;

  const dirtyRef=useRef(dirty);dirtyRef.current=dirty;

  const busyRef=useRef(busy);busyRef.current=busy;

  const drag=useRef(false);

  const pendingJump=useRef<number|null>(null);

  const findings=useMemo(()=>inspectProject(project),[project.files,project.assets]);

  const critical=findings.filter(f=>f.level==='critical').length;

  const fields=useMemo(()=>analyzeSite(project),[project.files]);

  const pages=Object.keys(project.files).filter(p=>/\.(?:html?|php)$/i.test(p));

  const visibleFiles=listFiles([...Object.keys(project.files),...Object.keys(project.assets)],fileFilter,fileSort);

  const [selectedFields,setSelectedFields]=useState<Set<string>>(new Set());

  void historyTick;



  useEffect(()=>{

    const move=(event:PointerEvent)=>{if(drag.current&&workspace.current){const bounds=workspace.current.getBoundingClientRect();setRatio(Math.min(78,Math.max(22,(event.clientX-bounds.left)/bounds.width*100)));}};

    const stop=()=>drag.current=false;

    window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);

    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);};

  },[]);

  useEffect(()=>{const prevent=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[dirty]);

  useEffect(()=>{

    if(!isTauri()||!project.root)return;let checking=false,active=true;

    const timer=setInterval(async()=>{if(checking)return;checking=true;try{const changed=await invoke<boolean>('check_project');if(active)setExternal(changed);}catch{}finally{checking=false;}},5000);

    return()=>{active=false;clearInterval(timer);};

  },[project.root]);

  useEffect(()=>{if(pendingJump.current!==null&&editor.current?.view){const pos=Math.min(pendingJump.current,editor.current.view.state.doc.length);editor.current.view.dispatch({selection:{anchor:pos},effects:EditorView.scrollIntoView(pos,{y:'center'})});pendingJump.current=null;}},[file,panel,layout]);



  useEffect(()=>{

    if(!isTauri())return;

    let disposed=false,unlisten:(()=>void)|undefined;

    getCurrentWindow().onCloseRequested(event=>{if(minimizeRef.current){event.preventDefault();getCurrentWindow().minimize().catch(error=>setNotice(String(error)));return;}if(busyRef.current){event.preventDefault();setNotice('Wait for the current file operation to finish.');}else if(dirtyRef.current){event.preventDefault();setCloseTarget('app');setPanel('close');}}).then(stop=>{if(disposed)stop();else unlisten=stop;}).catch(error=>setNotice(`Could not protect unsaved changes on close: ${String(error)}`));

    return()=>{disposed=true;unlisten?.();};

  },[]);

  const changeFiles=(files:Record<string,string>)=>{

    undo.current.push({files:projectRef.current.files,assets:projectRef.current.assets});if(undo.current.length>50)undo.current.shift();redo.current=[];

    setProject(p=>({...p,files}));setDirty(true);setHistoryTick(t=>t+1);

  };

  const change=(path:string,value:string)=>{if(projectRef.current.files[path]!==value)changeFiles({...projectRef.current.files,[path]:value});};

  const replaceProject=(snapshot:Snapshot)=>{const next=projectFromFiles(snapshot.files,snapshot.assets,snapshot.root);setSiteOpen(true);setProject(next);setSelectedNode(null);setFile(next.entry);setPage(next.entry);setDirty(false);setExternal(false);undo.current=[];redo.current=[];setHistoryTick(t=>t+1);};

  const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);try{await action();}catch(error){setNotice(String(error));}finally{setBusy(false);}};

  const native=()=>{if(!isTauri())throw new Error('Folder operations are available in the Windows desktop build. You can try the visual and source editor in this preview.');};

  const open=()=>run(async()=>{native();if(dirty&&!window.confirm('Open another folder and discard unsaved editor changes?'))return;const snapshot=await invoke<Snapshot|null>('open_project');if(snapshot){replaceProject(snapshot);setNotice('Project folder opened.');}});

  const save=(saveAs=false)=>run(async()=>{if(!siteOpen)return;native();if(storageMode(project)==='full'){setVaultPayload(null);setVaultMode('save');setVaultClose(null);setPanel('vault');return;}const snapshot=await invoke<Snapshot|null>('save_project',{files:project.files,assets:project.assets,saveAs:saveAs||!project.root});if(snapshot){const next=projectFromFiles(snapshot.files,snapshot.assets,snapshot.root);setProject(next);setDirty(false);setExternal(false);setNotice('Saved. Earlier changed files are in .webbit/backups.');}});

  const reload=()=>run(async()=>{if(dirty&&!window.confirm('Reload disk files and discard unsaved editor changes?'))return;replaceProject(await invoke<Snapshot>('reload_project'));setNotice('External changes loaded. Guard has checked the updated project.');});

  const followLink=(href:string)=>{const dest=linkDestination(projectRef.current.files,page,href);if(dest.kind==='unavailable'){setNotice(dest.message);return;}if(dest.kind==='external'){setExternalLink(dest.url);setPanel('external-link');return;}setCanvasSelection([]);setSelectedNode(null);setSelectedBlock(null);setFile(dest.path);setPage(dest.path);if(!/\.html?$/i.test(dest.path))setLayout('split');setNavigation({page:dest.path,hash:dest.hash,serial:Date.now()});setNotice('Opened '+dest.path);};
  const openExternalLink=()=>run(async()=>{if(isTauri())await invoke('open_external_link',{url:externalLink});else {const opened=window.open(externalLink,'_blank','noopener,noreferrer');if(!opened)setNotice('If no browser tab opened, allow pop-ups for this local preview.');}setPanel(null);});

  const browserPreview=()=>run(async()=>{if(!siteOpen)return;native();const url=await invoke<string>('preview_site',{files:publicFiles(project),assets:publicAssets(project),entry:page});setNotice(`Browser preview opened: ${url}. Local memory snapshot; scripts run, PHP does not.`);});

  const deliverExport=async(files:Record<string,string>,assetPrefix='')=>{if(storageMode(project)==='full'){setVaultMode('save');setVaultClose(null);setVaultPayload({kind:'deployment',files,assets:Object.fromEntries(Object.entries(publicAssets(project)).map(([p,v])=>[assetPrefix+p,v]))});setPanel('vault');return;}const destination=await invoke<string|null>('export_site',{files,assets:publicAssets(project),assetPrefix});if(destination){setPanel(null);setNotice(`Exported to ${destination}. Read the included deployment instructions.`);}};

  const exportSite=()=>run(async()=>{if(!siteOpen)return;if(critical){setPanel('guard');setNotice('Resolve critical source findings before export.');return;}native();const member=accessConfig(project).enabled;const files=member?addMemberExport(Object.fromEntries(Object.entries(publicFiles(project)).map(([p,t])=>['public/'+p,t])),project):publicFiles(project);await deliverExport(files,member?'public/':'');});

  const newProject=(kind:Parameters<typeof createProject>[0])=>run(async()=>{if(dirty&&!window.confirm('Start a new site and discard unsaved editor changes?'))return;if(isTauri())await invoke('reset_project');const next=createProject(kind);setSiteOpen(true);setProject(next);setFile(next.entry);setPage(next.entry);setDirty(true);setExternal(false);undo.current=[];redo.current=[];setPanel(null);setNotice(kind==='blank'?'Your blank site is ready. Add an element from the gallery or write your own HTML.':'Your new site is ready. Click text to edit it; drag padding or backgrounds to move elements.');});

  const go=(finding:Finding)=>{if(!finding.path){setHelp(finding.help);setPanel('help');return;}pendingJump.current=finding.offset;setFile(finding.path);if(/\.html?$/i.test(finding.path))setPage(finding.path);setLayout('split');setPanel(null);};

  const jump=(offset:number)=>{if(file!==page){pendingJump.current=offset;setFile(page);return;}const view=editor.current?.view;if(view)view.dispatch({selection:{anchor:Math.min(offset,view.state.doc.length)},effects:EditorView.scrollIntoView(Math.min(offset,view.state.doc.length),{y:'center'})});};

  const addBlock=(markup:string)=>{if(!/\.html?$/i.test(page)){setNotice('Select an HTML page first.');return;}setPendingMarkup(markup);setCanvasTool('select');setLayout('preview');setViewport('desktop');setNotice('Draw a rectangle inside a page section to place the element. Escape cancels.');};

  const canvasAction=(fn:()=>string,enhance=false)=>{try{let files={...project.files,[page]:fn()};if(enhance)files=withEnhancements(files,page);changeFiles(files);setPendingMarkup(null);setSelectedNode(null);setSelectedBlock(null);}catch(e){setNotice(String(e));}};

  const addPage=()=>{const name=newName.trim();if(!safeRelativePath(name)||!name.endsWith('.html')){setNotice('Use a relative HTML filename, such as services.html.');return;}if(project.files[name]!==undefined){setNotice('That file already exists.');return;}change(name,`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>New page</title>${projectFonts(project).length?`<link rel="stylesheet" href="${'../'.repeat(name.split('/').length-1)}assets/fonts/webbit-fonts.css">`:''}</head><body><main><h1>New page</h1><p>Start your story here.</p></main></body></html>\n`);setFile(name);setPage(name);setNewName('');};

  const addImage=()=>run(async()=>{native();const batch=await invoke<ImportBatch|null>('import_content',{kind:'files'});if(batch){setImportBatch(batch);setImportKind('files');setImportWhole(false);setImportPrefix('assets/images');setImportReplace(false);setPanel('import');}});

  const history=(direction:'undo'|'redo')=>{const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;const files=from.current.pop();if(files){to.current.push({files:project.files,assets:project.assets});setProject(p=>({...p,...files}));setSelectedNode(null);setDirty(true);setHistoryTick(t=>t+1);}};

    const chooseImport=(kind:'files'|'folder'|'zip')=>run(async()=>{native();const batch=await invoke<ImportBatch|null>('import_content',{kind});if(!batch)return;setImportBatch(batch);setImportKind(kind);setImportWhole(kind!=='files');setImportPrefix('');setImportReplace(false);setStripRoot(kind==='zip');setNotice(`Read ${importPaths(batch).length} files for import review. Nothing has been written.`);});

  let importPlan:ReturnType<typeof planImport>=[],importError='';

  if(importBatch&&!importWhole){try{importPlan=planImport(project,importBatch,importPrefix);}catch(error){importError=String(error);}}

  const acceptImport=()=>run(async()=>{

    if(!importBatch)return;

    if(importWhole){

      if(dirty&&!window.confirm('Import this site as a new unsaved project and discard current unsaved changes?'))return;

      const next=importedSite(importBatch,stripRoot);if(isTauri())await invoke('reset_project');setProject(next);setFile(next.entry);setPage(next.entry);undo.current=[];redo.current=[];setExternal(false);

    }else{

      const next=mergeImport(project,importBatch,importPrefix,importReplace);

      undo.current.push({files:project.files,assets:project.assets});if(undo.current.length>50)undo.current.shift();redo.current=[];setProject(next);const first=importPlan.find(p=>!p.conflict||importReplace);if(first){setFile(first.conflict??first.destination);setLayout('split');}

    }

    setSelectedNode(null);setDirty(true);setPanel(null);setHistoryTick(t=>t+1);setNotice('Imported into the editor. Save to write files, or Undo a merge. The source folder was not changed.');

  });

  const insertFile=(path:string)=>{

    if(!/\.html?$/i.test(page)){setNotice('Select an HTML page first.');return;}

    const element=elementMarkup(path,page),source=project.files[page];

    if(element.head){if(!/<\/head>/i.test(source)){setNotice('Add a head element before attaching a stylesheet.');return;}change(page,source.replace(/<\/head>/i,`${element.markup}\n</head>`));}else addBlock(element.markup);

    setNotice(`Inserted a reference to ${path}. Scripts are preserved but do not execute in the editing preview.`);

  };

  const showHelp=(topic='start')=>{setHelp(topic);setPanel('help');};

  const showImport=()=>{if(!siteOpen){setPanel('new');return;}setImportBatch(null);setPanel('import');};

  const showManager=()=>{if(!siteOpen)return;setSelectedFields(new Set(fields.map(f=>f.id)));setPanel('manager');};

  const exitApp=()=>{if(busy)return;setCloseTarget('app');if(dirty)setPanel('close');else if(isTauri())getCurrentWindow().destroy().catch(error=>setNotice(String(error)));};

  const finishClose=async(target:'site'|'app')=>{if(target==='app'){if(isTauri())await getCurrentWindow().destroy();return;}if(isTauri()){await invoke('stop_preview');await invoke('reset_project');}setSiteOpen(false);setDirty(false);setExternal(false);setSelectedNode(null);setSelectedBlock(null);undo.current=[];redo.current=[];setPanel(null);setNotice('Site closed.');};

  const closeSite=()=>{setCloseTarget('site');if(dirty)setPanel('close');else void run(()=>finishClose('site'));};

  const sourceAvailable=layout!=='preview'&&project.files[file]!==undefined;

  const clipboardEdit=async(action:'cut'|'copy'|'paste')=>{

    const view=editor.current?.view;if(!view)return;

    try{

      const {from,to}=view.state.selection.main;

      if(action==='paste'){const text=await navigator.clipboard.readText();view.dispatch({changes:{from,to,insert:text},selection:{anchor:from+text.length}});}

      else if(from!==to){await navigator.clipboard.writeText(view.state.sliceDoc(from,to));if(action==='cut')view.dispatch({changes:{from,to,insert:''},selection:{anchor:from}});}

      view.focus();

    }catch{setNotice('Clipboard access was unavailable. Focus the source editor and use Ctrl+C, Ctrl+X or Ctrl+V.');}

  };

  const handleShortcut=(event:KeyboardEvent)=>{

    const key=event.key.toLowerCase();if(busy&&key==='f1'){event.preventDefault();return;}

    if(key==='escape'&&pendingMarkup){setPendingMarkup(null);setNotice('Placement cancelled.');return;}

    if(key==='f1'&&(event.ctrlKey||event.metaKey)){event.preventDefault();setRibbonVisible(v=>!v);return;}

    if(key==='f1'){event.preventDefault();showHelp();return;}

    if(!(event.ctrlKey||event.metaKey)||event.altKey)return;

    const normalInput=(event.target as Element)?.closest?.('input,textarea,select');

    if(normalInput&&['z','y'].includes(key))return;

    const commands:Record<string,()=>void>={n:()=>setPanel('new'),o:open,s:()=>save(event.shiftKey),i:showImport,e:exportSite,z:()=>history(event.shiftKey?'redo':'undo'),y:()=>history('redo'),',':()=>setPanel('settings')};

    const command=commands[key];if(!command)return;event.preventDefault();if(panel!==null||busy)return;event.stopPropagation();command();

  };

  useEffect(()=>{window.addEventListener('keydown',handleShortcut,true);return()=>window.removeEventListener('keydown',handleShortcut,true);});

  const menus:MenuGroup[]=[

    {label:'File',items:[

      {label:'Close site',disabled:busy||!siteOpen,action:closeSite},

      {label:'Preview in Browser',disabled:busy,action:browserPreview},

      {label:'Stop browser preview',disabled:busy||!isTauri(),action:()=>run(async()=>{await invoke('stop_preview');setNotice('Browser preview stopped.');})},null,

      {label:'Open encrypted project…',disabled:busy,action:()=>{setVaultMode('open');setVaultPayload(null);setVaultClose(null);setPanel('vault');}},

      {label:'New site…',shortcut:'Ctrl+N',disabled:busy,action:()=>setPanel('new')},

      {label:'Download a site…',disabled:busy,action:()=>setPanel('download')},

      {label:'Open folder…',shortcut:'Ctrl+O',disabled:busy,action:open},

      {label:'Import files or site…',shortcut:'Ctrl+I',disabled:busy,action:showImport},null,

      {label:'Save',shortcut:'Ctrl+S',disabled:busy,action:()=>save()},

      {label:'Save project as…',shortcut:'Ctrl+Shift+S',disabled:busy,action:()=>save(true)},

      {label:'Reload from disk…',disabled:busy||!project.root,action:reload},null,

      {label:'Export website…',shortcut:'Ctrl+E',disabled:busy,action:exportSite},

      {label:'Export site with admin portal…',disabled:busy,action:showManager},null,

      {label:'Exit Webbit',disabled:busy||!isTauri(),action:exitApp}]},

    {label:'Edit',items:[

      {label:'Undo',shortcut:'Ctrl+Z',disabled:busy||!undo.current.length,action:()=>history('undo')},

      {label:'Redo',shortcut:'Ctrl+Y',disabled:busy||!redo.current.length,action:()=>history('redo')},null,

      {label:'Cut source selection',shortcut:'Ctrl+X',disabled:busy||!sourceAvailable,action:()=>{void clipboardEdit('cut');}},

      {label:'Copy source selection',shortcut:'Ctrl+C',disabled:!sourceAvailable,action:()=>{void clipboardEdit('copy');}},

      {label:'Paste into source',shortcut:'Ctrl+V',disabled:busy||!sourceAvailable,action:()=>{void clipboardEdit('paste');}},

      {label:'Select all source',shortcut:'Ctrl+A',disabled:!sourceAvailable,action:()=>{const view=editor.current?.view;if(view){view.dispatch({selection:{anchor:0,head:view.state.doc.length}});view.focus();}}}]},

    {label:'View',items:[

      {label:'Show ribbon',shortcut:'Ctrl+F1',checked:ribbonVisible,action:()=>setRibbonVisible(v=>!v)},

      {label:'Block editing',checked:blockMode,action:()=>{setBlockMode(!blockMode);setLayout('preview');}},

      {label:'Split source and preview',checked:layout==='split',action:()=>setLayout('split')},

      {label:'Source only',checked:layout==='code',action:()=>setLayout('code')},

      {label:'Visual only',checked:layout==='preview',action:()=>setLayout('preview')},

      {label:'Swap panes',disabled:layout!=='split',checked:swapped,action:()=>setSwapped(!swapped)},null,

      ...(['desktop','tablet','phone','reading'] as const).map(v=>({label:v[0].toUpperCase()+v.slice(1)+' view',checked:viewport===v,action:()=>setViewport(v)})),null,

      {label:'Reset pane widths',action:()=>setRatio(47)}]},

    {label:'Tools',items:[

      {label:'Member Access…',action:()=>setPanel('access')},

      {label:'Element Gallery…',action:()=>setPanel('gallery')},

      {label:'Import table data…',action:()=>setPanel('data')},

      {label:'Special Effects…',action:()=>setPanel('effects')},

      {label:'Security & Compatibility Guard',action:()=>setPanel('guard')},

      {label:'Build Admin',action:showManager},null,

      {label:'Insert selected file into page',disabled:busy||!file||!/\.html?$/i.test(page),action:()=>insertFile(file)},

      {label:'Import images…',disabled:busy,action:addImage},null,

      {label:'AI project guide',action:()=>showHelp('ai')}]},

    {label:'Settings',items:[

      {label:'Encryption…',disabled:!siteOpen,action:()=>setPanel('encryption')},

      {label:'Preferences…',shortcut:'Ctrl+,',action:()=>setPanel('settings')},null,

      ...(['beginner','advanced','developer'] as const).map(value=>({label:`${value[0].toUpperCase()+value.slice(1)} workspace`,checked:mode===value,action:()=>{setMode(value);setLayout(value==='beginner'?'preview':'split');}})),null,

      {label:'Minimize to taskbar',disabled:!isTauri(),action:()=>{getCurrentWindow().minimize().catch(error=>setNotice(String(error)));}}]},

    {label:'Help',items:[

      {label:'Webbit help',shortcut:'F1',action:()=>showHelp()},

      {label:'Import and project files',action:()=>showHelp('files')},

      {label:'Keyboard shortcuts',action:()=>showHelp('menus')},

      {label:'Licensing and support',action:()=>showHelp('licensing')},null,

      {label:'About Webbit',action:()=>setPanel('about')}]}

  ];

  const source=<section className="pane source-pane"><div className="pane-head"><span><i className="dot violet"/>Source</span><span className="muted filename">{file}</span></div><button onClick={()=>insertFile(file)} disabled={!file||!/\.html?$/i.test(page)}>Insert file into page</button>{project.assets[file]&&project.files[file]===undefined?<div className="asset-preview"><p>{file}</p>{/^data:image\//.test(project.assets[file])&&<img src={project.assets[file]} alt={file}/>}<p>This asset is preserved as a file. Use Insert file into page to add an image, media element or download link.</p></div>:<CodeMirror ref={editor} value={project.files[file]??''} height="100%" theme={resolvedTheme==='dark'?editorTheme:'light'} extensions={[EditorView.lineWrapping,/\.html?$/i.test(file)?html():/\.css$/i.test(file)?css():javascript()]} onChange={value=>change(file,value)} aria-label={`Source of ${file}`}/>}</section>;

  const preview=<section className="pane"><div className="pane-head"><span><i className="dot green"/>Your website</span><div className="segmented">{(['desktop','tablet','phone','reading'] as const).map(v=><button key={v} className={viewport===v?'active':''} onClick={()=>setViewport(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div></div><Preview project={project} page={page} onChange={value=>change(page,value)} onSelect={(offset,id)=>{setSelectedNode(id);const candidates=blocks(project.files[page]??'').filter(b=>offset>=b.start&&offset<b.end);setSelectedBlock(candidates.at(-1)?.id??null);jump(offset);}} viewport={viewport} onShortcut={handleShortcut} onFollowLink={followLink} navigation={navigation} canvas={{snapping,rulers,onHideRulers:()=>setRulers(false),onDeselect:()=>{setCanvasSelection([]);setSelectedNode(null);setSelectedBlock(null);},canPaste:()=>!!elementClipboard.current,clipboardText:()=>elementClipboard.current?.items.map(item=>item.markup).join('\n')??'',onCopy:items=>{elementClipboard.current=copyElements(project.files[page],page,items);pasteCount.current=0;setNotice(`Copied ${elementClipboard.current.items.length} elements. Use Ctrl+V or right-click Paste elements.`);const markup=elementClipboard.current.items.map(item=>item.markup).join('\n');void navigator.clipboard?.writeText(markup).catch(()=>{});return markup;},onPaste:(point,origin)=>{try{if(!elementClipboard.current)return;const result=pasteElements(project.files[page],page,elementClipboard.current,point,24*(++pasteCount.current),origin);canvasAction(()=>result.source);setCanvasSelection(result.tokens);const id=sourceNodes(result.source).findIndex(n=>n.attrs.some(a=>a.name==='data-wb-canvas-id'&&result.tokens.includes(a.value)));setSelectedNode(id<0?null:id);setNotice('Elements pasted. Undo is available.');}catch(error){setNotice(String(error));}},selectedTokens:canvasSelection,enabled:viewport!=='reading',onSelect:id=>setSelectedNode(id),onEdit:edit=>{try{const result=editCanvasSelection(project.files[page],edit);canvasAction(()=>result.source);setCanvasSelection(result.tokens);const selectedIndex=sourceNodes(result.source).findIndex(n=>n.attrs.some(a=>a.name==='data-wb-canvas-id'&&result.tokens.includes(a.value)));setSelectedNode(selectedIndex<0?null:selectedIndex);}catch(error){setNotice(String(error));}},tool:viewport==='reading'?'select':canvasTool,markup:viewport==='reading'?null:pendingMarkup,onDraw:(id,r)=>canvasAction(()=>placeElement(project.files[page],id,pendingMarkup!,r),true),onMove:(id,parent,r)=>canvasAction(()=>relocateElement(project.files[page],id,parent,r)),onResize:(id,w,h)=>canvasAction(()=>resizeElement(project.files[page],id,w,h)),onError:setNotice}}/></section>;

  return <div className="app">

    <header className="app-header"><div className="brand"><img src="/hare/logo-no-words.svg" alt="Vinny, Webbit mascot"/><div><strong>WEBBIT</strong><span>RAVITZ COMPUTERS</span></div><small>BETA 1</small></div><div className="header-controls"><MenuBar groups={menus} disabled={panel!==null}/><nav className="quick-actions" aria-label="Quick actions"><button onClick={browserPreview} disabled={busy||!siteOpen}>Preview in Browser</button><button onClick={()=>save()} disabled={busy||!siteOpen} title="Save project (Ctrl+S)">{dirty?'Save •':'Save'}</button><button className="primary" onClick={exportSite} disabled={busy||!siteOpen} title="Export website (Ctrl+E)">Export site ↗</button></nav></div></header>

    <Ribbon visible={ribbonVisible} onToggle={()=>setRibbonVisible(v=>!v)} disabled={busy||panel!==null||!siteOpen} context={siteOpen&&selected&&selectedNode!==null?{key:page+':'+selectedNode,label:contextualLabel(selected.tagName,selected.attrs),content:<ElementRibbon fontFamilies={projectFonts(project).map(f=>f.family)} onImportFont={()=>{setSettingsTab('Fonts');setPanel('settings');}} page={page} assetPaths={Object.keys(project.assets).filter(p=>/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(p)).concat(Object.keys(project.files).filter(p=>/\.svg$/i.test(p)))} source={project.files[page]??''} id={selectedNode} onSelect={setSelectedNode} onChange={value=>change(page,value)} onError={setNotice}/>} : undefined} groups={{

      Design:[{label:'Page background',hint:'Fill, gradients and images',run:()=>{setSelectedNode(sourceNodes(project.files[page]??'').findIndex(n=>n.tagName==='body'));}}],

      Home:[{label:'Save',hint:'Write project files',run:()=>save()},{label:'Preview in Browser',hint:'Run the current snapshot',run:browserPreview},{label:'Export site',hint:'Create deployment files',run:exportSite}],

      Insert:[{label:'Element Gallery',hint:'Choose and draw on the page',run:()=>setPanel('gallery')},{label:'Blocks',hint:'Content, layout and interactive',run:()=>{setBlockMode(true);setLayout('preview');}},{label:'Images & files',hint:'Import local assets',run:showImport},{label:'Table data',hint:'CSV, TSV and JSON',run:()=>setPanel('data')},{label:'Special Effects',hint:'Site, page or block',run:()=>setPanel('effects')}],

      View:[{label:'Visual',hint:'Edit on the page',run:()=>setLayout('preview')},{label:'Split',hint:'Source beside preview',run:()=>setLayout('split')},{label:'Source',hint:'Edit ordinary HTML/CSS/JS',run:()=>setLayout('code')},{label:'Blocks',hint:'Show section outline',run:()=>setBlockMode(v=>!v)},{label:'Phone',hint:'390 px preview',run:()=>setViewport('phone')},{label:'Tablet',hint:'768 px preview',run:()=>setViewport('tablet')}],

      Access:[{label:'Encryption',hint:'Sensitive only or all stored files',run:()=>setPanel('encryption')},{label:'Admin Access',hint:'Site owner and content editing',run:showManager},{label:'Member Access',hint:'Visitor login and protected pages',run:()=>setPanel('access')},{label:'Login link',hint:'Draw a visitor sign-in link',run:()=>addBlock('<a class="button" href="/members/">Member sign in</a>')}],

      Tools:[{label:'Guard',hint:'Security and compatibility',run:()=>setPanel('guard')},{label:'Build Admin',hint:'Generate a website manager',run:showManager},{label:'Preferences',hint:'Window and workspace',run:()=>setPanel('settings')},{label:'Help',hint:'Offline documentation',run:()=>showHelp()}]

    }}/>

    <div className="project-bar"><div><span className="project-icon">◇</span><strong>{siteOpen?project.name:'Welcome'}</strong><span className="muted">{siteOpen?(project.root?'Local project':'Unsaved site'):'No site open'}</span></div><label>Workspace <select value={mode} onChange={e=>{const next=e.target.value as typeof mode;setMode(next);setLayout(next==='beginner'?'preview':'split');}}><option value="beginner">Beginner</option><option value="advanced">Advanced</option><option value="developer">Developer</option></select></label></div>

    {external&&<div className="external">Files changed outside Webbit. Reload to review them before saving.<button onClick={reload}>Reload from disk</button></div>}

    {siteOpen?<div className="body-grid"><aside className="sidebar"><div className="side-heading">YOUR PROJECT <span>{pages.length} pages</span></div><div className="file-controls"><label>Show<select value={fileFilter} onChange={e=>setFileFilter(e.target.value as FileKind)}>{fileKinds.map(kind=><option key={kind}>{kind}</option>)}</select></label><label>Sort<select value={fileSort} onChange={e=>setFileSort(e.target.value as typeof fileSort)}><option value="name">Name</option><option value="type">Type, then name</option></select></label></div><div className="file-list">{visibleFiles.map(path=><button key={path} title={`${path} (${fileKind(path)})`} className={file===path?'selected':''} onClick={()=>{setFile(path);if(/\.(?:html?|php)$/i.test(path))setPage(path);}}><span>{project.assets[path]?'▧':/\.html?$/i.test(path)?'▤':'⌘'}</span>{path}</button>)}</div><div className="add-page"><input aria-label="New page filename" placeholder="new-page.html" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addPage();}}/><button onClick={addPage} title="Add page">+</button></div><button onClick={()=>{setBlockMode(!blockMode);setLayout('preview');}}>{blockMode?'Hide block outline':'Block mode'}</button><button onClick={()=>setPanel('gallery')}>Element Gallery</button><button onClick={()=>setPanel('effects')}>Special Effects</button>{blockMode&&<BlockEditor project={project} page={page} selected={selectedBlock} onSelect={id=>{setSelectedBlock(id);setSelectedNode(id);jump(sourceOffset(project.files[page],id));}} onChange={changeFiles} onError={setNotice}/>}<div className="side-heading">ADD TO PAGE</div><div className="block-grid"><button onClick={()=>addBlock('<section><h2>Your heading</h2><p>Tell visitors something useful.</p></section>')}>T <span>Text</span></button><button onClick={addImage}>▧ <span>Image</span></button><button onClick={()=>addBlock('<a class="button" href="about.html">Learn more</a>')}>↗ <span>Button</span></button><button onClick={()=>addBlock('<section class="cards"><article><h2>Your service</h2><p>A short, helpful description.</p></article></section>')}>▣ <span>Card</span></button></div>{selected&&selectedNode!==null&&<div className="properties"><div className="side-heading">SELECTED: {selected.tagName.toUpperCase()}</div>{(['id','class','title',...(selected.tagName==='img'?['src','alt']:[]),...(selected.tagName==='a'?['href']:[]),'style']).map(name=><label key={name}>{name==='style'?'CSS style':name}<input aria-label={`Element ${name}`} value={selected.attrs.find(a=>a.name===name)?.value??''} onChange={e=>{try{change(page,setElementAttribute(project.files[page],selectedNode,name,e.target.value));}catch(error){setNotice(String(error));}}}/></label>)}<div className="element-actions"><button onClick={()=>{try{change(page,moveElement(project.files[page],selectedNode,'up'));setSelectedNode(null);}catch(error){setNotice(String(error));}}}>Move up</button><button onClick={()=>{try{change(page,moveElement(project.files[page],selectedNode,'down'));setSelectedNode(null);}catch(error){setNotice(String(error));}}}>Move down</button><button onClick={()=>{try{change(page,removeElement(project.files[page],selectedNode));setSelectedNode(null);}catch(error){setNotice(String(error));}}}>Remove</button></div></div>}<div className="sidebar-bottom"><button className="guard-launch" onClick={()=>setPanel('guard')}><span>◈ Security & Compatibility</span><b className={critical?'danger':''}>{findings.filter(f=>f.level!=='deployment').length}</b></button><button onClick={()=>{setSelectedFields(new Set(fields.map(f=>f.id)));setPanel('manager');}}>Build Admin <small>CREATE</small></button><button onClick={()=>{setHelp('ai');setPanel('help');}}>Working with AI</button><button onClick={()=>setPanel('about')}>About Webbit</button></div></aside>

      <div className="editor-area"><div className="workspace-tools"><label className="canvas-mode">Canvas <select value={canvasTool} onChange={e=>{setCanvasTool(e.target.value as typeof canvasTool);setPendingMarkup(null);}}><option value="select">Select / edit text / drag</option><option value="move">Drag to move</option><option value="resize">Drag to resize</option><option value="rotate">Rotate (Ctrl+drag)</option></select></label><div className="segmented"><button className={layout==='split'?'active':''} onClick={()=>setLayout('split')}>Split</button><button className={layout==='code'?'active':''} onClick={()=>setLayout('code')}>Source</button><button className={layout==='preview'?'active':''} onClick={()=>setLayout('preview')}>Visual</button></div><button onClick={()=>setSwapped(!swapped)} disabled={layout!=='split'}>⇄ Swap</button><div className="spacer"/><button onClick={()=>history('undo')} disabled={!undo.current.length}>↶ Undo</button><button onClick={()=>history('redo')} disabled={!redo.current.length}>↷ Redo</button></div><div ref={workspace} className="workspace" style={{gridTemplateColumns:layout==='split'?`minmax(0,${ratio}fr) 6px minmax(0,${100-ratio}fr)`:'minmax(0,1fr)'}}>{layout==='split'?<>{swapped?preview:source}<div className="divider" role="separator" aria-label="Resize source and preview" aria-valuenow={Math.round(ratio)} tabIndex={0} onPointerDown={()=>drag.current=true} onKeyDown={e=>{if(e.key==='ArrowLeft')setRatio(r=>Math.max(22,r-3));if(e.key==='ArrowRight')setRatio(r=>Math.min(78,r+3));}}/>{swapped?source:preview}</>:layout==='code'?source:preview}</div></div></div>

    :<main className="welcome-screen"><img src="/hare/hello.svg" alt="Vinny waving"/><div><p className="eyebrow">WELCOME TO WEBBIT</p><h1>What would you like to create?</h1><p>Start fresh, open your work, or bring in an existing website.</p><div className="welcome-actions"><button className="primary" onClick={()=>setPanel('new')}>New site</button><button onClick={open}>Open a site</button><button onClick={()=>setPanel('download')}>Download a site · URL</button></div><button onClick={()=>showHelp()}>Explore the help</button></div></main>}

    <footer className="status-bar" role="status"><span className="status-dot"/>{busy?'Working…':notice}<span className="status-right">Local first · No account required</span></footer>

    {panel&&<div className="modal-backdrop" onClick={()=>{if(!busy)setPanel(null);}}><section className={`modal ${panel==='help'?'help-modal':''}`} role="dialog" aria-modal="true" aria-label={panel} onClick={e=>e.stopPropagation()}><button className="modal-close" disabled={busy} onClick={()=>setPanel(null)}>Close ×</button>

      {panel==='external-link'&&<><h1>Open external website?</h1><p>This link opens a website outside your project in your default browser.</p><p style={{overflowWrap:'anywhere'}}><code>{externalLink}</code></p><button className="primary" disabled={busy} onClick={openExternalLink}>Open in browser</button><button disabled={busy} onClick={()=>setPanel(null)}>Cancel</button></>}

      {panel==='encryption'&&<><h1>Encryption and storage</h1><label className="setting-option"><input type="radio" name="storage" checked={storageMode(project)==='sensitive'} onChange={()=>change('webbit.security.json',JSON.stringify({version:1,storage:'sensitive'},null,2))}/>Sensitive information only · default</label><p>TOTP secrets are encrypted automatically. Passwords and recovery codes are hashed. Ordinary project files remain directly editable.</p><label className="setting-option"><input type="radio" name="storage" checked={storageMode(project)==='full'} onChange={()=>change('webbit.security.json',JSON.stringify({version:1,storage:'full'},null,2))}/>All files · encrypted projects, backups and deployment packages</label><p>Save writes a password-protected .wbe snapshot containing all project files and assets. Export creates an encrypted deployment package. Your earlier plaintext files are not deleted. For full deployed storage protection, your hosting provider must encrypt the server volume, databases, logs, temporary storage and backups. Webbit cannot configure or verify remote disk encryption. HTTPS remains required; visitors can read content delivered to them.</p><button onClick={()=>{setVaultMode('save');setVaultPayload(null);setVaultClose(null);setPanel('vault');}}>Save encrypted backup now</button></>}

      {panel==='vault'&&<VaultDialog mode={vaultMode} payload={vaultPayload??{kind:'project',files:project.files,assets:project.assets}} onBusy={setBusy} onOpened={async payload=>{native();if(dirty&&!window.confirm('Replace unsaved work with this decrypted project?'))return;await invoke('reset_project');const next=projectFromFiles({...payload.files,'webbit.security.json':JSON.stringify({version:1,storage:'full'})},payload.assets);setProject(next);setFile(next.entry);setPage(next.entry);setSiteOpen(true);setDirty(false);setExternal(false);undo.current=[];redo.current=[];setSelectedNode(null);setPanel(null);setSelectedBlock(null);setNotice('Encrypted project unlocked in memory. Saving creates another encrypted snapshot.');}} onSaved={async()=>{setPanel(null);if(!vaultPayload){setDirty(false);setNotice('Encrypted project snapshot saved. Earlier files were not changed.');if(vaultClose)await finishClose(vaultClose);}else setNotice('Encrypted deployment package saved. Restore only onto encrypted host storage; see help/ENCRYPTED-STORAGE.md.');}}/>}

      {panel==='access'&&<MemberAccess project={project} onSave={config=>{change('webbit.access.json',JSON.stringify(config,null,2));setPanel(null);setNotice('Member access settings saved. Export to generate the PHP login and protected-page routes.');}}/>}

      {panel==='data'&&<DataImport project={project} page={page} onChange={changeFiles} onClose={()=>setPanel(null)}/>} 

      {panel==='effects'&&<EffectsGallery project={project} page={page} selected={selectedBlock} onChange={changeFiles} onClose={()=>setPanel(null)} onError={setNotice}/>} 

      {panel==='google'&&<><h1>Live Google Reviews</h1><p>This optional integration needs PHP hosting, Google Places API (New), billing and a server API key. Google may return a limited selection of reviews. The API key is never placed in browser code.</p><label>Google Place ID<input value={googlePlaceId} onChange={e=>setGooglePlaceId(e.target.value)} placeholder="ChIJ…"/></label><p>Configure the key and Place ID as server environment variables after export. Setup instructions are saved under private/GOOGLE-REVIEWS-SETUP.md in your project.</p><button className="primary" onClick={()=>{try{changeFiles(googleReviewFiles(project,googlePlaceId));setPanel(null);addBlock(googleReviewMarkup(page));}catch(e){setNotice(String(e));}}}>Create connector and place reviews</button></>}

      {panel==='gallery'&&<ElementGallery onGoogle={()=>setPanel('google')} onChoose={markup=>{setPanel(null);addBlock(markup);}}/>}

      {panel==='download'&&<><h1>Download a website</h1><p>Copy public HTML pages and same-site assets into a new unsaved project. Server code, databases and authenticated content cannot be downloaded this way. Up to 60 resources / 30 MB; some external or dynamic content may remain online.</p><label>Website URL<input type="url" value={downloadUrl} onChange={e=>setDownloadUrl(e.target.value)} placeholder="https://example.com/"/></label><button disabled={busy} className="primary" onClick={()=>run(async()=>{native();if(dirty&&!window.confirm('Replace current unsaved work with the downloaded site?'))return;const next=await downloadSite(downloadUrl,setNotice);await invoke('reset_project');setProject(next);setPage(next.entry);setFile(next.entry);setSiteOpen(true);setDirty(true);setExternal(false);setSelectedNode(null);setSelectedBlock(null);undo.current=[];redo.current=[];setPanel(null);setNotice('Downloaded into the editor. Review private/download-report.txt and save to a new folder.');})}>Download site</button></>}

      {panel==='settings'&&<><h1>Preferences</h1><div className="settings-tabs" role="tablist" aria-label="Preferences sections">{['Appearance','Usability','Fonts','Window'].map(name=><button key={name} role="tab" id={'settings-'+name} aria-controls="settings-panel" aria-selected={settingsTab===name} onClick={()=>setSettingsTab(name)}>{name}</button>)}</div><section id="settings-panel" role="tabpanel" aria-labelledby={'settings-'+settingsTab}>{settingsTab==='Appearance'&&<><h2>Theme and interface size</h2><div className="appearance-options"><label>Color theme<select aria-label="Color theme" value={appTheme} onChange={e=>setAppTheme(validTheme(e.target.value))}><option value="dark">Dark</option><option value="light">Light</option><option value="system">Follow system</option></select></label><label>Interface scale<select aria-label="Interface scale" value={uiScale} onChange={e=>setUiScale(validScale(e.target.value))}>{[75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150].map(n=><option key={n} value={n}>{n}%{n===defaultUiScale?' · Default':n===75?' · Most workspace':n===150?' · Largest controls':''}</option>)}</select></label></div><p>Smaller sizes leave more room for your work. Larger sizes make text, menus and controls easier to read. Changes apply immediately and are saved on this computer. Your website retains its own colors, fonts and CSS pixel sizes.</p><button onClick={()=>{setAppTheme('dark');setUiScale(defaultUiScale);}}>Reset appearance</button></>}{settingsTab==='Usability'&&<><h2>Canvas and workspace</h2><label className="setting-option"><input type="checkbox" checked={snapping} onChange={e=>setSnapping(e.target.checked)}/> Snap moving elements to page and element edges and centers</label><label className="setting-option"><input type="checkbox" checked={rulers} onChange={e=>setRulers(e.target.checked)}/> Show top and left rulers (CSS pixels)</label><label className="setting-option"><input type="checkbox" checked={ribbonVisible} onChange={e=>setRibbonVisible(e.target.checked)}/> Show the compact ribbon</label><p>Click directly on text to edit it. Drag padding or backgrounds to move elements. Shift-click selects a group; Ctrl-drag rotates. Right-click an element for layer ordering. Preferences are saved on this computer.</p></>}{settingsTab==='Fonts'&&<FontManager project={project} disabled={!siteOpen||busy} onChange={next=>{undo.current.push({files:projectRef.current.files,assets:projectRef.current.assets});if(undo.current.length>50)undo.current.shift();redo.current=[];setProject(next);setDirty(true);setHistoryTick(t=>t+1);setNotice('Font imported. Select it in the element ribbon under Typography.');}}/>}{settingsTab==='Window'&&<><h2>Window and background behavior</h2><p>Only one Webbit instance runs at a time. Launching it again restores the existing window.</p><label className="setting-option"><input type="checkbox" checked={minimizeOnClose} onChange={e=>setMinimizeOnClose(e.target.checked)}/> Keep running on the taskbar when I close the window</label><p>The current project stays open while minimized. This does not save unsaved changes automatically or start Webbit with Windows.</p><button disabled={!isTauri()} onClick={()=>getCurrentWindow().minimize().catch(error=>setNotice(String(error)))}>Minimize to taskbar</button><button disabled={busy||!isTauri()} onClick={()=>{if(dirty){setCloseTarget('app');setPanel('close');}else getCurrentWindow().destroy().catch(error=>setNotice(String(error)));}}>Exit Webbit</button></>}</section></>}

      {panel==='import'&&<><p className="eyebrow">FILES, ASSETS AND WHOLE WEBSITES</p><h1>Bring your work into Webbit.</h1><p>Import images, scripts, stylesheets, fonts, documents and media, or copy a whole website from a folder or ZIP. Files keep their relative paths. Nothing runs during import.</p><div className="import-actions"><button disabled={busy} onClick={()=>chooseImport('files')}>Choose files</button><button disabled={busy} onClick={()=>chooseImport('folder')}>Choose folder / whole site</button><button disabled={busy} onClick={()=>chooseImport('zip')}>Choose site ZIP</button></div>{importBatch&&<><h2>{importPaths(importBatch).length} files ready to review</h2>{importKind!=='files'&&<label className="setting-option"><input type="checkbox" checked={importWhole} onChange={e=>setImportWhole(e.target.checked)}/> Import as a new site copy</label>}{importWhole?<><p>The imported site starts as an unsaved project. Save it to an empty destination folder. Use Open folder instead to work directly in the original folder.</p>{importKind==='zip'&&<label className="setting-option"><input type="checkbox" checked={stripRoot} onChange={e=>setStripRoot(e.target.checked)}/> Remove a single enclosing folder if every file shares it</label>}</>:<><label>Destination folder (blank means project root)<input aria-label="Import destination folder" value={importPrefix} onChange={e=>setImportPrefix(e.target.value)} placeholder="assets, scripts, or leave blank"/></label><p>{importPlan.filter(p=>p.conflict).length} existing file conflicts. Conflicting files are skipped unless replacement is selected.</p><label className="setting-option"><input type="checkbox" checked={importReplace} onChange={e=>setImportReplace(e.target.checked)}/> Replace conflicting files in the editor (Undo available)</label></>}{importError&&<p role="alert">{importError}</p>}<div className="import-list">{(importWhole?importPaths(importBatch).map(path=>({path,destination:path,conflict:undefined as string|undefined})):importPlan).map(item=><div key={item.path}><code>{item.destination}</code>{item.conflict&&<strong> — conflicts with {item.conflict}</strong>}</div>)}</div>{importBatch.skipped.length>0&&<details><summary>{importBatch.skipped.length} skipped paths (dependencies, secrets or links)</summary><pre>{importBatch.skipped.join('\n')}</pre></details>}<p>Limits: 50 MB per file, 200 MB total, 5,000 files. Scripts stay inactive in the editing preview; server code needs its own runtime.</p><button className="primary" disabled={busy||!!importError||!importPaths(importBatch).length} onClick={acceptImport}>{importWhole?'Import site copy':'Import selected content'}</button></>}</>}

      {panel==='close'&&<><h1>Save your changes?</h1><p>This project has unsaved edits.</p><button className="primary" disabled={busy} onClick={()=>run(async()=>{if(storageMode(projectRef.current)==='full'){setVaultMode('save');setVaultPayload(null);setVaultClose(closeTarget);setPanel('vault');return;}const snapshot=await invoke<Snapshot|null>('save_project',{files:projectRef.current.files,assets:projectRef.current.assets,saveAs:!projectRef.current.root});if(snapshot)await finishClose(closeTarget);})}>Save and close</button><button disabled={busy} onClick={()=>run(()=>finishClose(closeTarget))}>Discard and close</button><button onClick={()=>setPanel(null)}>Cancel</button></>}

      {panel==='new'&&<><div className="modal-mascot"><img src="/hare/hello.svg" alt="Vinny waving"/><div><p className="eyebrow">LET’S MAKE SOMETHING</p><h1>Your next website starts here.</h1><p>Start blank, choose a category, or search for a template.</p></div></div><TemplateGallery onChoose={newProject}/></>}

      {panel==='guard'&&<><p className="eyebrow">SOURCE CHECKS + DEPLOYMENT GUIDANCE</p><h1>Security & Compatibility Guard</h1><p>{critical?`${critical} critical finding${critical===1?'':'s'} block export.`:'No critical findings in the current source checks.'} A clean scan is not a security certification.</p><div className="findings">{findings.map((finding,index)=><article key={`${finding.path}-${finding.id}-${index}`} className={finding.level}><div><b>{finding.level}</b><code>{finding.path?`${finding.path}:${finding.line}`:'Deployment check'}</code></div><p>{finding.message}</p><div className="finding-actions"><button onClick={()=>go(finding)}>{finding.path?'Go to problem':'Deployment help'}</button>{finding.fix&&<button onClick={()=>{change(finding.path,applySafeFix(project.files[finding.path],finding.fix));setNotice('Safe fix applied. Guard has rescanned; Undo is available.');}}>Fix</button>}<button onClick={()=>{setHelp(finding.help);setPanel('help');}}>Learn more</button></div></article>)}</div></>}

      {panel==='help'&&<><p className="eyebrow">OFFLINE HELP</p><h1>Make yourself at home.</h1><div className="help-layout"><nav>{Object.entries(helpArticles).map(([id,article])=><button key={id} className={help===id?'selected':''} onClick={()=>setHelp(id)}>{article.title}</button>)}</nav><article><h2>{helpArticles[help]?.title}</h2><p>{helpArticles[help]?.text}</p><p className="muted">Need a hand? support@ravitzcomputers.com</p></article></div></>}

      {panel==='about'&&<><div className="modal-mascot"><img src="/hare/love.svg" alt="Vinny"/><div><p className="eyebrow">RAVITZ COMPUTERS</p><h1>Webbit</h1><p>Beta 1 · Created September 15, 2026</p><p>Build it visually. Make it your own.</p></div></div><p>Webbit is a free tool, created as a fun side project with help from AI.</p><p>Core editing works locally, without an account, paid API or cloud service. Support: support@ravitzcomputers.com</p><h2>Vinny & Ravitz artwork</h2><p>Vinny, Ravitz Computers logos, the medallion and associated branding are proprietary Ravitz Computers assets, excluded from the MIT license. They are not automatically licensed for use in your exported websites.</p><details><summary>Webbit source — MIT License</summary><pre>{license}</pre></details><details><summary>Third-party software notices</summary><pre>{notices}</pre></details></>}

      {panel==='manager'&&<><p className="eyebrow">BUILD ADMIN · SITE ANALYSIS</p><h1>Export a website with an admin portal.</h1><p>This optional export adds a PHP admin portal so the site owner can edit selected content after deployment. It needs PHP hosting and server setup. Use Export site for an ordinary website without an admin portal.</p><p>Found {fields.length} candidate fields. Choose what a website owner should be able to manage.</p><div className="manager-note"><strong>Authentication design</strong><p>Password + mandatory TOTP + hashed recovery codes. Optional generic SMTP / Resend. Authenticator secrets use automatic libsodium authenticated encryption with a 256-bit private server key. No required cloud service.</p><p>Exports include a PHP manager with local setup, TOTP and recovery codes. Set public/ as your server document root. Manage selected page fields, upload images and update account security. Optional SMTP enables password reset with TOTP. Repeating collections require source editing.</p></div><div className="managed-fields">{fields.map(field=><label key={field.id}><input type="checkbox" checked={selectedFields.has(field.id)} onChange={e=>setSelectedFields(current=>{const next=new Set(current);if(e.target.checked)next.add(field.id);else next.delete(field.id);return next;})}/><span><strong>{field.label}</strong><small>{field.page} · {field.kind}</small></span></label>)}</div><button onClick={()=>{change('webbit.manager.json',JSON.stringify({version:1,status:'field-plan',securityRuntime:'webbit-php-1',fields:fields.filter(f=>selectedFields.has(f.id))},null,2));setPanel(null);setNotice('Manager analysis saved in webbit.manager.json. No live manager was generated.');}}>Save selected field plan</button><button className="primary" disabled={busy||!selectedFields.size} onClick={()=>run(async()=>{if(critical){setPanel('guard');setNotice('Resolve critical findings before exporting a manager.');return;}native();const {generateManager}=await import('./manager-export');const protectedPages=new Set(accessConfig(project).enabled?accessConfig(project).pages:[]);const allowed=new Set(fields.filter(f=>selectedFields.has(f.id)&&!protectedPages.has(f.page)).map(f=>f.id));const generated=await generateManager(project,allowed);await deliverExport(generated.files,'public/');})}>Export website + manager</button></>}

    </section></div>}

  </div>;

}

const root=createRoot(document.getElementById('root')!);

root.render(<React.StrictMode><App/></React.StrictMode>);

if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());









