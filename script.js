(()=>{
  const loadCore=()=>{
    if(document.querySelector('script[data-tj-core]'))return;
    const el=document.createElement('script');
    el.src='script-core.js';
    el.defer=true;
    el.dataset.tjCore='1';
    document.head.appendChild(el);
  };
  loadCore();
})();
