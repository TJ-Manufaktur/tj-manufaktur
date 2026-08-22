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

/*
 * Test-Konfigurator – belastbare Verkaufspreis-Korrektur.
 *
 * Der 4-EUR-Wert ist ausschließlich ein Mindestpreis für Kleinstteile.
 * Bei größeren Drucken wird der Verkaufspreis aus Material, Maschinenzeit,
 * Strom, Handling, Fehldruckreserve und 35 % Zielmarge berechnet.
 *
 * Die eigentliche Geometrie-, Material- und Zeitabschätzung bleibt in
 * test.html. Dieser Block setzt nur den finalen Verkaufspreis und verhindert,
 * dass eine frühere Mindestpreis-Transformation große Drucke auf 4 EUR drückt.
 */
if (location.pathname.endsWith('/test.html') || location.pathname.endsWith('test.html')) {
  document.addEventListener('DOMContentLoaded',()=>{
    const price=document.getElementById('price');
    const weight=document.getElementById('weight');
    const time=document.getElementById('time');
    const material=document.getElementById('material');
    if(!price||!weight||!time||!material)return;

    const ELECTRICITY_EUR_KWH=0.35;
    const MACHINE_EUR_H=1.50;
    const WASTE_FACTOR=1.15;
    const RISK_FACTOR=1.08;
    const TARGET_MARGIN=0.35;
    const MIN_PRICE=4.00;

    let updating=false;

    const parseNumber=text=>{
      const m=String(text||'').match(/(\d+(?:[,.]\d+)?)/);
      return m?Number(m[1].replace(',','.')):NaN;
    };

    const updatePrice=()=>{
      if(updating)return;
      const grams=parseNumber(weight.textContent);
      const hours=parseNumber(time.textContent);
      if(!Number.isFinite(grams)||!Number.isFinite(hours)||grams<=0||hours<=0)return;

      const opt=material.options[material.selectedIndex];
      const kgPrice=Number(opt?.dataset?.kgprice||0);
      const power=Number(opt?.dataset?.power||0.12);
      if(!Number.isFinite(kgPrice)||kgPrice<=0)return;

      const materialCost=(grams/1000)*kgPrice*WASTE_FACTOR;
      const machineCost=hours*MACHINE_EUR_H;
      const electricity=hours*power*ELECTRICITY_EUR_KWH;

      // Kleine Teile brauchen trotzdem Vorbereitung/Entnahme; bei größeren
      // Teilen steigt der Handling-Anteil leicht mit dem Materialverbrauch.
      const handling=1.50+(grams/100)*1.25;

      const costBeforeMargin=(materialCost+machineCost+electricity+handling)*RISK_FACTOR;
      const sell=Math.max(MIN_PRICE,costBeforeMargin/(1-TARGET_MARGIN));
      const lo=sell;
      const hi=Math.max(lo+0.50,sell*1.08);

      const next=`ca. ${lo.toFixed(2).replace('.',',')}–${hi.toFixed(2).replace('.',',')} €`;
      if(price.textContent===next)return;
      updating=true;
      price.textContent=next;
      updating=false;
    };

    new MutationObserver(updatePrice).observe(weight,{childList:true,characterData:true,subtree:true});
    new MutationObserver(updatePrice).observe(time,{childList:true,characterData:true,subtree:true});
    material.addEventListener('input',updatePrice);
    material.addEventListener('change',updatePrice);

    // Die Inline-Kalkulation läuft ebenfalls beim Ändern dieser Felder.
    ['infill','scale','quality'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.addEventListener('input',()=>queueMicrotask(updatePrice));el.addEventListener('change',()=>queueMicrotask(updatePrice));}
    });

    updatePrice();
  });
}