# Signal Forms Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. This request is planning only; do not execute yet.

**Goal:** Die Workshop-Aufgabe durch ein Angular-Update auf 21 und die verhaltenserhaltende Migration des gemeinsamen Buchformulars auf Signal Forms erfüllen; Suche und Filter als Bonus migrieren.

**Architecture:** Eine geprüfte Angular-21-Basis dient als gemeinsamer Ausgangspunkt zweier optionaler Worktrees für einen Promptvergleich. Das Buchformular besitzt ein vollständig initialisiertes Signal-Modell und einen FieldTree; HTTP und Nebenläufigkeit bleiben in den bestehenden Screens. Die Filtermigration bleibt ein eigener Schritt mit unveränderter RxJS-Request-Orchestrierung.

**Tech Stack:** Angular 21.x, TypeScript passend zur ausgewählten Angular-Version, Signal Forms aus @angular/forms/signals, RxJS, bestehende Playwright-Fixtures.

**Spec:** Nutzerauftrag im Chat vom 2026-11-13: „Vibe Coding - Laser Focus (Signal Forms Migration)“, Task 2/4, inklusive elf Migrationsregeln und Bonus „Migrate all forms“. Dieser Plan schlägt Angular 21 statt 22 vor; eine Umsetzung wurde noch nicht beauftragt.

## Global Constraints

- Mindestversion Angular >=21; vorgeschlagenes reproduzierbares Workshop-Ziel: aktuelle 21.x, genau aufgelöst im Lockfile.
- Angular 22 ist eine optionale spätere Erweiterung; 20 -> 21 -> 22, keine Major-Version überspringen. Wenn „latest“ wörtlich gefordert ist, aktuellen stabilen Stand prüfen und dieses Zusatzupdate einplanen.
- Keine neuen State-Libraries, keine zusätzlichen Geschäftsregeln und keine unabhängigen Refactorings.
- Nutzerauftrag Signal Forms hat Vorrang vor der bisherigen lokalen Empfehlung „typed Reactive Forms“.
- Nur benötigte Signal-Forms-Utilities importieren. Beispielvalidatoren min/minLength/maxLength/pattern aus dem Hint sind keine neuen fachlichen Anforderungen.
- Pflichtfelder: title/publisher/abstract, zusätzlich isbn im Create-Modus; Whitespace bleibt ungültig. Edit-ISBN und IDs bleiben geschützt.
- Optionales subtitle wird im UI-Modell initialisiert; numPages darf im Entwurf leer sein und wird beim Submit wie bisher auf 0 normalisiert.
- API-Vertrag, URLs, Payloads, Fehlermeldungen, Pending-Sperre, Retry und Navigation erhalten.
- Filter: Suchtext/Publisher 300 ms; Suchfeld/Sortierung/Clear/Reset/Retry unmittelbar. Neue Aktionen brechen laufende Requests sofort ab. History/Reload und Pagination bleiben erhalten.
- Signal Forms waren in Angular 21 experimentell. APIs einschließlich Submit/Reset anhand der tatsächlich installierten 21.x prüfen; keine aktuellen 22-Beispiele ungeprüft kopieren.
- Dies ist ein Plan; noch keine Installation, Worktrees, Produktcodeänderungen, Commits oder Tests ausgeführt.

## Ansätze und Empfehlung

1. Ein Worktree, Angular 21, erst Buchformular und dann Bonus: kürzester Weg zur fertigen Aufgabe.
2. Gemeinsame Angular-21-Basis plus zwei Worktrees: A erhält explizite Migrationsregeln, B zusätzlich versionspassende Dokumentation und konkrete Beispiele. Empfohlen, wenn der Lernzweck der Vergleich von Prompting-Techniken mit Worktrees ist. Die Empfehlung ist noch keine Nutzerentscheidung.
3. Angular 22 zusätzlich: sinnvoll für eine Anforderung „neueste stabile Version“, erhöht aber den Aufwand des Promptvergleichs. Nicht mit dem ersten Formularumbau vermischen.

