// ============================================================
// TJ MANUFAKTUR – SHOP + ADMIN WORKER
// Cloudflare Access JWT + D1 + Resend
// ============================================================
//
// Bindings:
//
// DB             -> D1: tj-manufaktur-orders
// RESEND_API_KEY -> Secret
// TEAM_DOMAIN    -> Text
// POLICY_AUD     -> Text
//
// Öffentliche API:
// POST /order
//
// Admin:
// GET   /api/admin/orders
// PATCH /api/admin/orders/:orderNumber
//
// ============================================================


import { legalInformation } from './legal-information.js';

const ALLOWED_ORIGINS = [
  'https://tj-manufaktur.de',
  'https://www.tj-manufaktur.de'
];

const ADMIN_EMAIL = 'info@tj-manufaktur.de';


// ============================================================
// PRODUKTKATALOG
// ============================================================

const CATALOG = {

  p1: {
    name: 'Blumenstecker',
    price: 590,
    variants: [
      'Birke natur',
      'Pappel natur'
    ]
  },

  p2: {
    name: 'Namens- & Tischschild',
    price: 790,
    variants: [
      'Birke natur',
      'Pappel natur'
    ]
  },

  p3: {
    name: 'Geschenkanhänger',
    price: 390,
    variants: [
      'Standard 55 × 70 mm',
      'Mini 40 × 50 mm'
    ]
  },

  p4: {
    name: 'Cake Topper',
    price: 1290,
    variants: [
      'Hochzeit',
      'Geburtstag',
      'Eigener Anlass'
    ]
  },

  p5: {
    name: 'Schlüsselanhänger',
    price: 690,
    variants: [
      'Holz natur',
      'Holz dunkel'
    ]
  }

};


const ORDER_STATUSES = [
  'new',
  'processing',
  'ready',
  'shipped',
  'completed',
  'cancelled'
];


const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'refunded'
];


// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function clean(value, max = 250) {

  return String(value ?? '')
    .trim()
    .slice(0, max);

}


function escapeHtml(value) {

  return clean(value, 1000)
    .replace(
      /[&<>"']/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]
    );

}


function euro(cents) {

  return (cents / 100).toLocaleString(
    'de-DE',
    {
      style: 'currency',
      currency: 'EUR'
    }
  );

}


function createOrderNumber() {

  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '');

  const randomPart =
    crypto
      .randomUUID()
      .replaceAll('-', '')
      .slice(0, 8)
      .toUpperCase();

  return `TJ-${datePart}-${randomPart}`;

}


// ============================================================
// BASE64URL
// ============================================================

function base64UrlToBytes(value) {

  let base64 =
    value
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  while (base64.length % 4) {
    base64 += '=';
  }

  const binary = atob(base64);

  const bytes =
    new Uint8Array(binary.length);

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);

  }

  return bytes;

}


function decodeJwtJson(value) {

  const bytes =
    base64UrlToBytes(value);

  return JSON.parse(
    new TextDecoder()
      .decode(bytes)
  );

}


// ============================================================
// CLOUDFLARE ACCESS JWT
// ============================================================

