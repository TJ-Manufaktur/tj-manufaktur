(()=>{
  'use strict';

  const STORAGE_KEY='tj_consent_v1';
  const VERSION=1;
  const defaults={necessary:true,statistics:false,marketing:false};
  const labels={statistics:'Statistik',marketing:'Marketing'};

  const css=`
    .tj-consent-lock{overflow:hidden}
    .tj-consent-banner,.tj-consent-modal{font-family:Arial,sans-serif;color:#f7f4ef}
    .tj-consent-banner{position:fixed;left:18px;right:18px;bottom:18px;z-index:9998;max-width:1180px;margin:auto;background:#171717;border:1px solid #b08a4a66;box-shadow:0 20px 70px #0008;padding:24px}
    .tj-consent-banner h2,.tj-consent-modal h2{font-family:Georgia,serif;font-weight:400;margin:0 0 9px;color:#fff}
    .tj-consent-banner p,.tj-consent-modal p{margin:0;color:#d7d2ca;line-height:1.55;font-size:14px}
    .tj-consent-banner a,.tj-consent-modal a{color:#d3ad6b;text-decoration:underline;text-underline-offset:3px}
    .tj-consent-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .tj-consent-btn{appearance:none;border:1px solid #b08a4a;background:#b08a4a;color:#fff;padding:12px 16px;cursor:pointer;text-transform:uppercase;letter-spacing:.07em;font-size:11px;font-weight:700}
    .tj-consent-btn:hover{background:#8f6c32;border-color:#8f6c32}
    .tj-consent-btn.secondary{background:transparent;color:#f7f4ef;border-color:#8e877c}
    .tj-consent-btn.secondary:hover{border-color:#b08a4a;color:#e7c78d;background:#ffffff08}
    .tj-consent-btn.ghost{background:transparent;color:#d7d2ca;border-color:transparent;text-decoration:underline;text-transform:none;letter-spacing:0;font-weight:400}
    .tj-consent-overlay{position:fixed;inset:0;z-index:9999;background:#000a;display:grid;place-items:center;padding:18px}
    .tj-consent-modal{width:min(720px,100%);max-height:min(760px,92vh);overflow:auto;background:#171717;border:1px solid #b08a4a66;box-shadow:0 24px 90px #000a;padding:28px}
    .tj-consent-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
    .tj-consent-close{appearance:none;border:0;background:transparent;color:#fff;font-size:30px;line-height:1;cursor:pointer;padding:0 2px}
    .tj-consent-list{margin:22px 0 0;border-top:1px solid #ffffff1f}
    .tj-consent-row{display:grid;grid-template-columns:1fr auto;gap:22px;padding:18px 0;border-bottom:1px solid #ffffff1f}
    .tj-consent-row strong{display:block;color:#fff;margin-bottom:4px}
    .tj-consent-row small{display:block;color:#bdb7ad;line-height:1.45;max-width:550px}
    .tj-consent-switch{position:relative;width:48px;height:26px;align-self:center}
    .tj-consent-switch input{position:absolute;opacity:0;pointer-events:none}
    .tj-consent-switch span{display:block;width:48px;height:26px;border-radius:30px;background:#5c5954;cursor:pointer;transition:.18s}
    .tj-consent-switch span:after{content:'';display:block;width:20px;height:20px;border-radius:50%;background:#fff;transform:translate(3px,3px);transition:.18s}
    .tj-consent-switch input:checked+span{background:#b08a4a}
    .tj-consent-switch input:checked+span:after{transform:translate(25px,3px)}
    .tj-consent-switch input:disabled+span{opacity:.72;cursor:not-allowed}
    .tj-cookie-settings{cursor:pointer}
    .tj-consent-status{margin-top:14px;font-size:12px;color:#aaa}
    @media(max-width:620px){.tj-consent-banner{left:10px;right:10px;bottom:10px;padding:19px}.tj-consent-actions{display:grid;grid-template-columns:1fr}.tj-consent-btn{width:100%}.tj-consent-modal{padding:22px 18px}.tj-consent-row{gap:12px}}
  `;

  function ensureStyle(){
    if(document.getElementById('tj-consent-style'))return;
    const style=document.createElement('style');
    style.id='tj-consent-style';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!value||value.version!==VERSION)return null;
      return {...defaults,...value};
    }catch(_){return null;}
  }

  function save(consent){
    const value={...defaults,...consent,necessary:true,version:VERSION,updatedAt:new Date().toISOString()};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){}
    activateOptionalScripts(value);
    window.dispatchEvent(new CustomEvent('tj-consent-change',{detail:value}));
    return value;
  }

  function activateOptionalScripts(consent){
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(node=>{
      const category=node.dataset.consent;
      if(!consent?.[category]||node.dataset.consentLoaded==='1')return;
      const script=document.createElement('script');
      [...node.attributes].forEach(attr=>{
        if(!['type','data-consent','data-consent-loaded'].includes(attr.name))script.setAttribute(attr.name,attr.value);
      });
      script.text=node.textContent;
      node.dataset.consentLoaded='1';
      node.insertAdjacentElement('afterend',script);
    });
  }

  function closeModal(){
    document.getElementById('tj-consent-overlay')?.remove();
    document.documentElement.classList.remove('tj-consent-lock');
  }

  function openSettings(){
    ensureStyle();
    closeModal();
    const current=read()||defaults;
    const overlay=document.createElement('div');
    overlay.className='tj-consent-overlay';
    overlay.id='tj-consent-overlay';
    overlay.innerHTML=`<section class="tj-consent-modal" role="dialog" aria-modal="true" aria-labelledby="tj-consent-title">
      <div class="tj-consent-head"><div><h2 id="tj-consent-title">Cookie-Einstellungen</h2><p>Hier kannst du festlegen, welche optionalen Dienste auf dieser Website verwendet werden dürfen. Notwendige Funktionen sind immer aktiv.</p></div><button class="tj-consent-close" type="button" aria-label="Einstellungen schließen">×</button></div>
      <div class="tj-consent-list">
        <div class="tj-consent-row"><div><strong>Notwendig</strong><small>Erforderlich für grundlegende Funktionen, Sicherheit und das Speichern deiner Datenschutzauswahl. Diese Kategorie kann nicht deaktiviert werden.</small></div><label class="tj-consent-switch"><input type="checkbox" checked disabled><span aria-hidden="true"></span></label></div>
        <div class="tj-consent-row"><div><strong>Statistik</strong><small>Erlaubt zukünftig optionale Reichweiten- und Nutzungsanalysen. Aktuell wird über diese Kategorie kein Analysedienst geladen.</small></div><label class="tj-consent-switch"><input id="tj-consent-statistics" type="checkbox" ${current.statistics?'checked':''}><span aria-hidden="true"></span></label></div>
        <div class="tj-consent-row"><div><strong>Marketing</strong><small>Erlaubt zukünftig optionale Marketing- und Conversion-Dienste. Aktuell wird über diese Kategorie kein Marketingdienst geladen.</small></div><label class="tj-consent-switch"><input id="tj-consent-marketing" type="checkbox" ${current.marketing?'checked':''}><span aria-hidden="true"></span></label></div>
      </div>
      <div class="tj-consent-actions"><button class="tj-consent-btn" id="tj-consent-save" type="button">Auswahl speichern</button><button class="tj-consent-btn secondary" id="tj-consent-necessary-modal" type="button">Nur notwendige</button><a class="tj-consent-btn ghost" href="datenschutz.html">Datenschutz</a></div>
      <div class="tj-consent-status">Deine Auswahl kannst du jederzeit über „Cookie-Einstellungen“ im Footer ändern.</div>
    </section>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add('tj-consent-lock');
    const close=()=>closeModal();
    overlay.querySelector('.tj-consent-close').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('#tj-consent-save').addEventListener('click',()=>{
      save({statistics:overlay.querySelector('#tj-consent-statistics').checked,marketing:overlay.querySelector('#tj-consent-marketing').checked});
      close();hideBanner();
    });
    overlay.querySelector('#tj-consent-necessary-modal').addEventListener('click',()=>{save(defaults);close();hideBanner();});
    overlay.querySelector('.tj-consent-close').focus();
  }

  function hideBanner(){document.getElementById('tj-consent-banner')?.remove();}

  function showBanner(){
    ensureStyle();
    if(document.getElementById('tj-consent-banner'))return;
    const banner=document.createElement('section');
    banner.className='tj-consent-banner';
    banner.id='tj-consent-banner';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Datenschutz-Einstellungen');
    banner.innerHTML=`<h2>Deine Privatsphäre</h2><p>Wir verwenden notwendige Browser-Speicher für die Funktion der Website und deine Datenschutzauswahl. Optionale Statistik- oder Marketingdienste werden nur mit deiner Zustimmung geladen. Weitere Informationen findest du in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</p><div class="tj-consent-actions"><button class="tj-consent-btn secondary" id="tj-consent-necessary" type="button">Nur notwendige</button><button class="tj-consent-btn secondary" id="tj-consent-settings" type="button">Einstellungen</button><button class="tj-consent-btn" id="tj-consent-all" type="button">Alle akzeptieren</button></div>`;
    document.body.appendChild(banner);
    banner.querySelector('#tj-consent-necessary').addEventListener('click',()=>{save(defaults);hideBanner();});
    banner.querySelector('#tj-consent-settings').addEventListener('click',openSettings);
    banner.querySelector('#tj-consent-all').addEventListener('click',()=>{save({statistics:true,marketing:true});hideBanner();});
  }

  function addFooterLink(){
    if(document.querySelector('.tj-cookie-settings'))return;
    const footerNav=document.querySelector('footer nav');
    const footer=document.querySelector('footer .foot,footer');
    if(!footerNav&&!footer)return;
    const link=document.createElement('a');
    link.href='#cookie-einstellungen';
    link.className='tj-cookie-settings';
    link.textContent='Cookie-Einstellungen';
    link.addEventListener('click',e=>{e.preventDefault();openSettings();});
    (footerNav||footer).appendChild(link);
  }

  function init(){
    ensureStyle();
    addFooterLink();
    const current=read();
    if(current)activateOptionalScripts(current);else showBanner();
  }

  window.TJConsent={
    get:()=>read()||{...defaults},
    has:category=>Boolean((read()||defaults)[category]),
    open:openSettings,
    reset:()=>{try{localStorage.removeItem(STORAGE_KEY);}catch(_){};showBanner();}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
