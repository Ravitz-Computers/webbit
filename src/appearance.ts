export type AppTheme='dark'|'light'|'system';
export const defaultUiScale=85;
export function validTheme(value:unknown):AppTheme{return value==='light'||value==='system'?value:'dark';}
export function validScale(value:unknown):number{const n=Number(value);return Number.isFinite(n)&&n>=75&&n<=150?Math.round(n/5)*5:defaultUiScale;}