async function verifyAccessJwt(
  request,
  env
) {

  if (
    !env.TEAM_DOMAIN ||
    !env.POLICY_AUD
  ) {

    throw new Error(
      'Access-Konfiguration fehlt.'
    );

  }


  const token =
    request.headers.get(
      'Cf-Access-Jwt-Assertion'
    );


  if (!token) {

    throw new Error(
      'Access-JWT fehlt.'
    );

  }


  const parts =
    token.split('.');


  if (parts.length !== 3) {

    throw new Error(
      'Ungültiges JWT-Format.'
    );

  }


  const [
    encodedHeader,
    encodedPayload,
    encodedSignature
  ] = parts;


  let header;
  let payload;


  try {

    header =
      decodeJwtJson(
        encodedHeader
      );

    payload =
      decodeJwtJson(
        encodedPayload
      );

  } catch {

    throw new Error(
      'JWT konnte nicht gelesen werden.'
    );

  }


  // Ausschließlich RS256 akzeptieren.

  if (
    header.alg !== 'RS256' ||
    !header.kid
  ) {

    throw new Error(
      'Ungültiger JWT-Algorithmus.'
    );

  }


  // ----------------------------------------------------------
  // ISSUER
  // ----------------------------------------------------------

  const expectedIssuer =
    String(env.TEAM_DOMAIN)
      .replace(/\/+$/, '');


  if (
    payload.iss !==
    expectedIssuer
  ) {

    throw new Error(
      'Ungültiger JWT-Issuer.'
    );

  }


  // ----------------------------------------------------------
  // AUDIENCE
  // ----------------------------------------------------------

  const audiences =
    Array.isArray(payload.aud)
      ? payload.aud
      : [payload.aud];


  if (
    !audiences.includes(
      env.POLICY_AUD
    )
  ) {

    throw new Error(
      'Ungültige JWT-Audience.'
    );

  }


  // ----------------------------------------------------------
  // GÜLTIGKEITSZEIT
  // ----------------------------------------------------------

  const now =
    Math.floor(
      Date.now() / 1000
    );


  if (
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {

    throw new Error(
      'Access-JWT ist abgelaufen.'
    );

  }


  if (
    typeof payload.nbf === 'number' &&
    payload.nbf > now + 30
  ) {

    throw new Error(
      'Access-JWT ist noch nicht gültig.'
    );

  }


  // ----------------------------------------------------------
  // DEFENSE IN DEPTH
  // Zusätzlich zur Cloudflare-Access-Policy wird geprüft,
  // dass das JWT tatsächlich zum Admin-Konto gehört.
  // ----------------------------------------------------------

  if (
    clean(
      payload.email,
      254
    ).toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {

    throw new Error(
      'Admin-E-Mail nicht autorisiert.'
    );

  }


  // ----------------------------------------------------------
  // CLOUDFLARE ACCESS PUBLIC KEYS LADEN
  // ----------------------------------------------------------

  const certsUrl =
    `${expectedIssuer}/cdn-cgi/access/certs`;


  const certResponse =
    await fetch(
      certsUrl,
      {
        headers: {
          'Accept':
            'application/json'
        }
      }
    );


  if (!certResponse.ok) {

    throw new Error(
      'Access-Schlüssel konnten nicht geladen werden.'
    );

  }


  const jwks =
    await certResponse.json();


  const keys =
    Array.isArray(jwks.keys)
      ? jwks.keys
      : [];


  const jwk =
    keys.find(
      key =>
        key.kid === header.kid &&
        key.kty === 'RSA'
    );


  if (!jwk) {

    throw new Error(
      'Passender Access-Schlüssel nicht gefunden.'
    );

  }


  // ----------------------------------------------------------
  // RSA PUBLIC KEY IMPORTIEREN
  // ----------------------------------------------------------

  let publicKey;


  try {

    publicKey =
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name:
            'RSASSA-PKCS1-v1_5',

          hash:
            'SHA-256'
        },
        false,
        ['verify']
      );

  } catch {

    throw new Error(
      'Access-Schlüssel konnte nicht importiert werden.'
    );

  }


  // ----------------------------------------------------------
  // JWT-SIGNATUR PRÜFEN
  // ----------------------------------------------------------

  const signedData =
    new TextEncoder()
      .encode(
        `${encodedHeader}.${encodedPayload}`
      );


  const signature =
    base64UrlToBytes(
      encodedSignature
    );


  const validSignature =
    await crypto.subtle.verify(
      {
        name:
          'RSASSA-PKCS1-v1_5'
      },
      publicKey,
      signature,
      signedData
    );


  if (!validSignature) {

    throw new Error(
      'Ungültige Access-JWT-Signatur.'
    );

  }


  return payload;

}


// ============================================================
// ADMIN AUTHENTIFIZIERUNG
//
// Ausschließlich Cloudflare Access.
// Kein Test-Token / kein Fallback.
// ============================================================

async function authenticateAdmin(
  request,
  env
) {

  try {

    const payload =
      await verifyAccessJwt(
        request,
        env
      );


    console.log(
      'ADMIN_ACCESS_OK',
      payload.email || ''
    );


    return {
      ok: true,
      method: 'access',
      payload
    };


  } catch (error) {

    console.warn(
      'ADMIN_ACCESS_FAILED',
      error.message
    );


    return {
      ok: false,
      method: null,
      payload: null
    };

  }

}


// ============================================================
// CORS
// ============================================================

function cors(origin) {

  const headers = {

    'Access-Control-Allow-Methods':
      'GET,POST,PATCH,OPTIONS',

    'Access-Control-Allow-Headers':
      'Content-Type',

    'Vary':
      'Origin'

  };


  if (
    ALLOWED_ORIGINS.includes(
      origin
    )
  ) {

    headers[
      'Access-Control-Allow-Origin'
    ] = origin;

  }


  return headers;

}


