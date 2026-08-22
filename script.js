document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear());

document.querySelectorAll('[data-carousel]').forEach(carousel=>{
  const track=carousel.querySelector('.carousel-track');
  const slides=[...carousel.querySelectorAll('.carousel-slide')];
  const prev=carousel.querySelector('.carousel-prev');
  const next=carousel.querySelector('.carousel-next');
  const dotsWrap=carousel.querySelector('.carousel-dots');
  let index=0;
  let timer;

  slides.forEach((_,i)=>{
    const dot=document.createElement('button');
    dot.type='button';
    dot.className='carousel-dot'+(i===0?' active':'');
    dot.setAttribute('aria-label',`Bild ${i+1} anzeigen`);
    dot.addEventListener('click',()=>{show(i);restart();});
    dotsWrap.appendChild(dot);
  });

  const dots=[...dotsWrap.querySelectorAll('.carousel-dot')];
  function show(i){
    index=(i+slides.length)%slides.length;
    track.style.transform=`translateX(-${index*100}%)`;
    dots.forEach((d,j)=>d.classList.toggle('active',j===index));
  }
  function restart(){clearInterval(timer);timer=setInterval(()=>show(index+1),5500);}
  prev.addEventListener('click',()=>{show(index-1);restart();});
  next.addEventListener('click',()=>{show(index+1);restart();});
  carousel.addEventListener('mouseenter',()=>clearInterval(timer));
  carousel.addEventListener('mouseleave',restart);
  restart();
});

/* Test-Konfigurator: belastbare Verkaufspreis-Korrektur und Rechtehinweis. */
if (location.pathname.endsWith('/test.html') || location.pathname.endsWith('test.html')) {
  document.addEventListener('DOMContentLoaded',()=>{
    const price=document.getElementById('price');
    const weight=document.getElementById('weight');
    const time=document.getElementById('time');
    const material=document.getElementById('material');
    const consent=document.getElementById('consent');

    /* Kunden klar über erforderliche Nutzungsrechte und mögliche Ablehnung informieren. */
    if(consent){
      consent.name='Rechtebestaetigung';
      consent.value='Bestaetigt';
      const span=consent.closest('label')?.querySelector('span');
      if(span){
        span.innerHTML='Ich habe die <a href="datenschutz.html" target="_blank" rel="noopener"><u>Datenschutzerklärung</u></a> zur Kenntnis genommen und bestätige, dass ich über sämtliche für die beauftragte Herstellung erforderlichen Rechte an der hochgeladenen Datei und dem darin enthaltenen Design verfüge, einschließlich einer gegebenenfalls erforderlichen Berechtigung zur kommerziellen Nutzung. Dateien mit ausschließlich privater oder nicht-kommerzieller Lizenz dürfen nicht für diesen Auftrag verwendet werden.';
      }
      const info=document.createElement('div');
      info.className='privacy';
      info.style.marginTop='12px';
      info.innerHTML='<strong style="display:block;color:#171717;margin-bottom:6px">Hinweis zu Urheber-, Marken- und Nutzungsrechten</strong>Bitte lade nur Modelle hoch, für deren beauftragte Herstellung du die erforderlichen Rechte besitzt. Das gilt insbesondere für geschützte Charaktere, Marken, Logos, Designs und Modelle von Plattformen wie MakerWorld. <strong>TJ Manufaktur kann eine Anfrage ablehnen, die Fertigung aussetzen oder vor Produktionsbeginn einen geeigneten Nachweis der Nutzungsrechte verlangen, wenn konkrete Zweifel an der Berechtigung bestehen.</strong><details style="margin-top:8px"><summary style="cursor:pointer;color:#171717">Was bedeutet das?</summary><p style="margin:8px 0 0">Eine frei herunterladbare Datei ist nicht automatisch für eine gewerbliche Herstellung freigegeben. Steht ein Modell beispielsweise unter „Non-Commercial“, „Personal Use Only“ oder einer vergleichbaren Einschränkung, benötigen wir für eine entgeltliche Fertigung eine passende zusätzliche Berechtigung. Bei erkennbaren geschützten Figuren, Logos oder Designs können wir deshalb vor der Fertigung nach der Lizenz oder einer anderen nachvollziehbaren Berechtigung fragen.</p></details><p style="margin:8px 0 0">Weitere Einzelheiten findest du in unseren <a href="agb.html" target="_blank" rel="noopener"><u>AGB, Abschnitt Kundendateien und Nutzungsrechte</u></a>.</p>';
      consent.closest('label')?.insertAdjacentElement('afterend',info);
    }

    if(!price||!weight||!time||!material)return;
    const ELECTRICITY_EUR_KWH=0.35,MACHINE_EUR_H=1.50,WASTE_FACTOR=1.15,RISK_FACTOR=1.08,TARGET_MARGIN=0.35,MIN_PRICE=4.00;
    let updating=false;
    const parseNumber=text=>{const m=String(text||'').match(/(\d+(?:[,.]\d+)?)/);return m?Number(m[1].replace(',','.')):NaN;};
    const updatePrice=()=>{
      if(updating)return;
      const grams=parseNumber(weight.textContent),hours=parseNumber(time.textContent);
      if(!Number.isFinite(grams)||!Number.isFinite(hours)||grams<=0||hours<=0)return;
      const opt=material.options[material.selectedIndex],kgPrice=Number(opt?.dataset?.kgprice||0),power=Number(opt?.dataset?.power||0.12);
      if(!Number.isFinite(kgPrice)||kgPrice<=0)return;
      const materialCost=(grams/1000)*kgPrice*WASTE_FACTOR,machineCost=hours*MACHINE_EUR_H,electricity=hours*power*ELECTRICITY_EUR_KWH,handling=1.50+(grams/100)*1.25,costBeforeMargin=(materialCost+machineCost+electricity+handling)*RISK_FACTOR,sell=Math.max(MIN_PRICE,costBeforeMargin/(1-TARGET_MARGIN)),lo=sell,hi=Math.max(lo+0.50,sell*1.08),next=`ca. ${lo.toFixed(2).replace('.',',')}–${hi.toFixed(2).replace('.',',')} €`;
      if(price.textContent===next)return;updating=true;price.textContent=next;updating=false;
    };
    new MutationObserver(updatePrice).observe(weight,{childList:true,characterData:true,subtree:true});
    new MutationObserver(updatePrice).observe(time,{childList:true,characterData:true,subtree:true});
    material.addEventListener('input',updatePrice);material.addEventListener('change',updatePrice);
    ['infill','scale','quality'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('input',()=>queueMicrotask(updatePrice));el.addEventListener('change',()=>queueMicrotask(updatePrice));}});
    updatePrice();
  });
}