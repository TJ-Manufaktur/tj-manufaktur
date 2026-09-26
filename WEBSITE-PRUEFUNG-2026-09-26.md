# Website-Prüfung TJ Manufaktur – 26. September 2026

## Umfang und Aussagekraft

Abgleich des achtseitigen WebPrüfer-Berichts vom 25.09.2026 (I5IrRcf-cj5E) mit Repository-Stand `0f1cd952db94c268c9602ff9847595a47cff0c74`. Der Bericht prüft überwiegend die Startseite und hat den Shop nicht erkannt. Seine Hinweise sind keine vollständige Rechtsprüfung. Eine technische Umsetzung garantiert keine Abmahnsicherheit oder vollständige BFSG-Konformität.

Der direkte öffentliche Abruf der Domain wurde bei dieser Prüfung mit HTTP 403 abgewiesen. Live-Header, Cloudflare-Injektionen, Netzwerkverhalten der produktiven Formulare und aktive DNSSEC-Konfiguration sind deshalb nicht bestätigt. Die Browserprüfungen erfolgten lokal mit simulierten Produkt- und Bestellantworten; keine echten Bestellungen oder E-Mails wurden ausgelöst.

Shopify wurde im Verlauf erfolgreich verbunden. Es besteht zusätzlich ein Shop unter `shop.tj-manufaktur.de` im Testtarif. Das ist nicht derselbe technische Bestellablauf wie `/shop/` in diesem Repository. Es wurde keine Domain umgestellt und kein kostenpflichtiger Tarif abgeschlossen.

## Berichtspunkte

| Punkt | Befund und Umsetzung |
|---|---|
| Cookie-Banner / Ablehnen | Kein aktives Statistik-/Marketing-Skript im geprüften Quellcode gefunden. Das vorhandene `consent.js` wird nicht eingebunden. Kein unnötiges Banner aktiviert. Notwendige Warenkorb-Speicherung beschrieben. Cloudflare-/Shopify-Einstellungen separat prüfen. |
| Bildmaße / Lazy Loading | Tatsächliche Bildmaße eingetragen; quadratisches Logo statt falschem 190:68-Verhältnis. Galerie-Bilder laden verzögert, sichtbare Logos nicht. Dynamische Shop-Logos haben ebenfalls Maße. |
| Überschriften | Startseiten-Hierarchie war bereits korrigiert. Öffentliche Seiten geprüft. Die alte Vorschau hat zwei H1 in alternativ sichtbaren Ansichten; der öffentliche Shop hat eine H1. |
| Skip-Link | Bereits weitgehend vorhanden; Sprungziel jetzt fokussierbar. Tastaturtest bestanden. |
| Meta-Description | Startseite bereits auf 128 Zeichen gekürzt. Kein erneuter Eingriff nötig. |
| CSP | Auf allen HTML-Seiten Ressourcen-CSP als frühes Meta-Element. Ausführbare Inline-Skripte ausgelagert; Inline-Eventhandler gesperrt. Erlaubt sind eigene Ressourcen und die zwei vorhandenen Worker-Endpunkte. Inline-CSS bleibt erlaubt. Header-Konfiguration einschließlich frame-ancestors vorbereitet. |
| HSTS | Header-Zielwert vorbereitet: max-age=31536000, ohne includeSubDomains/Preload. Aktivierung erfordert bestätigtes dauerhaftes HTTPS am ausliefernden Dienst. |
| X-Frame-Options | SAMEORIGIN für die Website vorbereitet; DENY im Shop-API-Code. Meta-HTML kann diesen HTTP-Header nicht ersetzen. |
| X-Content-Type-Options | nosniff für Website vorbereitet, API bereits vorhanden. |
| Referrer-Policy | strict-origin-when-cross-origin als HTML-Meta und Header-Sollwert. API verwendet no-referrer. Der Bericht irrt: no-referrer-when-downgrade wäre nicht restriktiver. |
| Permissions-Policy | Kamera, Mikrofon und Standort abgeschaltet in Sollkonfiguration und API-Code. |
| DNSSEC | Externe DNS-/Registrar-Einstellung; nicht verändert. |
| KI-Richtlinie / WARD | Keine entsprechende Website-KI-Funktion gefunden. Keine pauschale Pflicht oder künstliche Seite aus dem automatisierten Hinweis abgeleitet. |