// ============================================================
// JSON RESPONSE
// ============================================================

function reply(
  data,
  status = 200,
  origin = ''
) {

  return new Response(
    JSON.stringify(data),
    {

      status,

      headers: {

        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store',

        'X-Content-Type-Options':
          'nosniff',

        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Strict-Transport-Security': 'max-age=31536000',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

        'Referrer-Policy':
          'no-referrer',

        ...cors(origin)

      }

    }
  );

}


// ============================================================
// RESEND
// ============================================================

async function sendMail(
  env,
  to,
  subject,
  html,
  mailType
) {

  console.log(
    'MAIL_ATTEMPT',
    mailType
  );


  const response =
    await fetch(
      'https://api.resend.com/emails',
      {

        method: 'POST',

        headers: {

          'Authorization':
            'Bearer ' +
            env.RESEND_API_KEY,

          'Content-Type':
            'application/json'

        },

        body: JSON.stringify({

          from:
            'TJ Manufaktur Shop <bestellung@send.tj-manufaktur.de>',

          reply_to:
            'info@tj-manufaktur.de',

          to: [
            to
          ],

          subject,

          html

        })

      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();


    console.error(
      'RESEND_ERROR',
      mailType,
      response.status,
      errorText
    );


    throw new Error(
      `Resend HTTP ${response.status}`
    );

  }


  let result = {};


  try {

    result =
      await response.json();

  } catch {

    result = {};

  }


  console.log(
    'MAIL_SUCCESS',
    mailType,
    result.id || ''
  );


  return result;

}


// ============================================================
// BESTELLUNG AKTUALISIEREN
// ============================================================

async function updateOrder(
  env,
  orderId,
  fields
) {

  const allowed = {

    admin_email_sent:
      'admin_email_sent',

    customer_email_sent:
      'customer_email_sent',

    last_error:
      'last_error',

    order_status:
      'order_status',

    payment_status:
      'payment_status',

    completed_at:
      'completed_at'

  };


  const entries =
    Object.entries(fields)
      .filter(
        ([key]) => allowed[key]
      );


  if (!entries.length) {
    return;
  }


  const setParts = [];
  const values = [];


  for (
    const [key, value]
    of entries
  ) {

    setParts.push(
      `${allowed[key]} = ?`
    );

    values.push(value);

  }


  setParts.push(
    'updated_at = CURRENT_TIMESTAMP'
  );


  values.push(orderId);


  await env.DB
    .prepare(
      `
      UPDATE orders
      SET ${setParts.join(', ')}
      WHERE id = ?
      `
    )
    .bind(...values)
    .run();

}


// ============================================================
// ADMIN – BESTELLUNGEN LADEN
// ============================================================

async function getAdminOrders(
  request,
  env,
  origin
) {

  const auth =
    await authenticateAdmin(
      request,
      env
    );


  if (!auth.ok) {

    return reply(
      {
        ok: false,
        error:
          'Nicht autorisiert.'
      },
      401,
      origin
    );

  }


  try {

    const orderResult =
      await env.DB
        .prepare(
          `
          SELECT
            id,
            order_number,
            created_at,
            updated_at,

            first_name,
            last_name,
            email,

            street,
            postal_code,
            city,
            country,

            customer_note,

            subtotal_cents,
            shipping_cents,
            total_cents,

            payment_method,
            payment_status,

            order_status,

            admin_email_sent,
            customer_email_sent,

            last_error,
            completed_at

          FROM orders

          ORDER BY id DESC

          LIMIT 500
          `
        )
        .all();


    const orders =
      orderResult.results || [];


    if (!orders.length) {

      return reply(
        {
          ok: true,
          auth:
            auth.method,
          orders: []
        },
        200,
        origin
      );

    }


    const itemResult =
      await env.DB
        .prepare(
          `
          SELECT
            id,
            order_id,

            product_id,
            product_name,

            variant,
            personalization,

            quantity,

            unit_price_cents,
            total_price_cents

          FROM order_items

          ORDER BY id ASC
          `
        )
        .all();


    const items =
      itemResult.results || [];


    const itemsByOrder =
      new Map();


    for (const item of items) {

      if (
        !itemsByOrder.has(
          item.order_id
        )
      ) {

        itemsByOrder.set(
          item.order_id,
          []
        );

      }


      itemsByOrder
        .get(item.order_id)
        .push(item);

    }


    for (const order of orders) {

      order.items =
        itemsByOrder.get(
          order.id
        ) || [];

    }


    return reply(
      {
        ok: true,
        auth:
          auth.method,
        orders
      },
      200,
      origin
    );


  } catch (error) {

    console.error(
      'ADMIN_LIST_ERROR',
      error.message
    );


    return reply(
      {
        ok: false,
        error:
          'Bestellungen konnten nicht geladen werden.'
      },
      500,
      origin
    );

  }

}


// ============================================================
// ADMIN – STATUS ÄNDERN
// ============================================================

async function patchAdminOrder(
  request,
  env,
  origin,
  orderNumber
) {

  const auth =
    await authenticateAdmin(
      request,
      env
    );


  if (!auth.ok) {

    return reply(
      {
        ok: false,
        error:
          'Nicht autorisiert.'
      },
      401,
      origin
    );

  }


  let body;


  try {

    body =
      await request.json();

  } catch {

    return reply(
      {
        ok: false,
        error:
          'Ungültige Anfrage.'
      },
      400,
      origin
    );

  }


  const orderStatus =
    clean(
      body.order_status,
      40
    );


  const paymentStatus =
    clean(
      body.payment_status,
      40
    );


  if (
    !ORDER_STATUSES.includes(
      orderStatus
    )
  ) {

    return reply(
      {
        ok: false,
        error:
          'Ungültiger Bestellstatus.'
      },
      400,
      origin
    );

  }


  if (
    !PAYMENT_STATUSES.includes(
      paymentStatus
    )
  ) {

    return reply(
      {
        ok: false,
        error:
          'Ungültiger Zahlungsstatus.'
      },
      400,
      origin
    );

  }


  try {

    const order =
      await env.DB
        .prepare(
          `
          SELECT
            id,
            order_number

          FROM orders

          WHERE order_number = ?

          LIMIT 1
          `
        )
        .bind(orderNumber)
        .first();


    if (!order) {

      return reply(
        {
          ok: false,
          error:
            'Bestellung nicht gefunden.'
        },
        404,
        origin
      );

    }


    let completedAt = null;


    if (
      orderStatus ===
      'completed'
    ) {

      completedAt =
        new Date()
          .toISOString();

    }


    await env.DB
      .prepare(
        `
        UPDATE orders

        SET
          order_status = ?,
          payment_status = ?,
          completed_at = ?,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
        `
      )
      .bind(
        orderStatus,
        paymentStatus,
        completedAt,
        order.id
      )
      .run();


    console.log(
      'ADMIN_ORDER_UPDATED',
      auth.method,
      orderNumber,
      orderStatus,
      paymentStatus
    );


    return reply(
      {
        ok: true,

        auth:
          auth.method,

        orderNumber,

        order_status:
          orderStatus,

        payment_status:
          paymentStatus
      },
      200,
      origin
    );


  } catch (error) {

    console.error(
      'ADMIN_UPDATE_ERROR',
      error.message
    );


    return reply(
      {
        ok: false,
        error:
          'Bestellung konnte nicht aktualisiert werden.'
      },
      500,
      origin
    );

  }

}


// ============================================================
// NEUE BESTELLUNG
// ============================================================

async function createOrder(
  request,
  env,
  origin
) {

  if (!env.DB) {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'Bestellspeicher nicht konfiguriert.'
      },
      503,
      origin
    );

  }


  if (!env.RESEND_API_KEY) {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'E-Mail-Dienst nicht konfiguriert.'
      },
      503,
      origin
    );

  }


  let body;


  try {

    body =
      await request.json();

  } catch {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'Ungültige Anfrage.'
      },
      400,
      origin
    );

  }


  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ok:false,received:false,error:'Ungültige Anfrage.'},400,origin);

  const customer =
    body.customer || {};


  const cart =
    Array.isArray(body.cart)
      ? body.cart
      : [];


  const first =
    clean(customer.first, 80);

  const last =
    clean(customer.last, 80);

  const email =
    clean(customer.email, 254);

  const street =
    clean(customer.street, 160);

  const zip =
    clean(customer.zip, 10);

  const city =
    clean(customer.city, 100);

  const note =
    clean(customer.note, 500);

  const payment =
    clean(customer.payment, 40);


  if (
    !first ||
    !last ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    customer.country !== 'Deutschland' ||
    !street ||
    !/^\d{5}$/.test(zip) ||
    !city
  ) {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'Bitte alle Pflichtfelder korrekt ausfüllen.'
      },
      400,
      origin
    );

  }


  if (
    payment &&
    payment !== 'bank_transfer'
  ) {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'Ungültige Zahlungsart.'
      },
      400,
      origin
    );

  }


  if (
    cart.length < 1 ||
    cart.length > 20
  ) {

    return reply(
      {
        ok: false,
        received: false,
        error:
          'Ungültiger Warenkorb.'
      },
      400,
      origin
    );

  }


  const items = [];

  let subtotal = 0;


  for (const raw of cart) {
    if (!raw || typeof raw !== "object") return reply({ok:false,received:false,error:"Ungültiger Warenkorb."},400,origin);

    const productId =
      clean(
        raw.id,
        20
      );


    const productRow = await env.DB.prepare(
      'SELECT product_id,name,price_cents,variants_json,personalizable,stock,unlimited_stock,active FROM products WHERE product_id=? LIMIT 1'
    ).bind(productId).first();

    let productVariants = [];
    try { productVariants = JSON.parse(productRow?.variants_json || '[]'); } catch {}

    const product = productRow ? {
      name: productRow.name,
      price: productRow.price_cents,
      variants: productVariants,
      stock: productRow.stock,
      unlimitedStock: !!productRow.unlimited_stock,
      active: !!productRow.active,
      personalizable: productRow.personalizable !== 0
    } : null;


    if (!product || !product.active) {

      return reply(
        {
          ok: false,
          received: false,
          error:
            'Unbekanntes Produkt.'
        },
        400,
        origin
      );

    }


    const qty =
      Number(raw.qty);


    if (
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 50
    ) {

      return reply(
        {
          ok: false,
          received: false,
          error:
            'Ungültige Bestellmenge.'
        },
        400,
        origin
      );

    }


    if (!product.unlimitedStock && product.stock < qty) {
      return reply(
        { ok:false, received:false, error:'Nicht genügend Bestand für '+product.name+'.' },
        409,
        origin
      );
    }


    const variant =
      clean(
        raw.variant,
        80
      );


    if (
      product.variants.length > 0 &&
      !product.variants.includes(
        variant
      )
    ) {

      return reply(
        {
          ok: false,
          received: false,
          error:
            'Ungültige Produktausführung.'
        },
        400,
        origin
      );

    }


    const personalization = product.personalizable
      ? clean(raw.personal,40)
      : '';


    if (!Number.isInteger(raw.expectedUnitPrice) || raw.expectedUnitPrice !== product.price) {
      return reply({ok:false, received:false, error:'Der Produktpreis hat sich geändert oder konnte nicht bestätigt werden. Bitte den Artikel im Shop erneut in den Warenkorb legen und den Gesamtpreis prüfen.'},409,origin);
    }

    const lineTotal =
      product.price * qty;


    subtotal +=
      lineTotal;


    items.push({

      productId,

      productName:
        product.name,

      variant,

      personalization,

      quantity:
        qty,

      unitPrice:
        product.price,

      lineTotal

    });

  }


  const shipping = subtotal >= 5000 ? 0 : 499;

  const total =
    subtotal + shipping;


  const orderNumber =
    createOrderNumber();


  let orderId;


  // ==========================================================
  // D1 SPEICHERN
  // ==========================================================

  try {

    const result =
      await env.DB
        .prepare(
          `
          INSERT INTO orders (

            order_number,

            first_name,
            last_name,
            email,

            street,
            postal_code,
            city,
            country,

            customer_note,

            subtotal_cents,
            shipping_cents,
            total_cents,

            payment_method,
            payment_status,

            order_status,

            admin_email_sent,
            customer_email_sent,

            last_error

          )

          VALUES (

            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            0, 0, NULL

          )
          `
        )
        .bind(

          orderNumber,

          first,
          last,
          email,

          street,
          zip,
          city,
          'DE',

          note || null,

          subtotal,
          shipping,
          total,

          'bank_transfer',
          'pending',

          'new'

        )
        .run();


    orderId =
      result.meta.last_row_id;


    if (!orderId) {

      throw new Error(
        'Keine Bestell-ID erhalten.'
      );

    }


    const statements =
      items.map(
        item =>

          env.DB
            .prepare(
              `
              INSERT INTO order_items (

                order_id,

                product_id,
                product_name,

                variant,
                personalization,

                quantity,

                unit_price_cents,
                total_price_cents

              )

              VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?
              )
              `
            )
            .bind(

              orderId,

              item.productId,
              item.productName,

              item.variant,

              item.personalization ||
                null,

              item.quantity,

              item.unitPrice,
              item.lineTotal

            )

      );


    await env.DB.batch(
      statements
    );

    // Atomarer Bestandsabzug pro Position: D1 ändert den Bestand nur,
    // wenn zum Zeitpunkt des UPDATE noch genügend Stück vorhanden sind.
    for (const item of items) {
      const stockResult = await env.DB.prepare(
        'UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE product_id=? AND unlimited_stock=0 AND stock>=?'
      ).bind(item.quantity,item.productId,item.quantity).run();

      const productState = await env.DB.prepare(
        'SELECT unlimited_stock FROM products WHERE product_id=? LIMIT 1'
      ).bind(item.productId).first();

      if (!productState?.unlimited_stock && Number(stockResult.meta?.changes || 0) !== 1) {
        throw new Error('Bestand wurde zwischenzeitlich verkauft: '+item.productName);
      }
    }


    console.log(
      'ORDER_SAVED',
      orderNumber
    );


  } catch (error) {

    console.error(
      'DATABASE_ERROR',
      error.message
    );


    return reply(
      {
        ok: false,
        received: false,
        error:
          'Die Bestellung konnte nicht gespeichert werden.'
      },
      500,
      origin
    );

  }


  // ==========================================================
  // MAIL HTML
  // ==========================================================

  let rows = '';


  for (const item of items) {

    rows += `

      <tr>

        <td>

          <strong>
            ${escapeHtml(
              item.productName
            )}
          </strong>

          <br>

          <small>

            ${escapeHtml(
              item.variant
            )}

            ${
              item.personalization
                ? '<br>Personalisierung: ' +
                  escapeHtml(
                    item.personalization
                  )
                : ''
            }

          </small>

        </td>

        <td>
          ${item.quantity}
        </td>

        <td>
          ${euro(
            item.lineTotal
          )}
        </td>

      </tr>

    `;

  }


  const table = `

    <table
      cellpadding="8"
      cellspacing="0"
      border="1"
      style="
        border-collapse:collapse;
        width:100%;
      "
    >

      <tr>

        <th align="left">
          Artikel
        </th>

        <th>
          Menge
        </th>

        <th>
          Summe
        </th>

      </tr>

      ${rows}

      <tr>

        <td colspan="2">

          <strong>
            Versand
          </strong>

        </td>

        <td>
          ${shipping === 0 ? 'Kostenfrei' : euro(shipping)}
        </td>

      </tr>

      <tr>

        <td colspan="2">

          <strong>
            Gesamt
          </strong>

        </td>

        <td>

          <strong>
            ${euro(total)}
          </strong>

        </td>

      </tr>

    </table>

  `;


  const address = `

    ${escapeHtml(first)}
    ${escapeHtml(last)}

    <br>

    ${escapeHtml(street)}

    <br>

    ${escapeHtml(zip)}
    ${escapeHtml(city)}

    <br>

    Deutschland

  `;


  const common = `

    <h2>
      Bestellung
      ${escapeHtml(orderNumber)}
    </h2>

    ${table}

    <h3>
      Lieferanschrift
    </h3>

    <p>
      ${address}
    </p>

    <p>

      <strong>
        Zahlungsart:
      </strong>

      Überweisung

    </p>

    ${
      note
        ? `

          <p>

            <strong>
              Hinweis:
            </strong>

            ${escapeHtml(note)}

          </p>

        `
        : ''
    }

    <p>

      Kleinunternehmer gemäß
      § 19 UStG –
      kein Ausweis der Umsatzsteuer.

    </p>

  `;


  // ==========================================================
  // ADMIN-MAIL
  // ==========================================================

  try {

    await sendMail(

      env,

      'info@tj-manufaktur.de',

      `Neue Shop-Bestellung ${orderNumber}`,

      `

        <p>
          Neue Bestellung von
          ${escapeHtml(first)}
          ${escapeHtml(last)}
          (${escapeHtml(email)}).
        </p>

        ${common}

      `,

      'ADMIN'

    );


    await updateOrder(
      env,
      orderId,
      {
        admin_email_sent: 1,
        last_error: null
      }
    );


  } catch {

    await updateOrder(
      env,
      orderId,
      {
        last_error:
          'admin_email_failed'
      }
    );


    return reply(
      {

        ok: false,

        received: true,

        stored: true,

        stage:
          'admin_email',

        orderNumber,

        total:
          euro(total),

        error:
          'Die Bestellung wurde gespeichert, aber die interne Bestellbenachrichtigung konnte nicht versendet werden.'

      },
      502,
      origin
    );

  }


  // ==========================================================
  // KUNDENMAIL
  // ==========================================================

  try {

    await sendMail(

      env,

      email,

      `Bestellbestätigung ${orderNumber} | TJ Manufaktur`,

      `

        <p>
          Hallo
          ${escapeHtml(first)},
        </p>

        <p>
          wir haben deine Bestellung erhalten.
        </p>

        ${common}
        ${legalInformation}

        <p>
          Es wurde keine Online-Zahlung ausgelöst. Die gewählte Zahlungsart ist Überweisung / Vorkasse.
        </p>

        <p>

          TJ Manufaktur

          <br>

          Am Jägerhof 5

          <br>

          34454 Bad Arolsen

          <br>

          info@tj-manufaktur.de

        </p>

      `,

      'CUSTOMER'

    );


    await updateOrder(
      env,
      orderId,
      {

        customer_email_sent: 1,

        last_error: null

      }
    );


  } catch {

    await updateOrder(
      env,
      orderId,
      {
        last_error:
          'customer_email_failed'
      }
    );


    return reply(
      {

        ok: false,

        received: true,

        stored: true,

        stage:
          'customer_email',

        orderNumber,

        total:
          euro(total),

        error:
          'Die Bestellung wurde gespeichert. Die Bestätigungsmail konnte jedoch nicht versendet werden.'

      },
      502,
      origin
    );

  }


  return reply(
    {

      ok: true,

      received: true,

      stored: true,

      orderNumber,

      total:
        euro(total)

    },
    200,
    origin
  );

}


