(()=>{
  if(document.readyState==='loading'){
    document.write('<script src="script-core.js"><\/script><script src="consent.js"><\/script>');
    return;
  }
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  load('script-core.js').finally(()=>load('consent.js'));
})();
