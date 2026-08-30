# TJ Manufaktur – Shop Checkout Setup

Der Frontend-Checkout und der sichere Worker-Code sind vorbereitet. Für den echten Testbetrieb fehlen nur noch Kontogeheimnisse und die Cloudflare-Bereitstellung.

## 1. Worker bereitstellen

Datei: `cloudflare/shop-checkout-worker.js`

Als separaten Cloudflare Worker deployen. Empfohlener Name: `tj-manufaktur-shop-checkout`.

## 2. Secret setzen

Im Worker als Secret (niemals als normale Variable und niemals in GitHub) hinterlegen:

- `STRIPE_SECRET_KEY` = Stripe Test Secret Key (`sk_test_...`)

Für den späteren Webhook zusätzlich:

- `STRIPE_WEBHOOK_SECRET` = Stripe Webhook Signing Secret (`whsec_...`)
- `RESEND_API_KEY` = nur falls Bestellbestätigung über Resend versendet wird

## 3. Worker-URL im Frontend eintragen

In `shop-checkout-preview.html` steht aktuell:

```js
const WORKER_URL='';
```

Nach Deployment dort die Worker-Basis-URL eintragen, ohne abschließenden Slash, z. B. `https://tj-manufaktur-shop-checkout.<account>.workers.dev`.

## 4. Versand vor Livegang festlegen

Der Worker berechnet absichtlich noch **keine Versandkosten**. Es darf kein erfundener Versandpreis live gehen. Erst nach Festlegung des echten Versandmodells serverseitig `shipping_options` bzw. eine Stripe Shipping Rate ergänzen und die Bestellübersicht entsprechend aktualisieren.

## 5. Sicherheit

- Preise werden ausschließlich aus dem serverseitigen `CATALOG` übernommen.
- Browser-Preise werden ignoriert.
- Varianten werden serverseitig validiert.
- Menge ist auf 1–50 begrenzt.
- CORS akzeptiert nur `https://tj-manufaktur.de`.
- Stripe Secret Key bleibt ausschließlich im Worker.
- Erfolgseite allein ist später **kein Zahlungsnachweis**. Vor Livegang muss ein Stripe-Webhook `checkout.session.completed` verifizieren und die Bestellung serverseitig erfassen.

## 6. Vor Livegang noch zwingend

1. echte Versandkosten festlegen,
2. Stripe Testmodus komplett testen,
3. Webhook + Bestellerfassung + Bestellmail ergänzen,
4. endgültige Preis-/Produktkalkulation bestätigen,
5. Checkout-Rechtstexte/Bestellbutton für den konkreten Live-Ablauf abschließend prüfen,
6. erst danach Live Secret Key verwenden.
