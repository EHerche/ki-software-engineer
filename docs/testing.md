# Testebenen in BookMonkey

Die Tests sind nach ihrer Aufgabe getrennt. Stand 13.11.2026 gibt es **56
Unit-Tests**, **29 Komponententests** und **153 Playwright-UI-Tests**, zusammen
**238 Testfälle**. Diese Zahlen sind keine Aussage über prozentuale Codeabdeckung.

| Ebene      | Was wird geprüft?                                                                  | Ausführung                                  |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| Unit       | Isolierte Logik und HTTP-Servicevertrag; keine gerenderten Komponenten             | Vitest über Angular CLI                     |
| Komponente | Eine echte Angular-Komponente mit Template, Inputs, DOM-Ereignissen und Outputs    | Angular TestBed, Vitest und jsdom           |
| UI/Browser | Zusammenspiel der laufenden App über Nutzeraktionen, Navigation und mehrere Seiten | Playwright, derzeit ausschließlich Chromium |

## Neue Unit-Tests: 56 Fälle in drei Dateien

| Datei unter `src/app/books/`                                                              | Fälle | Abdeckung                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [book-collection-query.unit.spec.ts](../src/app/books/book-collection-query.unit.spec.ts) |    24 | Standardwerte, ungültige Seiten, erlaubte Suchfelder/Sortierungen, URL-Roundtrip, Ausschluss fremder Parameter und Erkennen geänderter Filter                                                |
| [book-api-client.unit.spec.ts](../src/app/books/book-api-client.unit.spec.ts)             |    24 | Kalte HTTP-Observables, Limits, Trimmen, literale Suchmuster, Sortierung mit ID-Tie-Breaker, Pagination-Metadaten, ungültige Antworten, kodierte IDs, POST-/PUT-Payload und Fehlerweitergabe |
| [book-form.model.unit.spec.ts](../src/app/books/book-form.model.unit.spec.ts)             |     8 | Leere/Whitespace-Pflichtfelder einschließlich Unicode-Leerzeichen sowie gültige Texte                                                                                                        |

Die API-Client-Tests verwenden Angulars `HttpTestingController`. Sie prüfen echte
Anfragen des Services gegen einen isolierten Test-Backendadapter. Jede erwartete
Anfrage wird explizit beantwortet; nach jedem Test wird auf offene Anfragen
geprüft. Es wird kein echter API-Server kontaktiert. Die Tests der reinen Funktionen
benötigen kein `TestBed` und rendern kein DOM.

## Neue Komponententests: 29 Fälle in fünf Dateien

| Datei unter `src/app/books/`                                                            | Fälle | Abdeckung                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [book-cover.component.spec.ts](../src/app/books/book-cover.component.spec.ts)           |     4 | Bild-URL/Alternativtext, fehlendes oder fehlerhaftes Bild und Erholung bei neuem Input                                                                     |
| [book-pagination.component.spec.ts](../src/app/books/book-pagination.component.spec.ts) |     6 | Gerundete Seitenzahl, deaktivierte Grenzen, Ausgabeevents ohne Inputmutation, leere/exakte Seite und neue Seitengröße                                      |
| [book-item.component.spec.ts](../src/app/books/book-item.component.spec.ts)             |     3 | Details-Link mit Filterkontext, ursprüngliches Auswahlevent und zugänglicher Auswahlzustand                                                                |
| [book-preview.component.spec.ts](../src/app/books/book-preview.component.spec.ts)       |     7 | Dialogsemantik, Details-Link, gekürzte Beschreibung nach Inputwechsel, Content-/Backdrop-Klicks, Escape, Reroll und Fokusgrenzen                           |
| [book-form.component.spec.ts](../src/app/books/book-form.component.spec.ts)             |     9 | Vorbelegung, Pflichtfeldfehler, Korrektur, leere Seitenzahl als 0, Edit-ISBN, Pending-Schutz, erhaltener Fehlerentwurf, Reset bei anderem Buch und Abbruch |

