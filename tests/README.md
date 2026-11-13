# Kritische Playwright-Browserprüfungen

Die aktive App-Suite enthält **20 Fälle in sieben Dateien**. Sie bildet die Spitze
der [Testpyramide](../docs/testing.md), reduziert von vorher 153 Fällen.
Detailregeln und Fehlerkombinationen laufen als Unit-, Komponenten- oder
Integrationstests. Es gibt keine zusätzliche versteckte Vollsuite.

| Spec                                               | Fälle | Grund für den Browser                                                                                                           |
| -------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------- |
| [book-lifecycle.spec.ts](book-lifecycle.spec.ts)   |     2 | Anlegen mit Validierung/Enter → Details/Reload → Bearbeiten/Speichern → Liste → Suchen/erneut öffnen; Light/weit und Dark/mobil |
| [book-list.spec.ts](book-list.spec.ts)             |     2 | Titelsuche/Leeren und sichtbare Wiederherstellung nach einem Ladefehler                                                         |
| [book-details.spec.ts](book-details.spec.ts)       |     2 | Tastaturnavigation mit Suchkontext sowie Direktlink und Reload                                                                  |
| [book-pagination.spec.ts](book-pagination.spec.ts) |     2 | Vorschau/Editor-Abbruch/Rückkehr zur richtigen Seite sowie echtes Browser-Back/Reload                                           |
| [book-roulette.spec.ts](book-roulette.spec.ts)     |     3 | Ergebnis → Details → zurück, tatsächliche normale Animation und bewusste Animation unter Reduced Motion                         |
| [bookshelf.spec.ts](bookshelf.spec.ts)             |     5 | Räumliches Layout in beiden Themes bei 375/1440px sowie Tastatur/Fokus mit fehlendem Cover                                      |
| [theme.spec.ts](theme.spec.ts)                     |     4 | Tastatur, echte Media-Änderung/Persistenz sowie berechneter Farbkontrast/Zustandslayout in beiden Themes mobil                  |

Die Fälle enthalten Browserabhängigkeiten wie History, native Tastaturbedienung,
Fokus, CSS-Animation und Layout. Einzelne Sortierparameter, Pflichtfeldvarianten
oder HTTP-Fehlercodes werden nicht mehr als vollständige Browsermatrix geprüft.
Die Migration ist in [docs/testing.md](../docs/testing.md) zugeordnet.

## Ausführen

```powershell
# Auf diesem Rechner bei Bedarf den vorbereiteten Cache nutzen
$env:PLAYWRIGHT_BROWSERS_PATH='D:\ki-software-engineer\tmp\playwright-browsers'

# Nur Chromium, zwei Worker
npm run test:e2e

# Ein kritischer Bereich
npm run test:e2e -- tests/book-lifecycle.spec.ts

# Test-TypeScript und letzter HTML-Report
npm run test:e2e:types
npm run test:e2e:report
```

Bei fehlendem Chromium ausschließlich diesen Browser installieren:
`node node_modules/@playwright/test/cli.js install chromium`.

Playwright startet die lokale Angular-App auf Port 4200 oder verwendet außerhalb
von CI einen laufenden Server. Die Fixtures beantworten HTTP auf Port 4730
einschließlich Cover; ein Backendprozess ist nicht nötig. Jeder Test erhält einen
eigenen Browserkontext. Der Lifecycle verwendet zusätzlich eine eigene
zustandsbehaftete POST-/PUT-/GET-Testbibliothek.

Page Objects unter `pages/` bündeln Bedienaktionen; Assertions bleiben in den Specs.
Given/When/Then-Schritte erscheinen im HTML-Report unter
`playwright-report/index.html`. Ein neuer Lauf ersetzt den vorherigen Report.
Screenshots sind Diagnoseartefakte, keine automatischen Referenzbildvergleiche.
Traces werden beim ersten Wiederholungsversuch aufgezeichnet; lokal sind Retries
ausgeschaltet.

Die Browser-Suite verwendet gemockte API-Antworten. Sie ist keine vollständige
System-E2E-Prüfung gegen echte Datenbankpersistenz. Firefox und WebKit bleiben
konfiguriert, werden aber nicht ausgeführt. Der rohe Aufruf `playwright test`
würde alle Projekte wählen; deshalb den npm-Befehl verwenden.
