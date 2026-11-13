# Testpyramide in BookMonkey

Die Browser-Suite wurde von **153 auf 20 Fälle** reduziert. Detailprüfungen wurden
in untere Ebenen verlagert und wiederholte Kombinationen zusammengefasst. Es gibt
keine versteckte zweite Browser-Suite und keine deaktivierten Altprüfungen.

| Ebene                       |   Fälle | Zweck                                                                        |
| --------------------------- | ------: | ---------------------------------------------------------------------------- |
| Isolierte Unit-Tests        |      63 | Logik, URL-Kontext, Pflichtfelder, HTTP-Servicevertrag und Theme-Service     |
| Isolierte Komponententests  |      31 | Inputs, Templatezustände, DOM-Ereignisse, Outputs, Formular und Vorschau     |
| Integrationstests           |      53 | Echte Container, Formulare, API-Client und HTTP-Testadapter im Zusammenspiel |
| Kritische Browser-/UI-Tests |      20 | Nutzerwege sowie echte History, Tastatur, Layout und Animation               |
| Gesamt                      | **167** | Unterschiedliche Aussagen, keine prozentuale Codeabdeckung                   |

Die drei Stufen der Pyramide sind damit **94 isolierte Tests → 53 Integrationstests
→ 20 Browserprüfungen**. Isolierte Komponententests gehören hier zur unteren Stufe.
Neue Fälle werden nach Risiko und benötigter Umgebung eingeordnet, nicht nach
einem starren Zahlenverhältnis.

## Zuordnung der bisherigen Browserprüfungen

| Bisherige Prüfung                                                      | Aktueller Ort                                                   | Was im Browser bleibt                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Suchparameter, Regex-Escaping, Sortierung, geschützte POST-/PUT-Felder | API-Client-Unit-Tests                                           | Such-/Navigationsweg mit sichtbaren Ergebnissen                                                                                           |
| Ungültige URLs, erlaubte Filter, Kontextvergleich                      | Query-Unit-Tests und Listenintegration                          | Echtes Back/Reload und Rückkehr zur gefilterten Seite                                                                                     |
| Cover-Fallback und Wiederverwendung                                    | Cover-Komponententests                                          | Fehlendes Cover in der Tastatur-Vorschau                                                                                                  |
| Pflichtfelder, Vorbelegung, Seitenzahl-Normalisierung, Formularreset   | Form-Modell, Formular-Komponententests und Mutationsintegration | Pflichtfehler → Korrektur → natives Enter im Anlege-Lebenszyklus                                                                          |
| Einzelne Seiten-/Sortier-/Retry-Kombinationen                          | Pagination-Komponente, API-Unit und Listenintegration           | Vorschau → Details → Editor-Abbruch → richtige Seite                                                                                      |
| Debounce, alte Antworten, Request-Abbruch und Teardown                 | Listenintegration                                               | Keine künstlichen Timing-Matrizen im Browser                                                                                              |
| Details-Laden, 404/Server-/Netzwerkfehler, ID-/Query-Wechsel           | Detailsintegration                                              | Direktlink, Reload, Tastatur und Rückkehr                                                                                                 |
| POST-/PUT-Fehler, Retry, Doppelabsenden, Pending-Abbruch               | Mutationsintegration                                            | Anlegen → Reload → Bearbeiten → Reload → Wiederfinden                                                                                     |
| Roulette-Kandidaten, Konsistenzfehler, Duplikate und Abbruch           | Rouletteintegration                                             | Direktziehen → Details sowie echte normale/reduzierte Animation                                                                           |
| Theme-Speicherfehler, ungültige Präferenzen und Listener-Cleanup       | Theme-Service-Unit-Tests                                        | Echte Media-Änderung, Tastatur, Navigation und berechnete CSS-Farben                                                                      |
| Wiederholte Viewport-/Theme-Matrizen je Feature                        | Browsermatrix zusammengefasst                                   | Regal in beiden Themes bei 375/1440px; Formular-/Details-Lebenszyklus Light/weit und Dark/mobil; Kontrast/Zustände in beiden Themes mobil |

