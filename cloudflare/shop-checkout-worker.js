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

