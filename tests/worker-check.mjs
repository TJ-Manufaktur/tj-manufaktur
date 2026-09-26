import assert from 'node:assert/strict';
import worker from '../cloudflare/shop-checkout-worker.js';
import {legalInformation} from '../cloudflare/legal-information.js';
let writes=0;
const product={product_id:'p_test',name:'Test',price_cents:590,variants_json:'["Natur"]',personalizable:1,stock:10,unlimited_stock:0,active:1};
const env={RESEND_API_KEY:'test-not-a-secret',DB:{prepare(){return {bind(){return this},async first(){return product},async run(){writes++;throw Error('Unexpected write')}}}}};
const customer={first:'Test',last:'Person',email:'test@example.invalid',street:'Teststraße 1',zip:'12345',city:'Testort',country:'Deutschland',payment:'bank_transfer'};
const line={id:'p_test',qty:1,variant:'Natur',personal:'',expectedUnitPrice:490};
async function order(body){return worker.fetch(new Request('https://api.example/order',{method:'POST',headers:{Origin:'https://tj-manufaktur.de','Content-Type':'application/json'},body:JSON.stringify(body)}),env,{})}
let response=await order({customer,cart:[line]});assert.equal(response.status,409);assert.equal((await response.json()).received,false);assert.equal(writes,0);
response=await order({customer,cart:[{...line,expectedUnitPrice:undefined}]});assert.equal(response.status,409);assert.equal(writes,0);
response=await order({customer:{...customer,country:'Österreich'},cart:[line]});assert.equal(response.status,400);
response=await order({customer,cart:[{...line,qty:1.5}]});assert.equal(response.status,400);
response=await order(null);assert.equal(response.status,400);
assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
assert.ok(legalInformation.includes('Muster-Widerrufsformular'));assert.ok(legalInformation.includes('Allgemeine Geschäftsbedingungen'));assert.ok(legalInformation.includes('https://tj-manufaktur.de/widerruf.html'));
console.log('PASS: price mismatch/missing price rejected before writes, country and quantity validation, null JSON, API headers, legal email snapshot.');
