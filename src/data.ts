import {escapeHtml} from './blocks';
export type DataTable={name:string;columns:string[];rows:string[][]};
export function parseData(name:string,text:string):DataTable{
 if(text.length>2_000_000)throw new Error('Import at most 2 MB of text data.');
 let columns:string[]=[],rows:string[][]=[];
 if(/\.json$/i.test(name)){
  const value:unknown=JSON.parse(text);if(!Array.isArray(value)||value.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw new Error('JSON must be an array of row objects.');
  columns=[...new Set(value.flatMap(v=>Object.keys(v)))];rows=value.map(row=>columns.map(c=>row[c]===null||row[c]===undefined?'':typeof row[c]==='object'?JSON.stringify(row[c]):String(row[c])));
 }else{
  const delimiter=/\.tsv$/i.test(name)?'\t':',';const all:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  const source=text.replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
   if(c==='"'){if(field||closed)throw new Error('Malformed CSV quote.');quoted=true;}
   else if(c===delimiter){row.push(field);field='';closed=false;}
   else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);all.push(row);row=[];field='';closed=false;}
   else{if(closed)throw new Error('Unexpected text after a CSV quote.');field+=c;}
   if(all.length>2001||row.length>100)throw new Error('Limit: 2,000 data rows and 100 columns.');
  }
  if(quoted)throw new Error('Unclosed CSV quote.');if(field||row.length||closed){row.push(field);all.push(row);}
  columns=all.shift()??[];rows=all;
  if(rows.some(r=>r.length!==columns.length))throw new Error('Every CSV row must match the header column count.');
 }
 if(!columns.length||columns.length>100||rows.length>2000)throw new Error('Use 1–100 columns and at most 2,000 rows.');
 if(columns.some(c=>!c.trim())||new Set(columns).size!==columns.length)throw new Error('Column headings must be nonempty and unique.');
 return {name,columns,rows};
}
export function dataMarkup(table:DataTable,selected:number[],limit:number){if(!selected.length)throw new Error('Choose at least one public column.');if(selected.some(i=>!Number.isInteger(i)||i<0||i>=table.columns.length))throw new Error('Invalid column.');
 return `<section data-wb-block="Imported data" data-wb-component="filter"><h2>${escapeHtml(table.name)}</h2><label>Search <input type="search" placeholder="Filter rows"></label><p data-wb-status aria-live="polite"></p><div class="wb-table-scroll"><table><thead><tr>${selected.map(i=>`<th scope="col">${escapeHtml(table.columns[i])}</th>`).join('')}</tr></thead><tbody>${table.rows.slice(0,Math.max(0,Math.min(2000,limit))).map(row=>`<tr data-wb-row>${selected.map(i=>`<td>${escapeHtml(row[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
