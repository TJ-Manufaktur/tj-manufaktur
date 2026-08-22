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

/* Test-Konfigurator: Verkaufspreis, Rechtehinweis und Praxishilfen. */
if (location.pathname.endsWith('/test.html') || location.pathname.endsWith('test.html')) {
  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('requestForm');
    const price=document.getElementById('price');
    const weight=document.getElementById('weight');
    const time=document.getElementById('time');
    const dims=document.getElementById('dims');
    const material=document.getElementById('material');
    const consent=document.getElementById('consent');
    const message=document.getElementById('message');
    const formGrid=form?.querySelector('.form-grid');

    const extraStyle=document.createElement('style');
    extraStyle.textContent=`
      .calc-notice{margin-top:14px;padding:13px 14px;border-left:3px solid #b08a4a;background:#fbf8f3;color:#6f6b65;font-size:13px}
      .calc-notice strong{color:#171717}.calc-notice.warn{border-left-color:#a56d18;background:#fff8e9}.calc-notice.danger{border-left-color:#a13232;background:#fff1f1;color:#843030}
      .calc-mini{font-size:12px;color:#6f6b65;margin-top:6px}.field-full{grid-column:1/-1}
      .price-detail{margin-top:8px;color:#f0e5d4;font-size:14px;line-height:1.5}
      .price-unavailable{font-size:28px!important;line-height:1.25;color:#d0a75e!important}
    `;
    document.head.appendChild(extraStyle);

    /* Sinnvolle Auftragsdaten ergänzen. */
    let quantity=null,color=null,support=null;
    if(formGrid){
      const messageField=message?.closest('.field');

      const qtyField=document.createElement('div');
      qtyField.className='field';
      qtyField.innerHTML='<label for="quantity">Stückzahl</label><input id="quantity" name="Stueckzahl" type="number" min="1" max="100" step="1" value="1" inputmode="numeric"><div class="calc-mini">Preisberechnung für identische Exemplare.</div>';

      const colorField=document.createElement('div');
      colorField.className='field';
      colorField.innerHTML='<label for="colorChoice">Farbe</label><select id="colorChoice" name="Farbwunsch"><option value="Nach Absprache" selected>Nach Absprache</option><option value="Schwarz">Schwarz</option><option value="Weiss">Weiß</option><option value="Grau">Grau</option><option value="Andere Farbe">Andere Farbe / Wunschfarbe</option></select>';

      const supportField=document.createElement('div');
      supportField.className='field field-full';
      supportField.innerHTML='<label for="supportChoice">Support / Überhänge</label><select id="supportChoice" name="Supporthinweis"><option value="Bitte technisch pruefen" selected>Bitte von TJ Manufaktur technisch prüfen</option><option value="Vermutlich nicht erforderlich">Vermutlich nicht erforderlich</option><option value="Vermutlich erforderlich">Vermutlich erforderlich</option></select><div class="calc-mini">Support wird nicht automatisch sicher erkannt und kann Material, Zeit und Endpreis verändern.</div>';

      if(messageField){
        formGrid.insertBefore(qtyField,messageField);
        formGrid.insertBefore(colorField,messageField);
        formGrid.insertBefore(supportField,messageField);
      } else {
        formGrid.append(qtyField,colorField,supportField);
      }
      quantity=document.getElementById('quantity');
      color=document.getElementById('colorChoice');
      support=document.getElementById('supportChoice');
    }

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

    /* Preis wirklich als unverbindliche Vorabschätzung kennzeichnen. */
    let priceDetail=null;
    if(price){
      priceDetail=document.createElement('div');
      priceDetail.className='price-detail';
      price.insertAdjacentElement('afterend',priceDetail);

      const quoteNote=document.createElement('div');
      quoteNote.className='calc-notice';
      quoteNote.innerHTML='<strong>Unverbindliche Vorabschätzung.</strong> Der angezeigte Betrag ist noch kein verbindliches Angebot. Vor Produktionsbeginn prüfen wir Druckbarkeit, Ausrichtung, Supportbedarf und Datei technisch. Du erhältst den finalen Gesamtpreis vor Vertragsschluss.';
      price.closest('.price')?.insertAdjacentElement('afterend',quoteNote);
    }

    /* P1S-Bauraumprüfung: 256 × 256 × 256 mm als nominelle Grenze. */
    const buildNotice=document.createElement('div');
    buildNotice.className='calc-notice';
    buildNotice.style.display='none';
    const stats=document.querySelector('.stats');
    stats?.insertAdjacentElement('afterend',buildNotice);
    let buildExceeded=false;

    const parseDims=()=>{
      const nums=[...String(dims?.textContent||'').matchAll(/(\d+(?:[,.]\d+)?)/g)].map(m=>Number(m[1].replace(',','.')));
      return nums.length>=3?nums.slice(0,3):null;
    };

    const updateBuildCheck=()=>{
      const d=parseDims();
      if(!d){
        buildExceeded=false;
        buildNotice.style.display='none';
        return;
      }
      const max=Math.max(...d);
      buildExceeded=max>256;
      buildNotice.style.display='block';
      if(buildExceeded){
        buildNotice.className='calc-notice danger';
        buildNotice.innerHTML=`<strong>Bauraum überschritten:</strong> Das Modell ist aktuell ${d.map(x=>Math.round(x)).join(' × ')} mm groß. Ein Bambu Lab P1S hat nominell 256 × 256 × 256 mm Bauraum. Für diese Größe geben wir deshalb keinen automatischen Preis aus. Das Modell muss voraussichtlich skaliert, anders ausgerichtet oder geteilt werden. Du kannst die Anfrage trotzdem zur individuellen Prüfung senden.`;
      }else if(max>245){
        buildNotice.className='calc-notice warn';
        buildNotice.innerHTML=`<strong>Nahe an der Bauraumgrenze:</strong> ${d.map(x=>Math.round(x)).join(' × ')} mm. Je nach Ausrichtung, Randbereichen und Druckstrategie ist eine manuelle Prüfung erforderlich.`;
      }else{
        buildNotice.className='calc-notice';
        buildNotice.innerHTML=`<strong>Bauraumprüfung:</strong> ${d.map(x=>Math.round(x)).join(' × ')} mm liegen innerhalb des nominellen P1S-Bauraums. Die endgültige Druckbarkeit wird trotzdem technisch geprüft.`;
      }
    };

    if(!price||!weight||!time||!material)return;
    const ELECTRICITY_EUR_KWH=0.35,MACHINE_EUR_H=1.50,WASTE_FACTOR=1.15,RISK_FACTOR=1.08,TARGET_MARGIN=0.35,MIN_PRICE=4.00;
    let updating=false;
    const parseNumber=text=>{const m=String(text||'').match(/(\d+(?:[,.]\d+)?)/);return m?Number(m[1].replace(',','.')):NaN;};
    const money=n=>n.toFixed(2).replace('.',',');

    const updatePrice=()=>{
      if(updating)return;
      updateBuildCheck();

      if(buildExceeded){
        updating=true;
        price.classList.add('price-unavailable');
        price.textContent='Keine automatische Preisschätzung möglich';
        if(priceDetail)priceDetail.textContent='Modell überschreitet den P1S-Bauraum · individuelle Prüfung erforderlich.';
        updating=false;
        return;
      }

      const gramsOne=parseNumber(weight.textContent),hoursOne=parseNumber(time.textContent);
      const qty=Math.max(1,Math.min(100,Math.round(Number(quantity?.value||1))));
      if(!Number.isFinite(gramsOne)||!Number.isFinite(hoursOne)||gramsOne<=0||hoursOne<=0)return;
      const opt=material.options[material.selectedIndex],kgPrice=Number(opt?.dataset?.kgprice||0),power=Number(opt?.dataset?.power||0.12);
      if(!Number.isFinite(kgPrice)||kgPrice<=0)return;

      const totalGrams=gramsOne*qty,totalHours=hoursOne*qty;
      const materialCost=(totalGrams/1000)*kgPrice*WASTE_FACTOR;
      const machineCost=totalHours*MACHINE_EUR_H;
      const electricity=totalHours*power*ELECTRICITY_EUR_KWH;
      const handling=1.50+(totalGrams/100)*1.25+Math.max(0,qty-1)*0.35;
      const costBeforeMargin=(materialCost+machineCost+electricity+handling)*RISK_FACTOR;
      const sell=Math.max(MIN_PRICE,costBeforeMargin/(1-TARGET_MARGIN));
      const lo=sell,hi=Math.max(lo+0.50,sell*1.08);
      const loPiece=lo/qty,hiPiece=hi/qty;

      updating=true;
      price.classList.remove('price-unavailable');
      if(qty===1){
        price.textContent=`ca. ${money(lo)}–${money(hi)} €`;
        if(priceDetail)priceDetail.textContent='Preis für 1 Exemplar.';
      }else{
        price.textContent=`ca. ${money(lo)}–${money(hi)} € gesamt`;
        if(priceDetail)priceDetail.innerHTML=`${qty} identische Exemplare · <strong style="color:#fff">ca. ${money(loPiece)}–${money(hiPiece)} € pro Stück</strong>`;
      }
      updating=false;
    };

    new MutationObserver(()=>{updateBuildCheck();updatePrice();}).observe(weight,{childList:true,characterData:true,subtree:true});
    new MutationObserver(updatePrice).observe(time,{childList:true,characterData:true,subtree:true});
    if(dims)new MutationObserver(()=>{updateBuildCheck();updatePrice();}).observe(dims,{childList:true,characterData:true,subtree:true});
    material.addEventListener('input',updatePrice);material.addEventListener('change',updatePrice);
    quantity?.addEventListener('input',updatePrice);quantity?.addEventListener('change',updatePrice);
    ['infill','scale','quality'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('input',()=>queueMicrotask(updatePrice));el.addEventListener('change',()=>queueMicrotask(updatePrice));}});

    /* Zusatzangaben in die bestehende Nachricht einbetten, damit sie auch mit dem vorhandenen Mail-Backend ankommen. */
    if(form&&message){
      form.addEventListener('submit',()=>{
        const original=message.value;
        const qty=Math.max(1,Math.min(100,Math.round(Number(quantity?.value||1))));
        const meta=[
          `Stückzahl: ${qty}`,
          `Farbwunsch: ${color?.value||'Nach Absprache'}`,
          `Support / Überhänge: ${support?.value||'Bitte technisch prüfen'}`,
          `Bauraumstatus: ${buildExceeded?'P1S-Bauraum überschritten – individuelle Prüfung erforderlich':'innerhalb der automatischen Bauraumprüfung'}`
        ].join('\n');
        message.value=`${original}${original.trim()?'\n\n':''}--- Konfigurator-Zusatzangaben ---\n${meta}`;
        setTimeout(()=>{message.value=original;},0);
      },true);
    }

    updateBuildCheck();
    updatePrice();
  });
}