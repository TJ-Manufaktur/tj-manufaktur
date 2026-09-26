# Sicherheitsheader für tj-manufaktur.de

Die Website wird laut Repository über GitHub Pages ausgeliefert. GitHub Pages wertet weder `_headers` noch `.htaccess` aus. Die Datei `security-headers.json` ist die geprüfte Sollkonfiguration, keine bereits aktivierte Cloudflare-Regel.

## Aktivierung beim vorhandenen Cloudflare-Proxy

1. Prüfen, dass `tj-manufaktur.de` und `www.tj-manufaktur.de` tatsächlich über Cloudflare proxied werden. DNS- oder Routing-Änderungen nicht nebenbei durchführen.
2. In Rules → Transform Rules → Modify Response Header eine Regel ausschließlich für diese Hosts anlegen. Werte aus `security-headers.json` mit **Set** setzen, nicht mehrfach anhängen. Vorhandene Regeln zuerst auf Überschneidungen prüfen. API- und Access-Anmeldestrecken von der HTML-Regel ausnehmen, sofern sie eigene Regeln haben.
3. Die CSP ist lokal mit allen öffentlichen HTML-Seiten getestet. Für die erste Live-Prüfung den CSP-Wert vorübergehend als `Content-Security-Policy-Report-Only` setzen und auf allen wichtigen Wegen die Browserkonsole kontrollieren. Danach `Content-Security-Policy` erzwingen. Keine externen Reporting-Dienste eingerichtet.
4. Anschließend Startseite, `/shop/`, Checkout, Kontaktformular, Kalkulator, Widerruf und Admin-Anmeldung prüfen. Cloudflare kann eigene Skripte ergänzen: Rocket Loader, E-Mail-Adressverschleierung, Web Analytics, Zaraz und Challenges mitprüfen. Keine neuen CSP-Ausnahmen ohne Prüfung der tatsächlichen Funktion hinzufügen.
5. Alle sechs Header in echten HTTPS-Antworten kontrollieren. Eine HTML-Meta-CSP deckt insbesondere `frame-ancestors`, HSTS, MIME-Schutz und Permissions-Policy **nicht** ab.

Die Meta-CSP im HTML schützt nach Veröffentlichung bereits die Ressourcenquellen. Ausführbare Inline-Skripte sind in eigene Dateien ausgelagert; Inline-Eventhandler sind gesperrt. Inline-CSS bleibt wegen des vorhandenen Designs erlaubt. Die CSP ist zusätzliche Absicherung, kein Ersatz für korrektes Escaping.

HSTS gilt nur für den jeweiligen Host, ohne `includeSubDomains` und ohne Preload. Subdomains und deren Zertifikate sind nicht vollständig geprüft. HSTS erst bei dauerhaft funktionierendem HTTPS setzen. Ein Jahr `max-age` ist die Zielkonfiguration; bei noch ungeklärter TLS-Konfiguration zunächst kurze Laufzeit verwenden.

`SAMEORIGIN` / `frame-ancestors 'self'` verhindern fremde Einbettung. Die alte README-Empfehlung zur Einbettung in Google Sites ist damit nicht vereinbar. Keine fremde Einbettung ist für den Shop vorgesehen.

DNSSEC benötigt eine zusammenpassende Signierung beim DNS-Anbieter und einen DS-Eintrag beim Registrar. Das lässt sich aus diesem Repository nicht aktivieren oder zuverlässig feststellen.

Referenzen:
- https://developers.cloudflare.com/rules/transform/response-header-modification/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy

## Shop-Worker

`shop-checkout-worker.js` benötigt jetzt die danebenliegende Datei `legal-information.js`. Als Worker-Modulprojekt bereitstellen, nicht die einzelne Datei ohne ihren Import kopieren. Frontend und Worker gemeinsam ausrollen: Die Shop-Clients senden `expectedUnitPrice` in Cent, der Worker lehnt fehlende oder veränderte Preise ab. Alte offene Warenkörbe können eine erneute Produktauswahl benötigen.

Die Kunden-E-Mail enthält einen Stand der bestehenden AGB und Widerrufsbelehrung. Bei Änderungen der Rechtstexte muss dieser Stand vor dem Worker-Deployment mit aktualisiert werden. Die Texte wurden nicht als juristisch freigegebene Muster zertifiziert.
