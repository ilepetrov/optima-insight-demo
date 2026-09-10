import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('cabina.webmanifest',root),'utf8'));
const base='https://ilepetrov.github.io/optima-insight-demo/cabina.webmanifest';
assert.equal(manifest.display,'standalone');
assert.equal(new URL(manifest.start_url,base).href,'https://ilepetrov.github.io/optima-insight-demo/cabina_di_regia.html');
assert.equal(manifest.id,manifest.start_url);
assert.ok(new URL('recupero_accesso.html',base).href.startsWith(new URL(manifest.scope,base).href));
assert.ok(manifest.name);assert.ok(manifest.short_name);
for(const icon of manifest.icons.filter(i=>i.type==='image/png')){
  const [width,height]=icon.sizes.split('x').map(Number);
  const png=fs.readFileSync(new URL(icon.src,root));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
  assert.ok(width>=512 && height>=512);
}
const vettore=manifest.icons.find(i=>i.sizes==='any' && i.type==='image/svg+xml');assert.ok(vettore);
const svg=fs.readFileSync(new URL(vettore.src,root),'utf8');
assert.match(svg,/<svg\s/);assert.match(svg,/viewBox="0 0 124 124"/);
assert.equal(manifest.background_color,'#ffffff');
const elementi={},eventi={},media={matches:false,addEventListener:(_,fn)=>media.change=fn};
const elemento=id=>elementi[id]??={hidden:false,disabled:false,addEventListener:(tipo,fn)=>elementi[id][tipo]=fn};
const navigator={onLine:true};
vm.runInNewContext(fs.readFileSync(new URL('cabina-app.js',root),'utf8'),{
  document:{getElementById:elemento},navigator,
  window:{matchMedia:()=>media,addEventListener:(tipo,fn)=>eventi[tipo]=fn}
});
assert.equal(elementi['installa-app'].hidden,true);
assert.equal(elementi['guida-installazione'].hidden,false);
let inviti=0,bloccato=false;
eventi.beforeinstallprompt({preventDefault:()=>bloccato=true,prompt:async()=>inviti++,userChoice:Promise.resolve({outcome:'dismissed'})});
assert.ok(bloccato);assert.equal(inviti,0);assert.equal(elementi['installa-app'].hidden,false);
await elementi['installa-app'].click();
assert.equal(inviti,1);assert.equal(elementi.installazione.hidden,false);
await elementi['installa-app'].click();assert.equal(inviti,1);
eventi.appinstalled();assert.equal(elementi.installazione.hidden,true);
navigator.onLine=false;eventi.offline();assert.equal(elementi['senza-rete'].hidden,false);
eventi.pageshow();assert.equal(elementi['senza-rete'].hidden,false);
navigator.onLine=true;eventi.online();assert.equal(elementi['senza-rete'].hidden,true);
console.log('PASS: manifest, icone PNG, recupero incluso, consenso installazione, annullamento, avviso senza rete.');
