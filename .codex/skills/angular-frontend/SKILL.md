---
name: angular-frontend
description: Use when planning and implementing Angular frontend features in BookMonkey with acceptance criteria and tests in the existing Playwright environment. Also use to execute an existing feature plan; respect planning-only or testing-only requests.
---

# Angular Frontend für BookMonkey

Führe ein Feature von einer prüfbaren Planung über Frontendtests bis zur verifizierten
Implementierung. Nutze die vorhandene Architektur und Testumgebung. Antworte in der
Sprache des Nutzers. Ein fehlendes Feature ist Anlass für eine Rückfrage, kein Auftrag,
selbst eines zu erfinden.

## 1. Auftrag und Projekt verstehen

- Lies Gespräch, vorhandene Anforderungen und einen gegebenen Plan. Übernimm bereits
  getroffene Entscheidungen und bestehende AC-IDs. Wiederhole keine abgeschlossene Planung.
- Lies vom Repository-Root aus `AGENTS.md`, `ARCHITECTURE.md` und für Änderungen unter
  `src/` die dort geltenden, auch tieferen `AGENTS.md`. Prüfe aktuellen Diff und Status,
  betroffene Komponenten, API-Verträge, Tests, `package.json` und `playwright.config.ts`.
  Bewahre fremde Änderungen. Angaben hier sind Einstiegshilfen, die aktuellen Dateien
  sind maßgeblich.
- Falls Git hier wegen Repository-Ownership blockiert, nutze nach Prüfung dieses Pfads
  `git -c safe.directory=D:/ki-software-engineer status --short` bzw. `diff`, ohne die
  globale Git-Konfiguration zu verändern.
- Nutze das verfügbare Workshop-MCP `get_project_context` für Projektkontext; lies
  betroffene Implementierungen und Tests anschließend gezielt. Bei fehlendem Tool lies
  die Projektdateien direkt.
- Hole vor Angular-Codearbeit mit Angular-MCP `get_best_practices` die aktuellen Regeln.
  Nutze Context7 für Angular-, RxJS- und Playwright-API-Fragen: zuerst
  `resolve-library-id`, dann `query-docs` mit konkreter Frage. Wähle Angular-20-Dokumentation
  und prüfe APIs gegen installierte Versionen; übernimm keine neueren APIs ungeprüft.
  Sende dabei keine proprietären Quelltexte oder vertraulichen Anforderungen.
- Ist ein MCP nicht verfügbar, benenne das und nutze vorhandene Projektmuster sowie
  offizielle, versionspassende Dokumentation. Erfinde keine Tool-Ergebnisse.

## 2. Zuerst planen und Unklarheiten klären

Kläre Ziel, Nutzeraktion und sichtbares Ergebnis, bevor du Produktionscode änderst.
Frage gezielt nach fachlichen Entscheidungen, die das Verhalten oder den Umfang ändern.
Zum Beispiel: Sollen Favoriten einen Reload überleben, und gelten sie nur für diesen Browser?
Warte bei solchen Entscheidungen auf die Antwort; bearbeite währenddessen unabhängige
Recherche. Schweigen ist keine Bestätigung. Entscheide gewöhnliche technische Details
anhand des Projekts selbst und kennzeichne wesentliche Annahmen.

Erstelle einen dem Umfang angemessenen Plan mit:

1. Ziel, Umfang und expliziten Ausschlüssen.
2. Stabilen `AC-1`, `AC-2`, ... als Given/When/Then mit beobachtbaren Ergebnissen;
   einschlägige Fehler-, Leer-, Lade- und Wiederholungsfälle einschließen.
3. Betroffenen Dateien und Verantwortlichkeiten, Datenfluss, API-Vertrag,
   Zustandsmodell, Nebenläufigkeit und Lifecycle, soweit relevant.
4. Zuordnung jedes Kriteriums zu vorhandenem oder neuem Test einschließlich Testtitel,
   Fixture, Testebene und erwartetem Red-Verhalten. Unabhängige Szenarien getrennt benennen.
