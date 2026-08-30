// TJ Manufaktur – Cloudflare Worker for Stripe Checkout
// Required Worker secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (for webhook verification extension), RESEND_API_KEY (optional order email)
// Deploy as a separate Worker/route. Never expose secrets in GitHub or browser code.

const ALLOWED_ORIGIN = 'https://tj-manufaktur.de';
const SUCCESS_URL = 'https://tj-manufaktur.de/shop-erfolg.html?session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL = 'https://tj-manufaktur.de/shop-checkout-preview.html?cancelled=1';

// Authoritative server-side catalog. Browser prices are never trusted.
const CATALOG = {
  p1: { name: 'Blumenstecker', unitAmount: 590, variants: ['Birke natur','Pappel natur'] },
  p2: { name: 'Namens-/Tischschild', unitAmount: 790, variants: ['Birke natur','Pappel natur'] },
  p3: { name: 'Geschenkanhänger', unitAmount: 390, variants: ['Standard 55 × 70 mm','Mini 40 × 50 mm'] },
  p4: { name: 'Cake Topper', unitAmount: 1290, variants: ['Hochzeit','Geburtstag','Eigener Anlass'] },
  p5: { name: 'Schlüsselanhänger', unitAmount: 690, variants: ['Holz natur','Holz dunkel'] }
};

const cors = origin => ({
  'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin'
});

const json = (data, status=200, origin=ALLOWED_ORIGIN) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json; charset=utf-8', ...cors(origin) } });
const clean = (v,max=200) => String(v ?? '').trim().slice(0,max);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors(origin)});
    if (origin !== ALLOWED_ORIGIN) return json({error:'Origin not allowed'},403,origin);
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/checkout') return json({error:'Not found'},404,origin);
    if (!env.STRIPE_SECRET_KEY) return json({error:'Stripe is not configured'},503,origin);

    let body;
    try { body = await request.json(); } catch { return json({error:'Invalid JSON'},400,origin); }
    const cart = Array.isArray(body.cart) ? body.cart : [];
    const customer = body.customer || {};
    if (!cart.length || cart.length > 20) return json({error:'Invalid cart'},400,origin);
    if (!clean(customer.email,254).includes('@')) return json({error:'Invalid email'},400,origin);

    const params = new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',SUCCESS_URL);
    params.set('cancel_url',CANCEL_URL);
    params.set('customer_email',clean(customer.email,254));
    params.set('billing_address_collection','auto');
    params.set('shipping_address_collection[allowed_countries][0]','DE');
    params.set('locale','de');
    params.set('submit_type','pay');
    params.set('metadata[source]','tj-manufaktur-shop');
    params.set('metadata[customer_name]',clean(`${customer.first||''} ${customer.last||''}`,120));
    params.set('metadata[note]',clean(customer.note,450));

    let idx = 0;
    for (const raw of cart) {
      const product = CATALOG[clean(raw.id,20)];
      if (!product) return json({error:'Unknown product'},400,origin);
      const qty = Math.max(1,Math.min(50,Number.parseInt(raw.qty,10)||1));
      const variant = clean(raw.variant,80);
      if (!product.variants.includes(variant)) return json({error:'Invalid variant'},400,origin);
      const personalization = clean(raw.personal,40);
      const description = [variant, personalization ? `Personalisierung: ${personalization}` : ''].filter(Boolean).join(' · ');
      params.set(`line_items[${idx}][price_data][currency]`,'eur');
      params.set(`line_items[${idx}][price_data][unit_amount]`,String(product.unitAmount));
      params.set(`line_items[${idx}][price_data][product_data][name]`,product.name);
      params.set(`line_items[${idx}][price_data][product_data][description]`,description);
      params.set(`line_items[${idx}][quantity]`,String(qty));
      idx++;
    }

    // Shipping intentionally not charged yet: final shipping model must be approved before live launch.
    // Add a server-side shipping_rate or shipping_options here once the actual rate is fixed.

    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type':'application/x-www-form-urlencoded' },
      body:params
    });
    const result = await stripe.json();
    if (!stripe.ok || !result.url) return json({error:'Stripe checkout could not be created',detail:result.error?.message||''},502,origin);
    return json({url:result.url,sessionId:result.id},200,origin);
  }
};
