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

/* Test-Konfigurator: niedriger Einstiegspreis, dafür stärkerer variabler Anteil.
   Die bisherige Kalkulation startet effektiv bei rund 9,90 EUR. Für kleine
   Teile wird der Einstieg auf ca. 4 EUR abgesenkt; mit wachsendem Auftrag
   steigt der Preis stärker, sodass mittlere/große Drucke die Differenz tragen. */
if (location.pathname.endsWith('/test.html') || location.pathname.endsWith('test.html')) {
  document.addEventListener('DOMContentLoaded',()=>{
    const price=document.getElementById('price');
    if(!price)return;
    let internal=false;
    const rebalance=()=>{
      if(internal)return;
      const text=price.textContent||'';
      const nums=[...text.matchAll(/(\d+[,.]\d+)/g)].map(m=>Number(m[1].replace(',','.')));
      if(nums.length<2)return;
      const convert=p=>Math.max(4,4+(p-9.90)*1.60);
      const lo=convert(nums[0]),hi=Math.max(lo+.50,convert(nums[1]));
      const next=`ca. ${lo.toFixed(2).replace('.',',')}–${hi.toFixed(2).replace('.',',')} €`;
      if(next===text)return;
      internal=true;
      price.textContent=next;
      internal=false;
    };
    new MutationObserver(rebalance).observe(price,{childList:true,characterData:true,subtree:true});
    rebalance();
  });
}