import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],clearScreen:false,server:{strictPort:true,port:1420,watch:{ignored:['**/src-tauri/target/**','**/src-tauri/webview2-*/**','**/dist-release/**','**/*.wbe','**/*.log']}}});
