# Playwright: Überblick für die ganze App

Die Suite testet die aktuell implementierten BookMonkey-Oberflächen im echten
Browser. Alle drei Routen (`/`, `/books/new`, `/books/:id`) und die Funktionen der
Bücherliste sind vertreten. Bearbeiten erfolgt innerhalb der Detailseite.

Stand 13.11.2026: **153 Tests in Chromium bestanden**, zwei Worker, keine Fehler,
keine Wiederholungen und keine übersprungenen Fälle. Firefox und WebKit wurden auf
Wunsch nicht ausgeführt. Die Zahlen beschreiben Testszenarien, keine prozentuale
Codeabdeckung oder Garantie für jede mögliche Eingabe.

## Was geprüft wird

| Bereich                         | Fälle | Spec                                               | Prüfungen                                                                                                                                                                         |
| ------------------------------- | ----: | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bücherliste                     |    20 | [book-list.spec.ts](book-list.spec.ts)             | Anzeige, Titelsuche, Leeren per Button/Eingabe, Laden, Leerzustände, Netzwerk-/Serverfehler, Retry, Debounce, veraltete Antworten, Cover-Fallback                                 |
| Details                         |    10 | [book-details.spec.ts](book-details.spec.ts)       | Alle Buchdaten, Tastaturnavigation, Suchkontext beim Zurückkehren, Direktlink/Reload, unbekannte Buch-ID, Laden, Fehler/Retry, Cover und Mobilansicht                             |
| Anlegen                         |    19 | [book-create.spec.ts](book-create.spec.ts)         | Einstieg über Liste und Direktlink, Speichern, Pflichtfelder/Whitespace, Korrektur, Abbruch, Doppelklickschutz, Fehler/Retry, Navigation während POST, Signal-Formular und Themes |
| Bearbeiten                      |    20 | [book-edit.spec.ts](book-edit.spec.ts)             | Vorbelegung, alle editierbaren Felder, geschützte IDs/ISBN, Validierung, Speichern/Reload, Abbruch, Fehler mit erhaltenem Entwurf, ausstehende Saves, Tastatur, Themes            |
| Filter und Sortierung           |    13 | [book-filters.spec.ts](book-filters.spec.ts)       | Titel/Autor/ISBN, literale Suche, Verlag, kombinierte Kriterien, Sortierparameter und sichtbare Reihenfolge, Reset, Leerzustand/Fehler, Mobilansicht                              |
| Pagination und Kontext          |    26 | [book-pagination.spec.ts](book-pagination.spec.ts) | Seiten/Grenzen, Server-Gesamtzahl, Filterwechsel, Cancellation, Fehler/Retry, schrumpfende Ergebnisse, URL/Reload/History, Vorschau → Editor-Abbruch → dieselbe Seite             |
| Roulette                        |    26 | [book-roulette.spec.ts](book-roulette.spec.ts)     | Alle gefilterten Seiten als Kandidaten, Direktziehen/Animation, erneutes Ziehen, Ladefehler/Retry, Abbruch, Fokus, reduzierte Bewegung, Ergebnis → Details → Filterkontext        |
| Bücherregal und Vorschau        |     5 | [bookshelf.spec.ts](bookshelf.spec.ts)             | Räumliches Regal, Umbruch, Auswahl, Tastatur, Fokusfalle/Fokusrückgabe, Escape, fehlendes Cover und reduzierte Bewegung                                                           |
| Theme                           |    12 | [theme.spec.ts](theme.spec.ts)                     | Gerätevorgabe, Tastaturumschaltung, gespeicherte Auswahl, Navigation/Reload, fehlerhafte oder blockierte Speicherung, Textfarbkontrast und mobile Zustände                        |
| Durchgängiger Buch-Lebenszyklus |     2 | [book-lifecycle.spec.ts](book-lifecycle.spec.ts)   | Leere Liste → Anlegen → Details/Reload → Bearbeiten/Speichern → Reload → Liste → Titelsuche → erneut öffnen, jeweils in Light und Dark                                            |

## Wie es funktioniert

1. **Specs** beschreiben Aktionen und erwartete Ergebnisse. Die Nutzerabläufe in
   allen Bereichen haben native `test.step`-Blöcke mit **Given**, **When** und
   **Then**. Diese Schritte lassen sich im HTML-Report aufklappen. Bestehende
   technische Timing-, Layout- und Fehlerprüfungen bleiben gezielte Regressionstests.
2. **Page Objects** bündeln wiederverwendbare Selektoren und Aktionen. Assertions
   stehen in den Specs, damit dort sichtbar bleibt, was ein Szenario beweist.
3. **Die echte Angular-App** läuft lokal auf Port 4200. Playwright startet sie
   automatisch oder nutzt außerhalb von CI einen bereits laufenden Server.
4. **API-Mocks** beantworten HTTP auf Port 4730. Ein echter API-Prozess wird nicht
   benötigt. Jeder Test erhält einen eigenen Browserkontext und eigene Mockdaten.
5. **Assertions** wie `toBeVisible`, `toHaveText`, `toHaveURL` und `toHaveValue`
   warten auf das erwartete Ergebnis. Zeitkritische bestehende Tests steuern die
   Playwright-Uhr statt pauschal zu schlafen.

### Page Objects und Fixtures