## Zusätzliche technische Korrekturen

- Öffentlicher Shop: Verweise auf nicht mehr vorhandene Vorschau-Elemente entfernt, die den Produktabruf verhinderten.
- Durchgängige Links zu Impressum, Datenschutz, AGB, Widerruf und hervorgehobenes „Vertrag widerrufen“, einschließlich Checkout und Ergebnis-Seiten.
- Produkt- und Kundentexte in Shop und Admin werden als Text maskiert. Regressionstest mit HTML-Angriffstexten im Produktnamen und in Kundendaten.
- Warenkorb als benannter Dialog mit Escape, Fokusbegrenzung, Rückkehrfokus und inaktivem Hintergrund.
- Produktpreis ohne unbegründetes „ab“, Hinweis auf § 19 UStG und Versand. PayPal wird im aktiven Warenkorb nicht als verfügbare Zahlung versprochen.
- Vollständige Bestellübersicht unmittelbar vor dem verbindlichen Bestellbutton, einschließlich vorhandener Produktbeschreibung, Variante, Personalisierung und Versand/Gesamtpreis.
- Preisabweichungen gegenüber dem Server werden vor Speicherung abgelehnt. Frontend und Worker müssen zusammen ausgerollt werden.
- Bereits gespeicherte Bestellungen mit E-Mail-Fehler führen zu einer eindeutigen Meldung statt zur Aufforderung zum erneuten Absenden.
- Kein unnötiger Sitzungsspeicher mehr für Lieferadresse/Kontaktdaten. Beschädigte Warenkorbdaten führen im öffentlichen Shop/Checkout nicht zum Skriptabbruch.
- Kundenmail enthält den bestehenden Stand der AGB und Widerrufsbelehrung einschließlich Musterformular statt nur veränderlicher Webseitenlinks. Textstand ist bei späteren Änderungen mitzuführen.
- Automatischen Galerie-Wechsel entfernt, reduzierte Bewegung respektiert, Schaltflächenkontrast verbessert, Galerie-Punkte besser per Touch bedienbar.

## Vor Verkaufsfreigabe zwingend klären

