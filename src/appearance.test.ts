import {it,expect} from 'vitest';
import {validTheme,validScale} from './appearance';
it('restores supported themes and handles missing or invalid stored values',()=>{for(const t of ['light','dark','system'])expect(validTheme(t)).toBe(t);expect(validTheme(null)).toBe('dark');expect(validTheme('unknown')).toBe('dark');});
it('keeps saved UI scaling within usable bounds',()=>{expect(validScale(null)).toBe(85);expect(validScale('75')).toBe(75);expect(validScale('150')).toBe(150);expect(validScale('123')).toBe(125);for(const n of ['broken',0,50,200,Infinity])expect(validScale(n)).toBe(85);});
