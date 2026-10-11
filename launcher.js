import {spawn} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
let port=process.env.PORT||'4177';
try{const match=readFileSync(join(root,'.env.local'),'utf8').match(/^PORT=(\d+)\s*$/m);if(match&&!process.env.PORT)port=match[1];}catch{}
const url=`http://127.0.0.1:${port}`;
async function ready(){try{const res=await fetch(url+'/api/status',{signal:AbortSignal.timeout(1000)});const status=await res.json();return res.ok&&typeof status.token==='string'&&status.token.length===64;}catch{return false;}}
if(!await ready()){
 const child=spawn(process.execPath,['server.js'],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});child.unref();
 for(let i=0;i<30;i++){if(await ready())break;await new Promise(r=>setTimeout(r,250));}
}
if(!await ready()){console.error('AGR Studio could not start. Run npm start in this folder to see the error, or choose a free PORT in .env.local.');process.exitCode=1;}
else{
 console.log(`AGR Studio is running at ${url}`);
 if(process.platform==='win32'){
  const chrome=[join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Google/Chrome/Application/chrome.exe'),join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')].find(existsSync);
  if(chrome){const browser=spawn(chrome,[url],{detached:true,stdio:'ignore',windowsHide:true});browser.unref();}
  else console.log('Open the address above in Chrome. Chrome was not found in its normal installation folders.');
 }else console.log('Open the address above in your browser.');
}
