import {_electron as electron} from 'playwright';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const output=resolve('.impeccable/review/buttons');
const downloads=resolve('test-results/button-hover-downloads');await mkdir(downloads,{recursive:true});
const env={...process.env,ORBE_DOWNLOAD_DIRECTORY:downloads};delete env.ELECTRON_RUN_AS_NODE;
async function files(dir){let a=[];for(const e of await readdir(dir,{withFileTypes:true})){let p=join(dir,e.name);if(e.isDirectory()&&!e.name.includes('userdata')&&!e.name.includes('profile'))a.push(...await files(p));else if(e.name.endsWith('.mp3'))a.push(p);}return a;}
const media=(await files(resolve('test-results')))[0];assert.ok(media);
const app=await electron.launch({args:['.',`--user-data-dir=${resolve('test-results/button-hover-profile-'+Date.now())}`],env});
const evidence=[];
try{
 const page=await app.firstWindow();await page.emulateMedia({reducedMotion:'reduce'});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,960));
 await page.getByRole('button',{name:'Pular introdução',exact:true}).click();
 await app.evaluate(({dialog},path)=>Object.defineProperty(dialog,'showOpenDialog',{configurable:true,value:async()=>({canceled:false,filePaths:[path]})}),media);
 await page.getByRole('button',{name:'Biblioteca',exact:true}).click();await page.getByRole('button',{name:'Adicionar arquivos',exact:true}).click();await page.locator('.library-play').first().click();
 await page.locator('.mini-player').waitFor();await page.evaluate(()=>document.fonts.ready);
 for(const theme of ['dark','light']){
  if(theme==='light'){
   await page.getByRole('button',{name:'Configurações',exact:true}).click();await page.locator('#theme').selectOption('light');await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.locator('.app-shell[data-theme="light"]').waitFor();await page.getByRole('button',{name:'Biblioteca',exact:true}).click();
  }
  for(const width of [1440,1024]){
   await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,width===1440?960:760),width);
   const button=page.locator('.mini-player .orbe-button:is([aria-label="Pausar"],[aria-label="Reproduzir"])');
   await page.mouse.move(0,0);await page.waitForTimeout(220);
   const rest=await button.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color};});
   await button.hover();await page.waitForTimeout(240);
   const hover=await button.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,match:el.matches(':hover')};});
   assert.equal(hover.match,true);assert.equal(hover.color,rest.color);
   const rgb=hover.bg.match(/[\d.]+/g).map(Number).map(n=>hover.bg.startsWith('color(srgb')?n*255:n);
   assert.equal(theme==='dark'?rgb[0]>150:rgb[0]<100,true);
   await page.screenshot({path:join(output,`player-hover-${theme}-${width}.png`)});
   evidence.push({theme,width,rest,hover});
  }
 }
 await writeFile(join(output,'hover-metrics.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await app.close();}