1. **Welcher Shop ist maßgeblich?** Shopify unter `shop.tj-manufaktur.de` oder der eigene Checkout unter `/shop/`? Keine parallelen widersprüchlichen Bestellwege veröffentlichen. Verbindung allein überträgt diese Repository-Korrekturen nicht in Shopify. Shopify-Tarifentscheidung und Checkout-/Zahlungsfreigabe erfolgen im Konto.
2. **Reale Produktinformationen:** Beschreibung/Maße/Material, aussagekräftige Produktabbildung statt Logo, Herstellerkontakt, eindeutige Produktkennung und erforderliche Warn-/Sicherheitshinweise je Artikel. Bei eigener Herstellung Angaben anhand tatsächlicher Produkte bestätigen. Keine Hersteller, Warnhinweise, Zertifizierungen oder Grundpreise erfunden. Grundpreis nur bei tatsächlich einschlägiger Verkaufseinheit; gegenwärtige Artikel werden als Stück geführt.
3. **Geschäftliche Angaben:** Vorhandene Preise, Deutschland-Beschränkung, 4,99 € Versand / frei ab 50 €, Lieferfristen 1–3 bzw. 3–5 Werktage, Kleinunternehmerstatus, Zahlungsanweisungen/Bankverbindung, Retourenkosten und Zeitpunkt des Vertragsschlusses bestätigen. Die Angaben wurden übernommen, nicht neu beschlossen.
4. **Widerrufsdienst:** Das Formular sendet an den Anfrage-Worker, dessen Quellcode nicht im Repository enthalten ist. Nachweis erforderlich, dass Eingang und Bestätigung unverzüglich funktionieren und Bestätigung Inhalt, Datum und Uhrzeit enthält. Funktionsfähiges Frontend allein reicht nicht. Personalisierung schließt das Widerrufsrecht nicht pauschal für jeden Artikel aus.
5. **Datenschutz in den Konten:** Tatsächlich genutzte Cloudflare-Dienste/CDN, Resend, GitHub und ggf. Shopify/PayPal samt Vertragsrollen, Auftragsverarbeitung, Drittlandgarantien, Lösch-/Aufbewahrungsabläufen und eventuell aktivierten Analysediensten prüfen. Die pauschalen Dienstleisterangaben im bestehenden Datenschutztext sind keine Bestätigung dieser Kontoeinstellungen. Nicht benötigte Statistikdienste deaktivieren; bei gewünschten optionalen Diensten Einwilligung vorher korrekt implementieren.
6. **BFSG-Anwendungsbereich:** Beschäftigtenzahl sowie Umsatz/Bilanzsumme bestätigen. Eine Ausnahme für Kleinstunternehmen bei Dienstleistungen ist nicht allein durch § 19 UStG nachgewiesen. Falls anwendbar: vollständige Prüfung einschließlich Informationen zur Barrierefreiheit und des endgültigen Zahlungsablaufs. Kein Konformitätsversprechen aus diesem Teiltest ableiten.
7. **Deployment:** GitHub-Änderungen veröffentlichen, Shop-Worker mit beiden Modulen deployen, sechs Website-Header am Proxy aktivieren und anschließend live prüfen. DNSSEC beim DNS-Anbieter/Registrar prüfen. Vorgehen in `cloudflare/SECURITY-HEADERS.md`.
8. **Ende-zu-Ende-Abnahme:** Bestellpersistenz, E-Mail-Zustellung, Zahlungsanweisungen, Lagerbestand bei parallelen Bestellungen, Schutz vor Doppelbestellungen/Spam sowie Widerrufsbestätigung in einer freigegebenen Testumgebung kontrollieren. Diese produktiven Abläufe wurden nicht ausgelöst.

## Nachweise und Wiederholung

- `tests/site-check.cjs`: 21 öffentliche Seiten unter CSP, Laufzeitfehler, Rechtslinks, Skip-Fokus, Produkt-/Admin-Escaping, Warenkorb-Tastatur, Bestellübersicht, Fehler nach Speicherung, defekter lokaler Speicher, 390px-Ansicht. Benötigt Playwright und Edge, alternativ `BROWSER_CHANNEL` setzen.
- `tests/worker-check.mjs`: Preisänderung/fehlender Preis, ungültiges Land und Menge, JSON-null, API-Header, E-Mail-Rechtstextstand. Kein produktiver Dienstzugriff.
- Desktop-Startseite und mobiler Shop visuell kontrolliert. Keine vollständige assistive-technology-, Kontrast- oder EN-301-549-Zertifizierung.

## Maßgebliche Quellen

- TDDDG § 25 (notwendige Speicherung): https://www.gesetze-im-internet.de/ttdsg/__25.html
- BGB § 312j (Bestellsituation): https://www.gesetze-im-internet.de/bgb/__312j.html
- BGB § 312f (dauerhafter Datenträger): https://www.gesetze-im-internet.de/bgb/__312f.html
- BGB § 356a (elektronische Widerrufsfunktion): https://www.gesetze-im-internet.de/bgb/__356a.html
- GPSR, insbesondere Art. 19: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R0988
- Bundesfachstelle Barrierefreiheit: https://www.bundesfachstelle-barrierefreiheit.de/DE/Barrierefreiheitsstaerkungsgesetz/Beratungsangebote
- Cloudflare Response Header Rules: https://developers.cloudflare.com/rules/transform/response-header-modification/
