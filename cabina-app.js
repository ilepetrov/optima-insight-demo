'use strict';
// Installazione nativa di Chrome. Nessuna cache offline di sessioni o dati.
const pannelloApp=document.getElementById('installazione');
const bottoneApp=document.getElementById('installa-app');
const guidaApp=document.getElementById('guida-installazione');
const avvisoRete=document.getElementById('senza-rete');
const finestraApp=window.matchMedia('(display-mode: standalone)');
let propostaApp=null, installata=false;
function mostraInstallazione(){
  pannelloApp.hidden=installata || finestraApp.matches;
  bottoneApp.hidden=!propostaApp;
  guidaApp.hidden=Boolean(propostaApp);
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();propostaApp=e;mostraInstallazione();
});
bottoneApp.addEventListener('click',async()=>{
  if(!propostaApp || bottoneApp.disabled) return;
  const proposta=propostaApp;
  propostaApp=null;bottoneApp.disabled=true;
  try{await proposta.prompt();await proposta.userChoice;}
  catch{guidaApp.open=true;}
  finally{bottoneApp.disabled=false;mostraInstallazione();}
});
window.addEventListener('appinstalled',()=>{installata=true;propostaApp=null;mostraInstallazione();});
finestraApp.addEventListener('change',mostraInstallazione);
function mostraConnessione(){avvisoRete.hidden=navigator.onLine!==false;}
window.addEventListener('offline',mostraConnessione);
window.addEventListener('online',mostraConnessione);
window.addEventListener('pageshow',mostraConnessione);
mostraInstallazione();mostraConnessione();
