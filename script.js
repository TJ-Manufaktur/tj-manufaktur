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