Die einzelnen Anlege-, Bearbeitungs- und Filter-Browserspecs wurden entfernt. Ihre
Fachprüfungen liegen auf den genannten unteren Ebenen; der durchgängige Nutzerweg
bleibt in `tests/book-lifecycle.spec.ts`. Es wird keine identische Fallzahl je
früherem Test behauptet: redundante Variationen wurden bewusst konsolidiert. Die
Zuordnung ist kein Nachweis vollständiger Codeabdeckung.

## Dateien und Befehle

```powershell
# Alle 147 Fälle der drei unteren Gruppen
npm test

# Gruppen getrennt
npm run test:unit
npm run test:components
npm run test:integration

# Untere Gruppen im Watch-Modus
npm run test:watch

# Nur die 20 Browserfälle, Chromium, zwei Worker
npm run test:e2e
npm run test:e2e:report
npm run test:e2e:types
```

- `src/**/*.unit.spec.ts`: vier Dateien für Query-/API-/Form-Logik und den
  [Theme-Service](../src/app/shared/theme.service.unit.spec.ts).
- `src/**/*.component.spec.ts`: fünf Dateien für Cover, Pagination, Buchauswahl,
  Vorschau und gemeinsames Formular.
- `src/**/*.integration.spec.ts`: vier Dateien für
  [Liste](../src/app/books/book-list.integration.spec.ts),
  [Details](../src/app/books/book-details.integration.spec.ts),
  [Mutationen](../src/app/books/book-mutations.integration.spec.ts) und
  [Roulette](../src/app/books/book-roulette.integration.spec.ts).
- `tests/*.spec.ts`: sieben aktive App-Dateien; Auswahl und Begründung in
  [tests/README.md](../tests/README.md).

Angulars `@angular/build:unit-test` führt die unteren Ebenen mit Vitest/jsdom und
maximal zwei Workern aus. Der Builder initialisiert das TestBed. Spec-Konfiguration
und Testtarget erfassen die drei Muster; die App schließt weiterhin `*.spec.ts`
aus. Die Umordnung benötigt keine zusätzlichen Abhängigkeiten oder Änderungen an
der Produktionsimplementierung.

## Funktionsweise und Grenzen

Integrationstests rendern Originalkomponenten und Formulare. Der echte
`BookApiClient` erzeugt Anfragen, die `HttpTestingController` explizit beantwortet
oder abbricht. [test-support/screen.ts](../test-support/screen.ts) kontrolliert nur
Route-Parameter, Routerereignisse und Navigationsergebnisse; Formular- und
HTTP-Geschäftslogik bleiben echt. Browser-History und Navigation über mehrere
Seiten werden deshalb zusätzlich in Playwright geprüft.

Debounce-Zeiten werden mit Vitests Uhr gesteuert. Die Tests prüfen abgebrochene
Anfragen und das Ausbleiben späterer Duplikate. Formular-Retry-Tests warten auf den
abgeschlossenen Signal-Forms-Submit, statt einen festen Sleep einzubauen.

jsdom berechnet kein echtes Layout und kann keine unvollständigen nativen
Zahleneingaben tippen. Der Komponententest simuliert deshalb gezielt den
`validity.badInput`-Vertrag; er behauptet keine Browserprüfung dieser Eingabevariante.
Native Enter-Übermittlung und Navigation bleiben browsergeprüft.

Alle HTTP-Prüfungen verwenden Testadapter oder Mocks. Sie belegen weder den echten
Backendvertrag noch Datenbankpersistenz, Deployment oder Lastverhalten. Firefox
und WebKit werden nicht ausgeführt. Ein neuer CI-Testjob wurde nicht hinzugefügt.

Neue Tests gehören auf die niedrigste Ebene, die den Fehler zuverlässig erkennt.
Ein Browserfall braucht einen kritischen Nutzerweg oder eine konkrete
Browserabhängigkeit als Begründung. Einzelne Fehler dürfen zusätzlich auf der
nächsthöheren Ebene abgesichert sein; identische Parameter- und Fehlermatrizen
werden dort nicht erneut durchgespielt.