Für einen nachvollziehbaren Promptvergleich denselben Commit, dasselbe Modell, dieselben Tests und denselben Funktionsumfang verwenden. Prompts und tatsächliche Versuche protokollieren; keine allgemeine Überlegenheit aus einem einzelnen Durchlauf behaupten. Nur eine Alternative übernehmen.

## Review Focus

1. Whitespace statt Leerstring darf Pflichtprüfung nicht umgehen (Create/Edit-Tests).
2. Leere numerische Eingabe darf nicht als NaN oder String im API-Payload landen (Create-Validierungstest, Edit-Optionalfeldertest).
3. Wechsel von Buch oder Modus muss Draft und touched/dirty zurücksetzen, ohne Eingaben bei einem Serverfehler zu verlieren (Edit-Navigation/Retry).
4. Submit via Enter muss genauso validieren wie Button-Klick und darf keine Browsernavigation auslösen (vorhandene Abdeckung prüfen; gezielt ergänzen).
5. Signal-Beobachtung darf weder doppelte Requests noch verzögerten Abbruch oder URL-Rückkopplung erzeugen (List-/Filter-/Pagination-Tests).

## Akzeptanzkriterien und Testzuordnung

Die folgenden IDs gelten innerhalb dieses Plans; bestehende Test-IDs nicht umnummerieren.

| ID | Given / When / Then | Vorhandener Nachweis |
| --- | --- | --- |
| SF-1 | Gegeben Angular 20; wenn das Update abgeschlossen ist, dann laufen Build und bestehende Anwendungstests unter 21.x. | package.json/Lockfile, beide Builds, alle Anwendungssuites |
| SF-2 | Gegeben Create oder Edit; wenn Felder geändert und gültig gespeichert werden, dann bleiben Payload und Folgeansicht gleich und das Formular nutzt Signal Forms. | book-create: „AC-8 / Anlage speichert und öffnet Ergebnis“; book-edit: „saves every editable field…“; zusätzlich Quelltextprüfung |
| SF-3 | Gegeben leere/Whitespace-Pflichtfelder; wenn abgesendet wird, dann erscheinen bisherige Fehler und es erfolgt kein Schreibrequest; Korrektur erlaubt Speichern. | book-create: „AC-9 / Anlage validiert…“; book-edit: „blocks … required fields…“ |
| SF-4 | Gegeben optionale Leerwerte oder leere Seitenzahl; wenn gespeichert wird, dann bleiben bisherige Normalisierung und permissive Regeln erhalten. | book-create AC-9 Payload numPages:0; book-edit: „supports absent subtitle…“ |
| SF-5 | Gegeben Save pending oder Serverfehler; wenn erneut abgesendet bzw. Retry ausgeführt wird, dann gibt es keine Doppelwrites, und Fehler behalten den Entwurf. | Create AC-11/12; Edit „shows pending save state…“/„retains all input…“ |
| SF-6 | Gegeben Formular und Navigation/Cancel; wenn verlassen oder ein anderes Buch geöffnet wird, dann gelten unverändert Abbruch und Draft-Reset; Enter sendet ohne native Navigation. | Create AC-10/12; Edit „cancels without writing…“/„changing book IDs…“; Enter ggf. gezielt ergänzen |
| SF-7 | Gegeben Filter-Bonus; wenn gesucht, sortiert, gelöscht oder navigiert wird, dann bleiben Timing, Abbruch, URL und Pagination unverändert. | book-list „debounces rapid typing for 300 ms…“/„clear cancels a pending debounce…“/Abbruchtests; book-filters; book-pagination AC-14/15/29 |

## Task 1: Geprüfte Angular-21-Basis

**Files:** package.json, package-lock.json, CLI-generierte Änderungen, ARCHITECTURE.md.

**Interfaces:** Produziert einen geprüften Commit mit Angular 21.x und unverändertem UI/API-Verhalten.