| Datei                                                        | Aufgabe                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [pages/books.page.ts](pages/books.page.ts)                   | Liste öffnen, Titel finden, suchen, leeren, Details/Anlegen öffnen; setzt die Komponenten zusammen             |
| [pages/collection-controls.ts](pages/collection-controls.ts) | Suchfeld, Suchbereich, Verlag, Sortierung, Reset sowie Vor-/Zurückblättern                                     |
| [pages/book-details.page.ts](pages/book-details.page.ts)     | Details, Rückkehr zur Liste und eingebetteter Editor                                                           |
| [pages/book-form.page.ts](pages/book-form.page.ts)           | Gemeinsame Formularfelder, Eingaben, Absenden/Abbrechen; `BookCreatePage` ergänzt ISBN und Anlegeroute         |
| [pages/book-preview.ts](pages/book-preview.ts)               | Cover-Auswahl, Vorschau-Dialog, Schließen und Weitergehen zu Details                                           |
| [pages/book-roulette.ts](pages/book-roulette.ts)             | Ziehen, Überraschungsmodus und Retry-Steuerelemente                                                            |
| [pages/app-shell.ts](pages/app-shell.ts)                     | Theme-Schalter und Theme-Zustand der App                                                                       |
| [fixtures/books.ts](fixtures/books.ts)                       | Gemeinsames `test`/`expect`, feste Bücher, Coverantworten, Filter-/Sortier-/Paging-Mocks und Gesamtzahl-Header |
| [fixtures/book-library.ts](fixtures/book-library.ts)         | Pro Test eigene Bibliothek mit POST, PUT und GET sowie Schreibprotokoll für den vollständigen Lebenszyklus     |

Die Selektoren bevorzugen zugängliche Rollen und Labels. Zusätzliche
`data-testid`-Attribute waren dafür nicht erforderlich. Regeln für neue Tests
stehen in [AGENTS.md](AGENTS.md) und gelten ausschließlich unter `tests/**`.

## Ausführen und Ergebnisse ansehen

Voraussetzung sind installierte Projektabhängigkeiten und Chromium für Playwright.
Bei Bedarf nur diesen Browser installieren:

```powershell
node node_modules/@playwright/test/cli.js install chromium
```

Wenn auf diesem Rechner der vorbereitete Browsercache genutzt werden soll:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:\ki-software-engineer\tmp\playwright-browsers'
```

```powershell
# Ganze App, ausschließlich Chromium, zwei Worker
npm run test:e2e

# Nur der durchgängige Lebenszyklus
npm run test:e2e -- tests/book-lifecycle.spec.ts

# Nur Details oder ein anderer Spec-Dateiname
npm run test:e2e -- tests/book-details.spec.ts

# Strikte TypeScript-Prüfung der Specs, Fixtures und Page Objects
npm run test:e2e:types

# Letzten HTML-Report öffnen
npm run test:e2e:report
```

Der Report liegt in `playwright-report/index.html`. Einzelne Läufe ersetzen den
vorherigen Report. Im Testeintrag die Given/When/Then-Schritte öffnen; bei Fehlern
zeigen die Assertion und der verfügbare Fehlerkontext den betroffenen Schritt.
Einige bestehende Tests erstellen Screenshots in `test-results/` oder `tmp/`.
Die Screenshots sind keine automatische Prüfung gegen visuelle Referenzbilder.
Die vorhandene Konfiguration zeichnet Traces beim ersten Wiederholungsversuch auf;
lokal sind Wiederholungen standardmäßig ausgeschaltet.

Für einen sichtbaren Browser und einen Trace eines gezielten Tests direkt die CLI
nutzen; so werden Optionen auch unter PowerShell zuverlässig weitergegeben:

```powershell
node node_modules/@playwright/test/cli.js test tests/book-lifecycle.spec.ts --project=chromium --workers=1 --headed --trace=on
```

## Grenzen und Wartung

- Die Browserprüfungen belegen UI-Verhalten gegen kontrollierte HTTP-Antworten.
  Sie prüfen keinen echten Backendvertrag, echte Datenbankpersistenz, Deployment
  oder Leistung unter Last. Das Speichern nach Reload wird mit demselben
  testlokalen Mockzustand geprüft.
- Die App hat keine Anmeldung, Rollenprüfung oder geschützten Routen. Dafür
  wurden keine fiktiven Autorisierungsszenarien eingebaut. Eine Löschfunktion
  existiert ebenfalls nicht.
- Firefox und WebKit sind weiterhin konfiguriert, aber in diesem Auftrag
  ungetestet. `npm run test:e2e` beschränkt die Ausführung ausdrücklich auf
  Chromium. Der rohe Befehl `playwright test` würde alle Projekte auswählen.
- Diese Erweiterung fügt keinen CI-Testjob hinzu. `npm test` führt die separate
  Vitest-Suite mit Unit- und Angular-Komponententests aus. Die Trennung und Befehle
  stehen in [docs/testing.md](../docs/testing.md).
- Auf dem Windows-Rechner hing zuvor der Serverabbau innerhalb der Sandbox. Der
  vollständige Whole-App-Lauf wurde deshalb außerhalb der Sandbox ausgeführt und
  beendete Testserver und Report regulär.
- Bei einer neuen Funktion: Nutzerweg und Zustände im passenden Spec ergänzen,
  wiederholte Aktionen ins passende Page Object ziehen, Mockantworten explizit
  einrichten und mit Chromium plus `test:e2e:types` prüfen. Neue Bibliotheken,
  Gherkin-Dateien oder globale Selektor-Umbauten sind dafür nicht notwendig.
