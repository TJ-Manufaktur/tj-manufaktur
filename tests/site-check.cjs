const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const headers=JSON.parse(fs.readFileSync(path.join(root,'cloudflare/security-headers.json')));
const product={id:'p_test',name:'Test <img src=x onerror=alert(1)>',description:'Holz, 10 × 10 cm',category:'Gravur',price:5.9,price_cents:590,variants:['Natur'],tags:['Holz'],stock:5,unlimited_stock:false,personalizable:true};
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(file.endsWith(path.sep))file+='index.html';if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  const context=await browser.newContext();
  await context.route('**/api/admin/orders',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({orders:[{order_number:'TJ-TEST',first_name:'<img src=x onerror=alert(1)>',last_name:'Person',email:'test@example.invalid',street:'Teststraße',postal_code:'12345',city:'Testort',created_at:'2026-09-26 10:00:00',total_cents:590,payment_status:'pending',order_status:'new',items:[{quantity:1,product_name:'<img src=x>',variant:'Natur',personalization:'<svg onload=alert(1)>',total_price_cents:590}]}]})}));
  await context.route('https://**/*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,products:[product]})}));
  const page=await context.newPage();let failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.addInitScript(()=>{window.cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.cspErrors.push(e.violatedDirective+':'+e.blockedURI))});
  const pages=fs.readdirSync(root).filter(p=>p.endsWith('.html')).concat(['shop/index.html','shop/checkout.html','shop/erfolg.html']);
  for(const file of pages){
   failures=[];await page.goto(base+'/'+file);await page.waitForTimeout(200);
   assert.deepEqual(failures,[],file+' runtime errors');
   assert.deepEqual(await page.evaluate(()=>window.cspErrors),[],file+' CSP');
   if(file!=='test.html'){
    assert.equal(await page.locator('main').count(),1,file+' main');
    assert.equal(await page.locator('footer a[href$="impressum.html"]').count(),1,file+' imprint');
    assert.equal(await page.locator('footer a.withdrawal-link').count(),1,file+' withdrawal link');
   }
  }
  await page.goto(base+'/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Zum Inhalt springen');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
  await page.goto(base+'/admin/');await page.locator('.row-btn').waitFor();assert.equal(await page.locator('#ordersBody img').count(),0);await page.locator('.row-btn').click();assert.equal(await page.locator('#detail img,#detail svg').count(),0);
  await page.goto(base+'/shop/');await page.locator('.product').waitFor();assert.equal(await page.locator('.product img').count(),1);assert.ok(await page.locator('.product').innerText().then(t=>t.includes(product.name)));
  await page.locator('.add').click();await page.locator('#cartOpen').click();await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'testCheckout');await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('id'),'cartOpen');
  await page.goto(base+'/shop/checkout.html');assert.equal(await page.locator('#checkoutForm .summary').count(),1);assert.ok(await page.locator('#items').innerText().then(t=>t.includes(product.description)));
  await page.locator('#first').fill('Test');await page.locator('#last').fill('Person');await page.locator('#email').fill('test@example.invalid');await page.locator('#street').fill('Teststraße 1');await page.locator('#zip').fill('12345');await page.locator('#city').fill('Testort');for(const check of await page.locator('input[type=checkbox]').all())await check.check();
  let orderBody;
  await context.route('**/order',async route=>{orderBody=route.request().postDataJSON();await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,received:true,orderNumber:'TJ-TEST',total:'10,89 €'})})});
  await page.locator('#payButton').click();await page.waitForURL('**/erfolg.html');assert.equal(orderBody.cart[0].expectedUnitPrice,590);assert.ok((await page.locator('.card').innerText()).includes('Bitte bestelle nicht erneut'));assert.equal(await page.evaluate(()=>sessionStorage.getItem('tj_checkout_customer')),null);
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/shop/');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>localStorage.setItem('tj_shop_cart_v1','broken json'));await page.goto(base+'/shop/checkout.html');assert.equal(await page.locator('#payButton').isDisabled(),true);
  await page.goto(base+'/shop/');await page.locator('.product').waitFor();
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/shop-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/');await page.screenshot({path:path.join(root,'test-results/home.png'),fullPage:true});
  console.log(`PASS: ${pages.length} pages, CSP, skip focus, escaped product data, cart keyboard, order summary, partial mail failure, mobile overflow.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
