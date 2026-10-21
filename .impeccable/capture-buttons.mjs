import { _electron as electron } from 'playwright';
import { mkdir, writeFile, readdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const output = resolve('.impeccable/review/buttons');
await mkdir(output, {recursive:true});
const env = {...process.env, ORBE_DOWNLOAD_DIRECTORY: resolve('test-results/button-preview-downloads')};
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({args:['.', `--user-data-dir=${resolve('test-results/button-preview-profile-'+Date.now())}`], env});
const errors=[]; const metrics=[];
try {
 const page = await app.firstWindow();
 page.on('pageerror', e=>errors.push(e.message));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,960));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('heading',{name:'Bem-vindo ao Orbe',exact:true}).waitFor();
 await page.evaluate(()=>document.fonts.ready);
 async function capture(name){
  await page.waitForTimeout(320);
  await page.screenshot({path:join(output,name+'.png')});
  metrics.push({name,...await page.evaluate(()=>({
   viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,
   buttons:[...document.querySelectorAll('.orbe-button')].filter(el=>el.getBoundingClientRect().width).map(el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label')||el.textContent.trim(),size:[Math.round(r.width),Math.round(r.height)],bg:s.backgroundColor,border:s.borderTopColor,borderWidth:s.borderTopWidth,color:s.color,font:s.fontSize,disabled:el.disabled};})
  }))});
 }
 await page.getByRole('button',{name:'Pular introdução',exact:true}).focus();
 await capture('onboarding-desktop');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1024,760));
 await capture('onboarding-compact');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,960));
 await page.getByRole('button',{name:'Começar',exact:true}).click();
 await capture('onboarding-folder');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await capture('onboarding-ready');
 await page.getByRole('button',{name:'Abrir Orbe',exact:true}).click();
 await page.getByRole('heading',{name:'Ouvir agora',exact:true}).waitFor();
 await capture('home-dark');
 await page.getByRole('button',{name:'Novo download',exact:false}).first().click();
 await page.getByRole('dialog').waitFor();
 await capture('download-dialog');
 await page.getByRole('button',{name:'Fechar',exact:true}).click();
 for (const [nav,name] of [['Suas playlists','playlists-dark'],['Integrações','integrations-dark'],['Configurações','settings-dark'],['Converter mídia','converter-dark']]){
  await page.getByRole('button',{name:nav,exact:true}).click(); await capture(name);
 }
 async function findFiles(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()&&!e.name.includes('userdata')&&!e.name.includes('profile'))out.push(...await findFiles(p));else if(e.name==='Horizonte.mp3'||e.name==='Devagar.mp3')out.push(p);}return out;}
 const files=await findFiles(resolve('test-results'));
 if(files.length){
  await app.evaluate(({dialog},files)=>Object.defineProperty(dialog,'showOpenDialog',{configurable:true,value:async()=>({canceled:false,filePaths:files})}),files);
  await page.getByRole('button',{name:'Biblioteca',exact:true}).click();
  await page.getByRole('button',{name:'Adicionar arquivos',exact:true}).click();
  await page.locator('.library-item').first().waitFor();
  await capture('library-dark');
  await page.locator('.library-play').first().click();
  await page.getByRole('button',{name:'Expandir player',exact:true}).click();
  await page.locator('.expanded-player').waitFor();
  await capture('player-dark');
  await page.getByRole('button',{name:'Recolher player',exact:true}).click();
 }
 await page.getByRole('button',{name:'Configurações',exact:true}).click();
 await page.locator('#theme').selectOption('light');
 await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
 await page.locator('.app-shell[data-theme="light"]').waitFor();
 await capture('settings-light');
 for (const [nav,name] of [['Biblioteca','library-light'],['Suas playlists','playlists-light'],['Integrações','integrations-light']]){
  await page.getByRole('button',{name:nav,exact:true}).click(); await capture(name);
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1024,760));
 await capture('integrations-compact');
 await page.getByRole('button',{name:'Biblioteca',exact:true}).click(); await capture('library-compact');
 for (const [source,target] of [['recovery-dark.png','recovery-dark.png'],['missing-files.png','recovery-detail.png'],['folders-light.png','folders-light.png'],['folders-compact.png','folders-compact.png']]) await copyFile(resolve('.impeccable/review/folders',source),join(output,target));
 await writeFile(join(output,'metrics.json'),JSON.stringify({errors,metrics},null,2));
 console.log(JSON.stringify({screenshots:metrics.map(m=>m.name),errors,overflow:metrics.filter(m=>m.overflow).map(m=>m.name),imported:files.length}));
} finally {await app.close();}
