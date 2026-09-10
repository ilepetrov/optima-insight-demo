// Tutti i token, utenti e password sono sintetici; nessuna chiamata di rete.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const html=fs.readFileSync(new URL('../recupero_accesso.html',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const tag of ['script','style']){
  const blocco=html.match(new RegExp('<'+tag+'>([\\s\\S]*?)</'+tag+'>'))[1];
  const hash=createHash('sha256').update(blocco).digest('base64');
  assert.ok(html.includes("'sha256-"+hash+"'"),'CSP incoerente: rigenerare dopo modifiche a '+tag);
}
async function pagina(hash, risposte=[]){
  const campi={},chiamate=[],storia=[];
  const campo=id=>campi[id]??=( {value:'',hidden:id==='cambio',disabled:false,checkValidity:()=>true,addEventListener:(nome,fn)=>{campi[id][nome]=fn;}} );
  const sandbox={URLSearchParams,AbortSignal,document:{getElementById:campo},location:{hash,pathname:'/'},history:{replaceState:(...args)=>storia.push(args)},window:{addEventListener(){}},fetch:async(url,opzioni)=>{chiamate.push({url,opzioni});const r=risposte.shift();if(!r) throw new Error('Chiamata imprevista');return r;}};
  await vm.runInNewContext(js,sandbox);
  assert.equal(storia[0][2],'/');
  return {campi,chiamate};
}
const ok={ok:true,json:async()=>({id:'utente-di-prova',email:'prova@example.test'})};
for(const hash of ['', '#access_token=finto&type=magiclink','#error=expired']){
  const p=await pagina(hash);assert.equal(p.chiamate.length,0);assert.equal(p.campi.cambio.hidden,true);
  await p.campi.cambio.submit({preventDefault(){}});assert.equal(p.chiamate.length,0);
}
const scaduto=await pagina('#access_token=finto&type=recovery',[{ok:false}]);
assert.equal(scaduto.campi.cambio.hidden,true);
await scaduto.campi.cambio.submit({preventDefault(){}});assert.equal(scaduto.chiamate.length,1);
const p=await pagina('#access_token=finto&type=recovery',[ok,{ok:true}]);
assert.equal(p.campi.cambio.hidden,false);
p.campi.nuova.value='Sintetica-123';p.campi.conferma.value='non-coincide';
await p.campi.cambio.submit({preventDefault(){}});assert.equal(p.chiamate.length,1);
p.campi.conferma.value='Sintetica-123';await p.campi.cambio.submit({preventDefault(){}});
assert.equal(p.chiamate.length,2);assert.equal(p.chiamate[1].opzioni.method,'PUT');
assert.deepEqual(JSON.parse(p.chiamate[1].opzioni.body),{password:'Sintetica-123'});
assert.equal(p.campi.nuova.value,'');assert.equal(p.campi.conferma.value,'');
assert.equal(p.campi.cambio.hidden,true);assert.equal(p.campi.cabina.hidden,false);
await p.campi.cambio.submit({preventDefault(){}});assert.equal(p.chiamate.length,2);
console.log('PASS: link assente/errato/scaduto bloccato, verifica remota obbligatoria, conferma password, invio e pulizia.');
const richiesta=await pagina('',[{ok:true}]);
richiesta.campi.email.value='prova@example.test';
await richiesta.campi.richiesta.submit({preventDefault(){}});
assert.equal(richiesta.chiamate.length,1);
const invio=richiesta.chiamate[0];
assert.equal(invio.opzioni.method,'POST');
assert.equal(new URL(invio.url).searchParams.get('redirect_to'),'https://ilepetrov.github.io/optima-insight-demo/recupero_accesso.html');
assert.deepEqual(JSON.parse(invio.opzioni.body),{email:'prova@example.test'});
assert.equal(richiesta.campi.richiesta.hidden,true);
const limite=await pagina('',[{ok:false,status:429}]);
await limite.campi.richiesta.submit({preventDefault(){}});
assert.equal(limite.campi.richiesta.hidden,false);assert.match(limite.campi.stato.textContent,/Troppi tentativi/);
const cabinaHtml=fs.readFileSync(new URL('../cabina_di_regia.html',import.meta.url),'utf8');
const instradamento=cabinaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const [hash,atteso] of [['',false],['#type=recovery&access_token=sintetico',true],['#error=expired',true]]){
  let destinazione;
  vm.runInNewContext(instradamento,{URLSearchParams,location:{hash,replace:url=>destinazione=url}});
  assert.equal(Boolean(destinazione),atteso);
  if(atteso) assert.equal(destinazione,'./recupero_accesso.html'+hash);
}
console.log('PASS: richiesta email, redirect HTTPS fisso, limite invii e instradamento dalla cabina.');