Die Tests setzen Signal-Inputs über `fixture.componentRef.setInput(...)`, rendern
das Originaltemplate und lösen DOM-Ereignisse aus. Outputs werden beobachtet,
statt HTTP- oder Elternzustände in Präsentationskomponenten einzubauen. Bei
asynchronen Formularaktionen warten sie auf `fixture.whenStable()` und führen
anschließend einen expliziten Renderdurchlauf aus.

`jsdom` simuliert das DOM in Node.js. Echte Darstellung, Layout, Browsernavigation,
Animationen und Verhalten über mehrere Komponenten bleiben Aufgabe der
[Playwright-UI-Suite](../tests/README.md). Ein Fokus-Test in jsdom ersetzt keinen
vollständigen Barrierefreiheitstest im Browser.

## Befehle

```powershell
# Alle 85 Unit- und Komponententests, genau ein Durchlauf
npm test

# Nur die 56 Unit-Tests
npm run test:unit

# Nur die 29 Komponententests
npm run test:components

# Beide Gruppen beim Bearbeiten automatisch erneut ausführen
npm run test:watch

# Separat: die 153 UI-Tests in Chromium
npm run test:e2e

# HTML-Report der UI-Tests
npm run test:e2e:report
```

Einzelne Dateien lassen sich direkt über den Angular-CLI-Einstieg prüfen:

```powershell
node node_modules/@angular/cli/bin/ng.js test --watch=false --include=src/app/books/book-form.component.spec.ts
```

Ein erfolgreicher Lauf endet mit `Tests ... passed` und Exitcode 0. Ein Buildfehler,
fehlende Tests oder übersprungene Fälle gelten nicht als bestandene Prüfung. Die
neuen Tests verwenden weder Sleeps noch `.skip`, `.only` oder gelockerte Fehlererwartungen.

## Konfiguration und Wartung

- `angular.json` verwendet den offiziellen Angular-21-Builder
  `@angular/build:unit-test` mit Vitest. Er ersetzt das vorherige unvollständige
  Karma-Setup. Es wurden keine bestehenden Unit-Tests migriert, weil zuvor keine
  vorhanden waren.
- `vitest.config.ts` begrenzt die Ausführung auf zwei Worker. Ein echter Browser,
  Browserdownloads oder ein Backend werden für diese 85 Tests nicht benötigt.
- `tsconfig.spec.json` und der Testtarget erfassen `src/**/*.unit.spec.ts` sowie
  `src/**/*.component.spec.ts`. Die Playwright-Dateien unter `tests/` laufen in
  einem eigenen Runner und werden hier nicht entdeckt.
- `tsconfig.app.json` schließt `*.spec.ts` weiter aus dem App-Build aus.
  Testdaten und DOM-Helfer liegen unabhängig von Playwright in
  [test-support/](../test-support/books.ts).
- Hinzugefügt wurden nur die benötigten Entwicklungsabhängigkeiten Vitest
  `4.1.12` und jsdom `27.4.0` samt Lockfile. Die DOM-Version unterstützt dieselben
  Node-Untergrenzen wie der installierte Angular-Builder; Angular und die
  bestehenden direkten Abhängigkeiten wurden nicht aktualisiert.
- Neue reine Logiktests heißen `*.unit.spec.ts`; Tests mit gerenderten Komponenten
  heißen `*.component.spec.ts`. DOM-Aktionen und beobachtbare Ergebnisse testen,
  anstatt private Implementierungsdetails festzuschreiben. Erwartete
  HTTP-Anfragen explizit prüfen und über den Testadapter beantworten.
- Tests für die komplexe Request-Orchestrierung der Listen-/Detailcontainer und
  den vollständigen Theme-Service-Lifecycle liegen weiterhin überwiegend auf
  UI-Ebene. Diese Ergänzung behauptet keine vollständige Unit-Abdeckung aller
  Klassen. Echte Backendpersistenz, Deployment und Lastverhalten sind ebenfalls
  nicht nachgewiesen. Ein zusätzlicher CI-Testjob wurde nicht eingerichtet.

Die Testinfrastruktur folgt der offiziellen
[Angular-21-Anleitung für Vitest](https://v21.angular.dev/guide/testing/migrating-to-vitest).