- [ ] Aktuellen Status/Diff und Node-Version prüfen, vorhandene Anwendungsregression und Builds als Ausgangswert erfassen. Infrastrukturfehler getrennt melden.
- [ ] Einen isolierten Upgrade-Worktree anlegen. Node/TypeScript nach offizieller Kompatibilitätstabelle prüfen; Peer Dependencies von Material/CDK, NgRx, Toolkit, TanStack und SSR berücksichtigen.
- [ ] Mit `npm ci` installieren; `npx ng update @angular/cli@21 @angular/core@21` und passende Material-/CDK-Migrationen ausführen. Peer-Konflikte durch kompatible Versionen klären, nicht pauschal mit --force ignorieren.
- [ ] Diff prüfen, Builds und alle Anwendungstests ausführen. Keine neuen Tests nur zum Erzwingen eines roten Zustands schreiben: Das Verhalten soll gleich bleiben.
- [ ] Aufgelöste Versionen, tatsächliche Prüfresultate und bekannte Blocker dokumentieren; Basis committen, falls Committen bei der Umsetzung autorisiert ist.
- [ ] Bei Vergleich zwei Branches/Worktrees vom selben geprüften Commit erzeugen: `experiment/signal-rules` und `experiment/signal-docs`. Pro Worktree `npm ci`; Tests nacheinander auf Port 4200 ausführen.

## Task 2: Gemeinsames Buchformular migrieren

**Files:** src/app/books/book-form.component.ts, book-form.component.html, book-form.model.ts; nur bei begründetem Bedarf book-create/book-edit Screens; tests/book-create.spec.ts und tests/book-edit.spec.ts.

**Interfaces:** Inputs mode/initialValue/isbn/pending/error und Outputs submitted:BookFormValue sowie cancelled:void erhalten. Der lokale Draft kann numPages:number|null enthalten; emitted BookFormValue bleibt normalisiert.

- [ ] Bestehende Create-/Edit-Tests lesen und unter Angular 21 ausführen. Fehlende Enter-Submit-Abdeckung gezielt ergänzen; bestehendes Verhalten darf bereits grün sein.
- [ ] Versionspassende API für form, FormField, validate, touched, reset und Submit nachschlagen. Modell mit sämtlichen UI-Feldern initialisieren. requiredBookText von ValidatorFn auf passende Signal-Forms-Regel umstellen, einschließlich trim-Prüfung und bedingter Create-ISBN-Pflicht.
- [ ] Reactive-Forms-Gruppe durch Signal-Modell/FieldTree ersetzen und Template auf [formField] umstellen. Den bisherigen ngSubmit-Mechanismus explizit ersetzen: ohne ReactiveFormsModule stammt dieses Ereignis nicht automatisch aus derselben Direktive. Eine von der installierten Version unterstützte Submit-Lösung mit Verhinderung nativer Navigation einsetzen.
- [ ] initialValue-/Moduswechsel mit richtigem Reset von Werten und Interaktionszustand abbilden. API-Fehler dürfen den Draft nicht zurücksetzen. Pending-Sperre und Ausgabe-Normalisierung erhalten.
- [ ] Create-/Edit-Tests zunächst in Chromium, anschließend mit allen Browsern ausführen; neue fachliche Regressionen vor der Korrektur durch einen passenden Test belegen.
- [ ] Quelltext und Diff prüfen: keine Reactive-Forms-Nutzung mehr im Buchformular, keine zusätzlichen Preis-/URL-/Seitenregeln, unveränderte Outputs. Ergebnis separat committen, falls autorisiert.

## Task 3: Bonus Suche und Filter

**Files:** src/app/books/book-list.component.ts, book-list.component.html; bei Bedarf tests/book-list.spec.ts, book-filters.spec.ts, book-pagination.spec.ts.

**Interfaces:** Filtermodell searchTerm/searchField/publisher/sort; bestehende BookCollectionContext-/SearchAction-Semantik und BookApiClient bleiben erhalten.