// ============================================================
// PRODUKTE – D1
// ============================================================
function productDto(row){let variants=[],tags=[];try{variants=JSON.parse(row.variants_json||'[]')}catch{}try{tags=JSON.parse(row.tags_json||'[]')}catch{}return{id:row.product_id,sku:row.sku||'',name:row.name,description:row.description||'',category:row.category||'',price_cents:row.price_cents,price:row.price_cents/100,variants,tags,personalization_label:row.personalization_label||'',personalization_placeholder:row.personalization_placeholder||'',personalizable:row.personalizable!==0,stock:row.stock,unlimited_stock:!!row.unlimited_stock,active:!!row.active,sort_order:row.sort_order||0}}
async function getPublicProducts(env,origin){try{const r=await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY sort_order ASC,id ASC').all();return reply({ok:true,products:(r.results||[]).map(productDto)},200,origin)}catch(e){console.error('PRODUCT_LIST_ERROR',e.message);return reply({ok:false,error:'Artikel konnten nicht geladen werden.'},500,origin)}}
async function getAdminProducts(request,env,origin){const a=await authenticateAdmin(request,env);if(!a.ok)return reply({ok:false,error:'Nicht autorisiert.'},401,origin);try{const r=await env.DB.prepare('SELECT * FROM products ORDER BY sort_order ASC,id ASC').all();return reply({ok:true,products:(r.results||[]).map(productDto)},200,origin)}catch(e){return reply({ok:false,error:'Artikel konnten nicht geladen werden.'},500,origin)}}
function normalizeProduct(b){const name=clean(b.name,120),sku=clean(b.sku,60),description=clean(b.description,1000),category=clean(b.category,100),label=clean(b.personalization_label,80),placeholder=clean(b.personalization_placeholder,120),personalizable=b.personalizable===false?0:1,price=Number.parseInt(b.price_cents,10),stock=Number.parseInt(b.stock,10),sort=Number.parseInt(b.sort_order,10)||0,variants=Array.isArray(b.variants)?b.variants.map(v=>clean(v,80)).filter(Boolean).slice(0,30):[],tags=Array.isArray(b.tags)?b.tags.map(v=>clean(v,50)).filter(Boolean).slice(0,20):[];if(!name||!Number.isInteger(price)||price<0||price>10000000)throw Error('Name oder Preis ungültig.');if(!b.unlimited_stock&&(!Number.isInteger(stock)||stock<0||stock>1000000))throw Error('Bestand ungültig.');return{name,sku,description,category,label,placeholder,price,stock:b.unlimited_stock?0:stock,sort,variants,tags,personalizable,unlimited:b.unlimited_stock?1:0,active:b.active===false?0:1}}
async function createAdminProduct(request,env,origin){const a=await authenticateAdmin(request,env);if(!a.ok)return reply({ok:false,error:'Nicht autorisiert.'},401,origin);let b;try{b=await request.json()}catch{return reply({ok:false,error:'Ungültige Anfrage.'},400,origin)}try{const p=normalizeProduct(b),id='p_'+crypto.randomUUID().replaceAll('-','').slice(0,12);await env.DB.prepare('INSERT INTO products (product_id,sku,name,description,category,price_cents,variants_json,tags_json,personalization_label,personalization_placeholder,personalizable,stock,unlimited_stock,active,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,p.sku||null,p.name,p.description,p.category,p.price,JSON.stringify(p.variants),JSON.stringify(p.tags),p.label,p.placeholder,p.personalizable,p.stock,p.unlimited,p.active,p.sort).run();return reply({ok:true,id},201,origin)}catch(e){return reply({ok:false,error:e.message||'Artikel konnte nicht angelegt werden.'},400,origin)}}
async function patchAdminProduct(request,env,origin,id){const a=await authenticateAdmin(request,env);if(!a.ok)return reply({ok:false,error:'Nicht autorisiert.'},401,origin);let b;try{b=await request.json()}catch{return reply({ok:false,error:'Ungültige Anfrage.'},400,origin)}try{const p=normalizeProduct(b);await env.DB.prepare('UPDATE products SET sku=?,name=?,description=?,category=?,price_cents=?,variants_json=?,tags_json=?,personalization_label=?,personalization_placeholder=?,personalizable=?,stock=?,unlimited_stock=?,active=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(p.sku||null,p.name,p.description,p.category,p.price,JSON.stringify(p.variants),JSON.stringify(p.tags),p.label,p.placeholder,p.personalizable,p.stock,p.unlimited,p.active,p.sort,id).run();return reply({ok:true,id},200,origin)}catch(e){return reply({ok:false,error:e.message||'Artikel konnte nicht gespeichert werden.'},400,origin)}}
async function archiveAdminProduct(request,env,origin,id){const a=await authenticateAdmin(request,env);if(!a.ok)return reply({ok:false,error:'Nicht autorisiert.'},401,origin);await env.DB.prepare('UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(id).run();return reply({ok:true,id},200,origin)}

// ============================================================
// ROUTER
// ============================================================

export default {

  async fetch(request, env) {

    const origin =
      request.headers.get(
        'Origin'
      ) || '';


    const url =
      new URL(
        request.url
      );


    // ========================================================
    // PREFLIGHT
    // ========================================================

    if (
      request.method ===
      'OPTIONS'
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            cors(origin)
        }
      );

    }


    // ========================================================
    // ORIGIN
    //
    // WICHTIG:
    // Same-Origin GET kann ohne Origin eintreffen.
    // Daher fehlenden Origin NICHT blockieren.
    // ========================================================

    if (
      origin &&
      !ALLOWED_ORIGINS.includes(
        origin
      )
    ) {

      return reply(
        {
          ok: false,
          error:
            'Origin nicht erlaubt.'
        },
        403,
        origin
      );

    }


    // ========================================================
    // SHOP
    // ========================================================

    if (
      request.method ===
        'POST' &&
      url.pathname ===
        '/order'
    ) {

      return createOrder(
        request,
        env,
        origin
      );

    }


    // ========================================================
    // ADMIN LISTE
    // ========================================================

    if (
      request.method ===
        'GET' &&
      url.pathname ===
        '/api/admin/orders'
    ) {

      return getAdminOrders(
        request,
        env,
        origin
      );

    }


    // ========================================================
    // ADMIN PATCH
    // ========================================================

    const match =
      url.pathname.match(
        /^\/api\/admin\/orders\/([^/]+)$/
      );


    if (
      request.method ===
        'PATCH' &&
      match
    ) {

      const orderNumber =
        decodeURIComponent(
          match[1]
        );


      return patchAdminOrder(
        request,
        env,
        origin,
        orderNumber
      );

    }


    if(request.method==='GET'&&url.pathname==='/products')return getPublicProducts(env,origin);
    if(request.method==='GET'&&url.pathname==='/api/admin/products')return getAdminProducts(request,env,origin);
    if(request.method==='POST'&&url.pathname==='/api/admin/products')return createAdminProduct(request,env,origin);
    const productMatch=url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
    if(productMatch&&request.method==='PATCH')return patchAdminProduct(request,env,origin,decodeURIComponent(productMatch[1]));
    if(productMatch&&request.method==='DELETE')return archiveAdminProduct(request,env,origin,decodeURIComponent(productMatch[1]));

    return reply(
      {
        ok: false,
        error:
          'Nicht gefunden.'
      },
      404,
      origin
    );

  }

};