5. Kleinen Umsetzungsschritten und konkreten Prüfkommandos.
6. Offenen Fragen, Annahmen und verbleibenden Grenzen der Verifikation.

Stelle den fertigen Plan knapp vor. Halte ihn bei kleinen Aufgaben im Gespräch;
bei umfangreichen Features oder auf Wunsch in einer passenden Planungsdatei.
Wenn die fachlich blockierenden Fragen geklärt sind und Implementierung beauftragt ist,
setze den Plan anschließend um, ohne eine zusätzliche pauschale Freigabe einzufordern.
Bei einem reinen Planungsauftrag endet die Arbeit beim Plan. Ein vorhandener vollständiger
Plan wird geprüft und ausgeführt, nicht erneut interviewt. Änderungen des Nutzers während
der Umsetzung fließen in Plan und Testzuordnung ein.

## 3. Vorhandene Skills gezielt kombinieren

Lies benötigte Skills unter `.codex/skills/<name>/SKILL.md`, bevor du sie anwendest.
Wenn sie nicht verfügbar sind, führe die entsprechende Phase mit diesen Anweisungen aus.

| Situation                             | Wiederverwendung und Grenze                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Anforderung nach Kontextverlust fehlt | `context-recovery`; ein Issue ist keine Voraussetzung.                                                                   |
| Fachliche Idee ist unklar             | Interviewtechnik aus `requirements-interview`; ohne expliziten Publikationsauftrag lokal planen und kein Issue erzeugen. |
| Planung ist testbar                   | `scaffold-red-tests` für Tests und beobachtetes Red nutzen.                                                              |
| Tests/Vertrag liegen vor              | `implement-to-green` für minimale vollständige Implementierung und Verifikation nutzen.                                  |
| Nutzer verlangt Refactoring           | `refactor-angular` und den expliziten Workflow aus dem Root-Guide beachten.                                              |

Bei einem vollständigen Featureauftrag sind Red und Green bereits beauftragt: Nach dem
Red-Bericht zu Green übergehen. Bei einem ausdrücklichen Red-only-Auftrag nach Red stoppen.
`ci-se-green` eignet sich hier nicht als Standard, weil dieser Skill lokale Prüfungen ausschließt.
`finalize-requirements`, GitHub-Schreibaktionen, Commit, Push und Veröffentlichung gehören
nicht automatisch zur Featureumsetzung. `REFACTORING.md` zu lesen startet keinen Refactor.

## 4. Frontendtests vor dem Verhalten schreiben

Lies [references/testing.md](references/testing.md) vor Teständerungen oder Testausführung.
Nutze für Verhaltensänderungen die vorhandenen gemockten Playwright-Tests und
`tests/fixtures/books.ts`. Übernimm passende vorhandene Abdeckung statt sie zu duplizieren.
Neue Testtitel enthalten AC-ID und Szenario.

Schreibe zunächst aussagekräftige Tests und führe die kleinste relevante Auswahl aus.
Prüfe die tatsächliche Fehlermeldung: Ein fehlendes UI-Verhalten kann Red belegen;
fehlende Browser, Compilerfehler oder ein nicht gestarteter Server sind Infrastrukturprobleme.
Bereits erfülltes Verhalten darf grün bleiben. Verändere gültige Erwartungen nicht, um Red
oder Green zu erzwingen. Bei blockierter Ausführung kannst du klare Implementierungsarbeit
fortsetzen, musst die Verifikation aber als offen kennzeichnen.

## 5. Nach Angular-20- und Projektregeln implementieren

- Kleine Standalone-Komponenten, `ChangeDetectionStrategy.OnPush`, `inject()` und
  signalbasierte `input()`, `output()` sowie `viewChild()` gemäß Bedarf. In Angular 20
  ist Standalone der Default. Template-Abhängigkeiten explizit importieren.