- [ ] Vorhandene Timing-/Abbruch-/History-Tests als Verhaltensvertrag lesen und vor dem Umbau ausführen.
- [ ] Filtergruppe durch vollständig typisiertes Signal-Modell und FieldTree ersetzen; vier Templatebindungen auf [formField] umstellen.
- [ ] valueChanges, getRawValue, setValue/reset und emitEvent:false bewusst ersetzen. Benutzeraktionen und programmgesteuerte URL-/Reset-Updates unterscheiden; jeden Filter genau einmal in die bestehende Request-Pipeline einspeisen. Signal-/RxJS-Scheduling auf sofortigen Abbruch prüfen.
- [ ] Filter-, Listen- und Paginationtests ausführen; insbesondere schnelle Eingaben, Clear vor Ablauf von 300 ms, Sortierung sofort, History/Reload ohne doppelte Reads und verspätete Antworten.
- [ ] Gesamten src-Baum nach alten Forms-Imports/Direktiven prüfen und verbleibende Verwendungen begründen oder migrieren. Architektur aktualisieren; Bonus separat committen, falls autorisiert.

## Task 4: Abschluss und Vergleich

- [ ] Entwicklungskompilierung: `node node_modules/@angular/cli/bin/ng.js build --configuration development`.
- [ ] Produktionsbuild: `npm run build`.
- [ ] Alle Anwendungssuites in Chromium, Firefox und WebKit ausführen:

```powershell
npx playwright test tests/book-create.spec.ts tests/book-edit.spec.ts tests/book-details.spec.ts tests/book-list.spec.ts tests/book-filters.spec.ts tests/book-pagination.spec.ts tests/book-roulette.spec.ts tests/bookshelf.spec.ts tests/theme.spec.ts
```

- [ ] Nur geänderte Dateien mit Prettier prüfen; `git diff --check`. Demo-Suite tests/example.spec.ts auslassen. Legacy-Karma nicht als bestanden melden.
- [ ] In jedem Worktree sicherstellen, dass Port 4200 tatsächlich dessen Code bedient; keine Server anderer Varianten wiederverwenden. Vorhandenen Browsercache ggf. explizit über seinen absoluten Pfad einbinden.
- [ ] Bei A/B: Eingriffsumfang, Compiler-/Testfehler, Reparaturschritte, verbleibende alte Forms-Nutzung und Verhalten vergleichen. Angular-Version und Testumfang gleich halten. Keine fest versprochene 15-Minuten-Dauer für Upgrade, Bonus und vollständige Regression.
- [ ] Nur gewählte Variante übernehmen; tatsächliche Ergebnisse und Grenzen dokumentieren. Gemockte Tests verifizieren keinen Live-Backend-Vertrag.

## Prompting-Technik und Quellen

Empfehlung: Context Engineering / dokumentationsgestütztes Prompting. Die elf Regeln sind explizite Instruktionen; ein konkretes Vorher-/Nachher-Paar ergänzt Few-shot Prompting. Context7 liefert beim Abruf relevante aktuelle Dokumentation (Retrieval Augmentation). Das behebt fehlendes API-Wissen besser als ein Rollenprompt allein; Compiler und Tests bleiben der Nachweis.

- Angular 21 Signal Forms: https://v21.angular.dev/guide/forms/signals/overview
- Validierung: https://v21.angular.dev/guide/forms/signals/validation
- Migration: https://v21.angular.dev/guide/forms/signals/migration
- Update: https://angular.dev/cli/update
- Kompatibilität: https://angular.dev/reference/versions
- Git Worktrees: https://git-scm.com/docs/git-worktree

Die Nutzerregeln sind ein Ausgangspunkt, kein vollständig verhaltenserhaltender Migrationsalgorithmus: Submit, Reset, Whitespace, Nullable-Zahlen und Suchabbruch benötigen zusätzliche Behandlung. Native readonly-Anzeigen und Router-/HTTP-Code werden nicht pauschal als Formfelder umgebaut.