- Lokalen synchronen UI-Zustand mit `signal`, Ableitungen mit `computed` modellieren.
  Kein doppelter ableitbarer Zustand und keine Effects zum bloßen Kopieren von Zustand.
  Neue Feature-Routen bei Bedarf lazy laden, bestehende Deep Links erhalten.
- Request-Orchestrierung bleibt in Screens mit typisierten RxJS-Zuständen und möglichst
  einem `AsyncPipe` pro Screen-State. HTTP-Details bleiben in `BookApiClient`, der kalte
  Observables liefert. Präsentationskomponenten rendern Inputs und emittieren benannte
  Output-Events wie im bestehenden BookItem; sie übernehmen weder Requests noch die
  übergeordnete Zustandsverwaltung.
- Wähle Nebenläufigkeit nach dem Vertrag: wechselnde Leseanfragen abbrechen, parallele
  Schreibaktionen sinnvoll verhindern. Fehler innerhalb wechselnder Streams behandeln,
  sodass spätere Aktionen funktionieren. Notwendige imperative Subscriptions explizit
  abbauen, etwa mit `takeUntilDestroyed`. Konstruktoren starten keine Requests/Subscriptions.
- Verwende striktes TypeScript ohne `any` und typisierte Reactive Forms. Formvalidierung,
  Pending-Zustand, Fehlerkorrektur und Wiederholung passend zu den Kriterien modellieren.
- Native Template-Kontrollflüsse `@if`, `@for` mit stabiler Identität und `@switch` nutzen.
  Templates rendern Zustand und rufen benannte Aktionen auf; umfangreiche Templates bleiben
  in externem HTML. Nutze direkte Klassen-/Style-Bindungen und das vorhandene Styling.
- Native Buttons/Links, Labels, sinnvolle Überschriften, Tastaturbedienung, sichtbaren
  Fokus, Dialog-Fokusführung und verständliche Fehlermeldungen erhalten. Prüfe betroffene
  Ansichten mobil sowie in beiden Themes; berücksichtige Reduced Motion bei Animationen.
- Nutze `NgOptimizedImage` für geeignete statische Bilder; API-Cover bleiben gemäß bestehendem
  `BookCoverComponent` mit wechselnden URLs und Fehlerfallback behandelt.
- Bewahre `Book`-Vertrag, bestehende Routen, Such-Debounce/Abbruch, Retry und geschützte
  Editierfelder gemäß scoped Guides. Ändere bestehende Verträge nur als geklärten Teil
  des Features. Keine neuen State-Libraries oder Dependency-Upgrades ohne Auftrag.
- Halte `ARCHITECTURE.md` bei Änderungen an Laufzeitverhalten oder Verantwortlichkeiten
  aktuell. Repariere keine unabhängigen Probleme und starte keinen automatischen Refactor.

## 6. Prüfen und Ergebnis übergeben

Bei einem vollständigen Implementierungsauftrag: Iteriere Implementierung und betroffene
Tests bis zum geforderten Verhalten. Führe danach die
Anwendungsregressionen in allen konfigurierten Browsern und die Build-/Formatprüfungen
aus der Testreferenz ausführen. Prüfe den finalen Diff auf unbeabsichtigte Änderungen.
Nutze noch gültige Ergebnisse; wiederhole Prüfungen nur bei relevanten Änderungen oder
offenen Fragen. Ein Playwright-Lauf ersetzt nicht die Angular-Kompilierung und umgekehrt.

Berichte knapp: umgesetztes Verhalten und wesentliche Dateien, AC-zu-Test-Zuordnung,
tatsächlich ausgeführte Kommandos mit Browsern/Ergebnissen und offene Grenzen.
Unterscheide bestanden, fehlgeschlagen, blockiert und nicht ausgeführt. Behaupte keine
vollständig verifizierte Umsetzung, solange nötige Prüfungen offen sind. Gemockte HTTP-Tests
belegen kein Verhalten des echten externen Backends.
