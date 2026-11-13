# BookMonkey: vier Features – Planungsentwurf

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vorhandenes Editieren erhalten sowie Buchanlage, Pagination und eine lokal persistierte Leseliste ergänzen.

**Architecture:** Bestehende Standalone-Screens mit typisierten Reactive Forms und RxJS-Requestzuständen weiterführen. HTTP bleibt im BookApiClient; die Leseliste erhält einen kleinen signalbasierten Persistenzservice und einen eigenen lazy geladenen Screen.

**Tech Stack:** Angular 20.2.1, CDK 20.2.0, RxJS 7.8.0, bestehende Playwright-Umgebung.

**Spec:** Fachliche Spezifikation und bestätigte Verträge stehen in diesem Dokument. Die acht fachlichen Rückfragen wurden am 2026-11-13 beantwortet. Die Implementierung mit seriellen Subagents und unabhängigen Reviews ist beauftragt; keine Commits, Pushes oder PRs. Das „Ja“ zu Frage 4 wird als Zustimmung zu zehn Büchern pro Seite mit Zurück/Weiter verstanden. Aufgabe 1 hat die technischen Backendverträge für die verfügbare Bookmonkey-Version 3.3.0 mit JSON Server 0.17.4 geprüft; Ergebnisse und Grenzen stehen in den [API-Verträgen](2026-11-13-book-api-contracts.md).

## Bestätigte Entscheidungen vom 2026-11-13

1. Vorhandener Editor mit acht bearbeitbaren Feldern und geschützter ISBN reicht aus.
2. Bei Anlage sind genau ISBN, Titel, Verlag und Beschreibung Pflichtfelder.
3. Erfolgreiche Anlage öffnet unmittelbar die neue Detailansicht.
4. Pagination: zehn Bücher pro Seite und Zurück/Weiter; keine zusätzliche Seitengrößenauswahl vorgesehen (Auslegung der Antwort „Ja“).
5. Seite und sämtliche Such-/Filter-/Sortierwerte bleiben bei Rückkehr aus Details erhalten.
6. Roulette berücksichtigt alle gefilterten Bücher über sämtliche Seiten hinweg.
7. Karten können innerhalb einer Spalte sortiert und aus der Leseliste entfernt werden.
8. Das Board lädt beim Öffnen aktuelle Buchdaten.

Die gezielte Aufnahme aus der Detailansicht nach „want to read“ ohne Duplikate wurde bereits zuvor bestätigt. Fehler- und Offlineverhalten unten sind technische Ausgestaltungsentscheidungen, keine zusätzlichen Nutzeranforderungen.

## Global Constraints

- Book-Vertrag, geschützte Editierfelder und bestehende Deep Links erhalten.
- pageSize-Input und Default 10 erhalten.
- Suche: 300 ms für Texteingaben; neue Aktionen brechen Timer und Requests sofort ab; Clear und Retry bleiben unmittelbar.
- Kein Dependency-Upgrade und keine neue State-Library; CDK ist bereits installiert.
- Keine Requests, Subscriptions oder Storage-Mutationen im Konstruktor.
- Native Tastaturbedienung, Fokus, mobile Darstellung und beide Themes erhalten.
- Tests mocken die externe API; sie belegen keinen echten Backendvertrag.
- Keine GitHub-Schreibaktionen, Commits, Pushes oder Veröffentlichung durch diesen Planungsauftrag.
- Die unversionierte lokale Änderung `.codex/skills/angular-frontend/` erhalten.

## Review Focus

1. Neue Route `books/new` darf nicht als Buch-ID aufgelöst werden: Deep-Link-Test in Aufgabe 2.
2. Schnell wechselnde Seiten und Filter dürfen keine veralteten Ergebnisse zeigen: verzögerte Responses in Aufgabe 3.
3. Ein POST mit verlorener Antwort kann serverseitig erfolgreich gewesen sein: kein automatisches Wiederholen, eigene Fehlerprüfung in Aufgabe 2.
4. Beschädigter oder nicht beschreibbarer Storage darf das Board nicht unbenutzbar machen: Storage-Fixtures in Aufgabe 4.
5. Bereits aufgenommenes Buch und aktualisierte Buchdaten dürfen keine zweite Karte erzeugen: Aufnahme-/Editierintegration in Aufgabe 5.

## Fachliche Spezifikation

### Feature 1: Buch bearbeiten – bereits implementiert

Die Details unter `books/:id` schalten in den vorhandenen BookEditComponent um. Acht Felder sind bearbeitbar: Titel, Untertitel, Autor, Verlag, Seitenzahl, Preis, Cover und Beschreibung. ISBN bleibt sichtbar und schreibgeschützt; ID, userId und unbekannte Originalmetadaten bleiben beim vollständigen PUT erhalten.

Titel, Verlag und Beschreibung sind bereits Pflichtfelder einschließlich Whitespace-Prüfung. Pending-Zustand, Doppelklickschutz, Abbrechen, Fehlerwiederholung, Fokus und Navigation sind implementiert und in `tests/book-edit.spec.ts` beschrieben. Aufgabe 1 hat die vorhandenen Editier-ACs abgeglichen und alle 17 Chromium-Fälle erfolgreich ausgeführt; der dokumentierte Lauf mit wiederverwendetem Frontend umgeht das hängende verwaltete Server-Teardown. Das Feature wird erhalten, nicht erneut gebaut. Kein zusätzliches Bearbeiten der ISBN geplant.

### Feature 2: Buch anlegen

Vorschlag: „Add book“ in der Sammlung öffnet `/books/new`; die statische Route steht vor `books/:id`. Leeres Formular mit denselben acht Buchfeldern plus editierbarer ISBN. Titel, Verlag, Beschreibung und ISBN sind Pflichtfelder; keine zusätzliche ISBN-Prüfziffer-, Preis- oder URL-Regel. Seitenzahl leer bedeutet wie im Editor 0. Preis bleibt String. Technische ID und userId werden nicht als Nutzerfelder angeboten.

`POST /books` liefert die gespeicherte Ressource als `CreatedBook` mit optionaler userId; danach Navigation zu `/books/{returned.id}`. Abbrechen führt ohne POST zur Sammlung. Während des POST sind Formular und Absenden gesperrt. Bei Fehler bleiben Eingaben erhalten; nur eine bewusste erneute Nutzeraktion sendet erneut. Kein automatischer POST-Retry. Ein Requestabbruch ist kein serverseitiges Rollback.

Der [geprüfte Vertrag für Bookmonkey 3.3.0](2026-11-13-book-api-contracts.md) bestätigt: Das ungeschützte `/books` verlangt nur ISBN und Titel als Strings und liefert bei Erfolg 201 mit der gespeicherten Ressource. Die vier bestätigten UI-Pflichtfelder bleiben bestehen. Das Backend weist einer nichtleeren ISBN selbst dieselbe stringförmige ID zu; der Client sendet keine ID und nutzt stets returned.id. userId ist optional und wird bei fehlendem Input weder erzeugt noch zurückgegeben. Keine userId aus Testdaten übernehmen oder erfinden. Ein Konflikt mit einer vorhandenen ID liefert 500; ISBN-Duplikate mit abweichenden Legacy-IDs sind möglich. Keine Frontend-Duplikatabfrage als verlässlichen Eindeutigkeitsnachweis behandeln. Der bestehende `Book`-Vertrag bleibt erhalten; ausschließlich die Create-Antwort wird als `CreatedBook = Omit<Book, 'userId'> & { userId?: number }` typisiert.

Gemeinsame Formdarstellung erst mit dem zweiten Verbraucher extrahieren: BookFormComponent besitzt typisierte Controls, Validierung und Submit-/Cancel-Outputs; Edit-/Create-Container besitzen Requests und Pending-/Fehlerzustände. Die ISBN bleibt im Edit-Modus außerhalb des änderbaren Payloads. Bestehende Editor-Tests sichern diese Umstellung ab; kein allgemeines Formframework bauen.

### Feature 3: Pagination

Serverseitig, 1-basierte Seiten, bestehende Seitengröße 10, „Previous“/„Next“ und Anzeige der aktuellen Seite. Keine wählbare Seitengröße. Seite, Suchtext, Suchfeld, Verlag und Sortierung werden in Queryparametern der Sammlungsroute abgebildet. Detail- und Rücklinks erhalten diesen Sammlungskontext; Browser-Zurück, expliziter Sammlungslink und Reload stellen ihn wieder her. Fehlende oder ungültige Parameter werden auf sichere Defaults normalisiert. Routeränderungen und Formularaktionen dürfen keine doppelten Requests oder Rückkopplungsschleifen auslösen. Nach Rückkehr erfolgt eine aktuelle Seitenanfrage, kein Wiederherstellen veralteter Response-Daten.

Der [geprüfte Vertrag für Bookmonkey 3.3.0 / JSON Server 0.17.4](2026-11-13-book-api-contracts.md) verwendet `_page` und `_limit`, ein Array im Response-Body und den per CORS lesbaren `X-Total-Count`-Header für die gefilterte Ergebnismenge. Leere oder ungültig gewordene Seiten liefern ein leeres Array mit korrektem Count. Ein Offset-/Folgeindikatorverfahren ist für diese Version nicht erforderlich. Ein Array mit genau pageSize Elementen beweist keine Folgeseite. Der externe Paketstart ist unversioniert; bei anderer Backendversion Vertrag erneut prüfen, statt einen Count zu erfinden.

Neue Such-, Feld-, Verlags-, Sortier-, Clear- und Reset-Aktionen setzen auf Seite 1 zurück. Retry wiederholt dieselbe Seite samt Filtern. Ein Seitenwechsel ist unmittelbar und cancelt vorherige Requests; schnelle Wechsel bleiben zulässig, soweit bekannte Seitengrenzen eingehalten werden. Lade-/Fehlerzustände zeigen keine alten Bücher. Erste/letzte Seite deaktivieren den jeweiligen Navigationsknopf. Leere Sammlung zeigt einen Leerzustand. Wird eine Seite durch geänderte Daten ungültig, folgt höchstens eine korrigierende Anfrage auf die letzte gültige Seite, bei insgesamt 0 Ergebnissen auf Seite 1.

Roulette zieht aus allen gefilterten Büchern über sämtliche Seiten hinweg. Technischer Vorschlag: Kandidaten erst bei einer Ziehung über den geprüften Paging-Vertrag vollständig laden, mit unveränderten Such-/Verlags-/Sortierparametern. Jede ID erscheint höchstens einmal. Erst nach vollständigem Laden wird gleichverteilt gezogen; niemals stillschweigend nur aus bereits geladenen Seiten wählen. Ein Lesefehler zeigt einen eigenen Retry-Zustand und startet keine Ziehung aus einer Teilmenge. Während der Kandidatensuche weitere Ziehaktionen sperren; nach vollständiger Antwort beginnt entweder die gewählte Animation oder die unmittelbare Ergebnisanzeige. Der gesamte Kandidaten-Request wird bei Filterwechsel, Seitenwechsel oder Navigation abgebrochen; verspätete Antworten dürfen keinen Roll oder Dialog starten. Seitenwechsel schließt wie bisherige Suchaktionen eine Vorschau und beendet einen laufenden Roll. Kein dauerhafter Kandidatencache im ersten Umfang. Die zusätzlichen Requests und die Verzögerung vor einer Ziehung sind der Aufwand für die bestätigte Auswahl über alle Treffer. Aufgabe 1 belegt komplette Traversierung und stabile Reihenfolge bei konstanten Daten. Explizite Sortierungen nutzen die aufsteigende ID als zweite Sortierung; Default bleibt die Reihenfolge der Datenbank; gleichzeitige externe Änderungen über mehrere Seiten sind ohne serverseitigen Snapshot nicht vollständig konsistent abbildbar.

### Feature 4: Leselisten-Kanban

Bestätigt: gezieltes Hinzufügen aus der Detailansicht nach „want to read“; jedes Buch erscheint höchstens einmal. Vorgeschlagene Route `/reading-list`, erreichbar über die App-Navigation. Drei Spalten: `want to read`, `currently reading`, `read`.

Karten zeigen Titel, Autor, Cover und Detail-Link; Sortieren und Entfernen sind best?tigt. CDK ermöglicht Verschieben zwischen verbundenen Drop-Listen und Sortieren innerhalb einer Spalte. Zusätzlich ein beschriftetes natives Status-Select pro Karte, damit derselbe Statuswechsel ohne Drag möglich ist. Nach Statuswechsel Fokus sinnvoll erhalten und Änderung per Live-Region ankündigen. Ein „Remove from reading list“-Button entfernt nur den lokalen Eintrag, niemals das API-Buch. Leere Spalten bleiben Drop-Ziele.

Ein kleiner ReadingListService ist die einzige Zustandsquelle. Versionierter Schlüssel `bookmonkey-reading-list-v1`; Datenstruktur `{ version: 1, entries: ReadingListEntry[] }`. Die Array-Reihenfolge bestimmt innerhalb jeder Spalte die Kartenreihenfolge. Ein Entry enthält Buch-ID, Status und einen Snapshot aus Titel, Autor und Cover. Dadurch funktioniert die gespeicherte Leseliste auch ohne verfügbares Backend; sie lädt nicht nur die gerade sichtbare Sammlungsseite. Snapshot ist keine zweite vollständige Book-Ressource.

Beim Öffnen des Boards werden aktuelle Daten für alle lokal aufgenommenen Buch-IDs über getBook geladen, unabhängig von der sichtbaren Sammlungsseite. Request-Orchestrierung liegt im Board-Screen, nicht im Storage-Service. Technische Ausgestaltung: höchstens vier parallele Detailrequests, Fehler pro Buch isolieren und einen Gesamtzustand für Laden/geladen/teilweise fehlgeschlagen anbieten. Gespeicherte Snapshots dürfen während des Ladens sichtbar bleiben, müssen aber als noch nicht aktualisiert erkennbar sein. Nach Erfolg werden nur die Metadaten bestehender Einträge aktualisiert; Status und Reihenfolge bleiben erhalten. Keine entfernte Karte durch eine späte Response wieder hinzufügen. Boardnavigation bricht Requests ab; ein erneuter Refresh ersetzt einen laufenden Refresh.

Bei Netzwerk-/Serverfehlern bleibt der letzte Snapshot mit Hinweis und explizitem Retry nutzbar. Bei 404 bleibt die Karte als „nicht mehr verfügbar“ markiert und kann lokal entfernt werden. Kein stilles Löschen. Refresh verändert weder Lesestatus noch Reihenfolge. Ein leeres Board sendet keine Buchrequests. Erneutes Hinzufügen und erfolgreiches Editieren aktualisieren ebenfalls den Snapshot. Keine kontinuierliche Hintergrundsynchronisation oder Polling; aktuelle Daten werden bei jedem Boardbesuch neu geladen.

Storage-Initialisierung explizit und idempotent beim ersten Lesen/Aufnehmen, nicht im Konstruktor oder nur beim Boardbesuch. JSON als unknown einlesen, Version, Felder, Status und eindeutige IDs prüfen. Ungültige Dokumente/Versionen mit Hinweis als leeres Sitzungsboard behandeln, Originalinhalt nicht beim Laden überschreiben. Nach einer ausdrücklichen Boardänderung darf ein gültiges Dokument geschrieben werden. Schlägt Lesen/Schreiben fehl, bleibt das Board für diese Sitzung benutzbar und zeigt einen Persistenzhinweis; kein falsches „gespeichert“. Kein Login, Cloud-Sync, Mehrgeräte- oder Mehrtab-Abgleich geplant. Persistenz gilt für diesen Browser und Origin.

CDK-Helfer ändern Arrays in place. Daher gegebenenfalls nur auf Kopien anwenden und anschließend einen neuen Signalwert setzen; keine unbemerkte Mutation des aktuellen Signalzustands.

## Akzeptanzkriterien und Testzuordnung

Jede Tabellenzeile beschreibt einen eigenständigen Test, außer ausdrücklich genannten vorhandenen Varianten. Neue Testtitel beginnen mit der stabilen AC-ID. Alle Szenarien sind Browsertests mit `test`/`expect` aus `tests/fixtures/books.ts`.

| ID    | Given / When / Then                                                                                                                                                                                             | Datei, Testtitel und Fixture                                                                                                                                                                           | Erwartetes Red                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| AC-1  | Gegeben geladenes Buch; beim Öffnen des Editors sind alle acht Felder vorbelegt, ISBN geschützt und Titel fokussiert.                                                                                           | Vorhanden `book-edit.spec.ts`: `prefills all eight editable fields and shows the protected ISBN`; firstBook. Fokusabdeckung prüfen.                                                                    | Bereits implementiert; kein künstliches Red.                  |
| AC-2  | Gegeben Änderungen; beim Speichern bleiben ISBN/IDs/Metadaten erhalten und neue Werte über Reload sichtbar.                                                                                                     | Vorhanden `saves every editable field with original ISBN and IDs and retains the changes on reload and in the collection`; zustandsbehafteter PUT/GET-Mock.                                            | Bereits implementiert.                                        |
| AC-3  | Gegeben leere/Whitespace-Pflichtwerte; Submit schreibt nicht; nach Korrektur kann gespeichert werden.                                                                                                           | Vorhandene getrennte Varianten `blocks … required fields and accepts corrected values`.                                                                                                                | Bereits implementiert.                                        |
| AC-4  | Gegeben Entwurf; Abbrechen schreibt nicht, erneutes Öffnen zeigt Originalwerte.                                                                                                                                 | Vorhanden `cancels without writing or changing details and reopens with original values`.                                                                                                              | Bereits implementiert.                                        |
| AC-5  | Gegeben fehlgeschlagener Save; Eingaben bleiben, Wiederholung funktioniert.                                                                                                                                     | Vorhandene getrennte Netzwerk-/Serverfehler in `book-edit.spec.ts`.                                                                                                                                    | Bereits implementiert.                                        |
| AC-6  | Gegeben laufender Save; weitere Submits schreiben nicht; Navigation verwirft den alten Editor.                                                                                                                  | Zwei vorhandene Tests `shows pending save state …` und `changing book IDs …`.                                                                                                                          | Bereits implementiert.                                        |
| AC-7  | Gegeben Sammlung oder direkter Link; Öffnen von `/books/new` zeigt leeres Anlageformular und keinen GET für ID new.                                                                                             | Neu `book-create.spec.ts`: `AC-7 / Anlage per Link und Deep Link`; Requestzählung.                                                                                                                     | Route/Formular fehlen.                                        |
| AC-8  | Gegeben gültige Eingaben; Submit sendet einen vertragstreuen POST und öffnet die zurückgegebene ID; Reload zeigt das neue Buch.                                                                                 | `AC-8 / Anlage speichert und öffnet Ergebnis`; zustandsbehafteter POST/GET-Mock, zurückgegebene ID absichtlich ungleich ISBN.                                                                          | POST und Erfolgsnavigation fehlen.                            |
| AC-9  | Gegeben leere oder Whitespace-Pflichtwerte; Submit sendet keinen POST; Korrektur erlaubt Anlage.                                                                                                                | `AC-9 / Anlage validiert Pflichtwerte`; getrennte Leer-/Whitespace-Varianten nach festgelegtem Backendvertrag.                                                                                         | Formular/Validierung fehlen.                                  |
| AC-10 | Gegeben Entwurf; Abbrechen öffnet Sammlung ohne POST.                                                                                                                                                           | `AC-10 / Anlage abbrechen`; POST-Zähler.                                                                                                                                                               | Aktion fehlt.                                                 |
| AC-11 | Gegeben ausstehender POST; Doppelklick erzeugt nur einen Request und zeigt Pending.                                                                                                                             | `AC-11 / Anlage verhindert Doppelabsenden`; kontrolliert freigegebener Response.                                                                                                                       | Pending-Schutz fehlt.                                         |
| AC-12 | Gegeben POST-Netzwerk-/Serverfehler; Eingaben bleiben, kein automatischer Retry, bewusster Retry kann erfolgreich sein.                                                                                         | `AC-12 / Anlagefehler und bewusste Wiederholung`; getrennte Fehlervarianten; Antwortverlust als eigener Fall, kein garantierter Exactly-once-Anspruch.                                                 | Fehlerzustand fehlt.                                          |
| AC-13 | Gegeben 23 gefilterte Bücher und Größe 10; nächste Seiten zeigen 11–20 bzw. 21–23, Grenzen sind deaktiviert.                                                                                                    | Neu `book-pagination.spec.ts`: `AC-13 / Seiten und Grenzen`; deterministische 23-Book-Fixture mit Count.                                                                                               | Controls und Pagination-Parameter fehlen.                     |
| AC-14 | Gegeben Seite 2; Änderung von Suche/Filter/Sort/Clear/Reset lädt Seite 1 und erhält die jeweils anderen Parameter.                                                                                              | `AC-14 / Kriterienwechsel setzt Seite zurück`; je Aktion eigener parametrisierter Test.                                                                                                                | Seitenzustand/Reset fehlen.                                   |
| AC-15 | Gegeben verzögerte Seitenresponse; neuer Seiten-/Suchwechsel verhindert späte Übernahme und cancelt sofort.                                                                                                     | `AC-15 / Seitenwechsel ignoriert alte Response`; getrennte Wechselvarianten, vorhandene Suchtests erhalten.                                                                                            | Pagination-Orchestrierung fehlt.                              |
| AC-16 | Gegeben Seitenfehler; Retry lädt dieselbe Seite mit denselben Filtern ohne alte Ergebnisse.                                                                                                                     | `AC-16 / Seitensehler und Retry`; Seite 2 zunächst 500, danach Erfolg.                                                                                                                                 | Seitenerhalt fehlt.                                           |
| AC-17 | Gegeben keine Treffer oder inzwischen ungültige Seite; leere Ansicht bzw. genau eine Korrekturanfrage erscheint ohne Schleife.                                                                                  | `AC-17 / Leere Sammlung` und `AC-17 / Seite nach Schrumpfen korrigieren`; 0-/23-zu-11-Fixtures.                                                                                                        | Korrektur fehlt.                                              |
| AC-18 | Gegeben Vorschau, Kandidatenrequest oder laufender Roulette-Roll; Seitenwechsel schlie?t/beendet sie; eine neue Ziehung ber?cksichtigt alle gefilterten Seiten.                                                 | `AC-18 / Pagination und Roulette`; mehrseitige Fixtures, versp?tete Antworten und Requestabbruch pruefen.                                                                                              | Vollst?ndige Kandidatensuche und Wechselintegration fehlen.   |
| AC-19 | Gegeben Detailansicht; Hinzufügen erzeugt genau eine Karte in want to read, wiederholte Aufnahme kein Duplikat.                                                                                                 | Neu `reading-list.spec.ts`: `AC-19 / Gezielt aufnehmen ohne Duplikat`; firstBook, initial leerer Storage.                                                                                              | Aufnahme/Board fehlen.                                        |
| AC-20 | Gegeben Karte; Drag in jede andere Spalte und Reload erhalten Status und eindeutige Karte.                                                                                                                      | `AC-20 / Drag zwischen Spalten persistiert`; parametrisierte Übergänge und leerer Zielbereich, echte Pointerbewegung.                                                                                  | CDK-Board/Persistenz fehlen.                                  |
| AC-21 | Gegeben zwei Karten einer Spalte; Umsortieren und Reload erhalten Reihenfolge.                                                                                                                                  | `AC-21 / Reihenfolge persistiert`; firstBook/secondBook.                                                                                                                                               | Sortieren fehlt.                                              |
| AC-22 | Gegeben fokussiertes Status-Select; Tastaturwechsel bewegt die Karte, erhält sinnvollen Fokus und kündigt Zielstatus an.                                                                                        | `AC-22 / Statuswechsel per Tastatur`; ohne Pointer, Live-Region prüfen.                                                                                                                                | Alternative fehlt.                                            |
| AC-23 | Gegeben gespeichertes Board; beim ?ffnen werden aktuelle Metadaten aller aufgenommenen IDs geladen, ohne Status/Reihenfolge zu ?ndern; ein leeres Board zeigt drei Drop-Ziele ohne Buchrequests.                | `AC-23 / Aktuelle Daten beim Boardbesuch` und `AC-23 / Leeres Board`; abweichende Storage-/GET-Daten, erneuten Boardbesuch pruefen.                                                                    | Refresh und Board fehlen.                                     |
| AC-24 | Gegeben ungültiges JSON, falsche Version, ungültige Entries oder doppelte IDs; Laden stürzt nicht ab, zeigt Hinweis und überschreibt nicht ungefragt.                                                           | `AC-24 / Ungültiger Storage`; getrennte Init-Script-Fixtures.                                                                                                                                          | Validierung fehlt.                                            |
| AC-25 | Gegeben Storage wirft beim Lesen/Schreiben; Änderungen funktionieren in der Sitzung mit Persistenzhinweis.                                                                                                      | `AC-25 / Storage-Lesen verweigert` und `AC-25 / Storage-Schreiben verweigert`; Storage-Methoden vor Appstart gezielt werfen lassen.                                                                    | Fehlerbehandlung fehlt.                                       |
| AC-26 | Gegeben Karte; Entfernen und Reload entfernen nur lokalen Eintrag, kein DELETE an API.                                                                                                                          | `AC-26 / Leseliste entfernen`; Requestzählung.                                                                                                                                                         | Entfernen fehlt.                                              |
| AC-27 | Gegeben aufgenommenes Buch; erfolgreiche Bearbeitung aktualisiert Snapshot ohne Status-/Reihenfolgeverlust.                                                                                                     | `AC-27 / Edit aktualisiert Snapshot`; zustandsbehafteter PUT-Mock.                                                                                                                                     | Integration fehlt.                                            |
| AC-28 | Gegeben Anlage/Pagination/Board; bei 375 px und Desktop in Light/Dark bleiben Aktionen erreichbar und Fokus sichtbar.                                                                                           | Je Feature eigene parametrische Tests `AC-28 / … mobil und Theme`; gemeinsame Fixture, keine Screenshot-only-Behauptung vollständiger Barrierefreiheit.                                                | Neue Ansichten fehlen.                                        |
| AC-29 | Gegeben gefilterte Sammlung auf Seite 2; nach Detailbesuch stellen Browser-Zurueck und Sammlungslink Seite, Suchtext, Suchfeld, Verlag und Sortierung wieder her; Reload erhaelt den Kontext.                   | `book-pagination.spec.ts`: `AC-29 / Sammlungskontext wiederherstellen`; getrennte Rueckwege und ungueltige Queryparameter, Requests auf Doppelabrufe pruefen.                                          | URL-Zustand und kontexterhaltende Ruecklinks fehlen.          |
| AC-30 | Gegeben gefilterte Treffer auf mehreren Seiten; Roulette laedt alle Kandidaten und kann ein Buch ausserhalb der sichtbaren Seite ziehen; bei Teilfehler erfolgt keine Teilmengenziehung und Retry ist moeglich. | `book-roulette.spec.ts`: `AC-30 / Alle gefilterten Kandidaten`, `AC-30 / Kandidatenfehler und Retry`; feste Zufallsquelle, fremde Filtertreffer ausschliessen, beide Ziehmodi und Doppelklick pruefen. | Seitenuebergreifende Kandidatensuche fehlt.                   |
| AC-31 | Gegeben einzelne fehlgeschlagene Refresh-Requests; erfolgreiche Karten werden aktualisiert, fehlerhafte Snapshots bleiben gekennzeichnet nutzbar und Retry aktualisiert sie.                                    | `reading-list.spec.ts`: `AC-31 / Refresh mit Teilerfolg`; Server-/Netzwerkfehler getrennt, kein Verlust von Status/Reihenfolge.                                                                        | Refresh-Fehlerzustaende fehlen.                               |
| AC-32 | Gegeben API-404 fuer eine gespeicherte ID; die Karte bleibt als nicht verfuegbar markiert und kann lokal entfernt werden.                                                                                       | `AC-32 / Nicht mehr verfuegbares Buch`; 404-Fixture, kein DELETE.                                                                                                                                      | 404-Markierung fehlt.                                         |
| AC-33 | Gegeben laufender Refresh; Navigation bricht Requests ab; spaetere Antworten stellen keine entfernten Karten wieder her und ueberschreiben keinen inzwischen geaenderten Status.                                | `AC-33 / Refresh und Navigation` sowie `AC-33 / Refresh respektiert Verschieben und Entfernen`; kontrolliert verzoegerte Responses.                                                                    | Refresh-Lifecycle und konsistente Metadatenuebernahme fehlen. |
| AC-34 | Gegeben mehr als vier gespeicherte Buecher; Refresh hat hoechstens vier gleichzeitige Requests und aktualisiert nach deren Abschluss alle Karten.                                                               | `AC-34 / Refresh begrenzt Parallelitaet`; sechs ID-Fixtures, kontrollierte Responsefreigabe und Requestzaehlung.                                                                                       | Begrenzte Request-Orchestrierung fehlt.                       |

## Dateien, Schnittstellen und Datenfluss

Alle neuen Buchdateien liegen unter `src/app/books/`; dortige Guides gelten. Dateinamen sind geplante Namen, keine bereits vorhandenen Implementierungen.

- `book-form.component.ts/html/css`: gemeinsame Formdarstellung. Inputs `mode: 'create' | 'edit'`, `initialValue: BookFormValue`, `isbn: string`, `pending: boolean`, `error: string | null`; Outputs `submitted: BookFormValue`, `cancelled: void`. `BookFormValue` enthält die acht editierbaren Felder plus isbn; numPages ist im normalisierten Output number, subtitle string. Edit-Container ignoriert submitted.isbn immer.
- `book-form.model.ts`: BookFormValue und wiederverwendbare Pflichttextvalidierung, nur mit realen Create/Edit-Verbrauchern.
- `book-create.component.ts/html`: Anlage-Container, `idle | saving | error`, expliziter Submit über exhaustMap und inneres catchError. Erfolg nutzt zurückgegebene Book-ID; Zerstörung baut HTTP-Subscription ab.
- `book-edit.component.ts/html/css`: vorhandenen öffentlichen Vertrag `book`, `saved`, `cancelled` erhalten; Formular auslagern, HTTP-Orchestrierung erhalten. Keine Ersetzung durch einen generischen Request-Store.
- `book-api-client.service.ts`: vorhandene Methoden und den bestehenden `Book`-Vertrag erhalten; ergänzen `createBook(input: CreateBookInput): Observable<CreatedBook>` und `getBooksPage(query: BookPageQuery): Observable<BookPage>`. Gemäß [geprüftem API-Vertrag](2026-11-13-book-api-contracts.md) gilt `CreateBookInput = BookChanges & Pick<Book, 'isbn'>` und `CreatedBook = Omit<Book, 'userId'> & { userId?: number }`; kein id/userId-Feld im Create-Payload und keine künstliche owner-Normalisierung. BookPageQuery enthält `page: number`, `pageSize: number`, optional searchTerm und filters. BookPage enthält `books: Book[]`, `page: number`, `pageSize: number`, `total: number` für den bestätigten Count-Vertrag. Query-Aufbau gemeinsam nutzen, keine driftenden Filterimplementierungen. Alle HTTP-Requests bleiben hier; das Traversieren der Seiten für Roulette orchestriert der List-Screen über diese kalten Observables.
- `book-list.component.ts/html`: bestehende Suche um Page-Aktionen erweitern, ein Request-State-Stream; BookPage im loaded-Zweig. Gewünschte Seite und bestätigte Response unterscheiden. Vorhandenen pageSize-Input erhalten. `book-pagination.component.ts/html`: präsentative Navigation mit Inputs page, pageSize, total und Output pageRequested: number; keine HTTP-Aufrufe.
- `reading-list.model.ts`: `ReadingStatus = 'want-to-read' | 'currently-reading' | 'read'`; `ReadingListEntry = { bookId: string; status: ReadingStatus; title: string; author: string; cover: string }`.
- `reading-list.service.ts`: readonly entries und persistenceWarning; `initialize(): void`, `add(book: Book): void`, `move(bookId: string, status: ReadingStatus, targetIndex: number): void`, `remove(bookId: string): void`, `refreshSnapshot(book: Book): void`. add ist eindeutig nach Book.id und behält bei vorhandener ID Status/Position; refreshSnapshot fügt keine neuen Einträge hinzu. move begrenzt targetIndex innerhalb der Zielspalte und verwendet neue Arrays. Eine Serviceinstanz für Detailansicht und Board.
- `reading-list.component.ts/html/css`: Storageinitialisierung, drei verbundene CDK-Listen, Snapshotkarten mit BookCoverComponent, Status-Select, Entfernen, Leer-/Persistenzhinweise. Zusätzlich aktuelles Laden über getBook je gespeicherter ID mit maximal vier gleichzeitigen Requests, innerer Fehlerbehandlung und Lifecycle-Abbruch. Keine Abhängigkeit von der Sammlungsseite und keine Servermutation beim Verschieben.
- `book-details.component.ts/html`: Aufnahme-Aktion und Snapshotaktualisierung nach erfolgreichem Save. Detail-404-/Retry- und Edit-Fokusverhalten bewahren.
- `app.routes.ts`: lazy books/new vor books/:id, lazy reading-list vor Wildcard.
- `app.ts/html`: Navigation über RouterLink ergänzen.
- `tests/fixtures/books.ts`: methodensensitive Collection-GET-/POST-Mocks; bei Pagination Count plus Slice nach Query. Keine globale Fixture, die versehentlich POST als GET beantwortet. Spezifische Szenarien dürfen Handler mit fallback überschreiben. URL-genaue vorhandene Cancellation-Mocks gezielt auf die neuen Parameter anpassen, Assertions nicht abschwächen.
- `ARCHITECTURE.md`: erst bei Implementierung tatsächliche Routen, API-Verträge, Orchestrierung und neue lokale Persistenz dokumentieren.

## Umsetzung in überprüfbaren Aufgaben

### Aufgabe 1: Bestand und Backendverträge prüfen

**Dateien:** bestehende API-/Edit-Implementierung und Tests lesen; Vertragsresultate hier dokumentieren. Keine Featureimplementierung.

**Consumes:** aktuelle Repository-Guides, vorhandene Tests, tatsächlich verfügbare Bookmonkey-Version. **Produces:** belegte CreateBookInput-/POST- und Pagination-/Count-Verträge oder konkret dokumentierte Blocker.

- [x] Vorhandene Editier-ACs auf Testtitel abgeglichen; angeforderten Chromium-Lauf ausgeführt. 17 Fälle bestanden mit dokumentiertem temporärem Runner ohne verwaltetes Server-Teardown; kein künstliches Red. Siehe [Prüfergebnisse](2026-11-13-book-api-contracts.md).
- [x] Verfügbare Paketquelle Bookmonkey 3.3.0 / JSON Server 0.17.4 gelesen und POST-/Paging-Semantik mit isolierter In-Memory-Instanz belegt; keine realen Buchdaten mutiert.
- [x] id/userId/ISBN-Konflikte, gefilterte Gesamtzahl, CORS-Lesbarkeit in Chromium sowie vollständige stabile Traversierung geprüft. Zehn POST- und 17 Paging-Proben bestanden. Create-Typen und Paging-Vertrag hier aufgelöst; Versionseinschränkung, fehlende ISBN-weite Eindeutigkeit und fehlender serverseitiger Snapshot in den [API-Verträgen](2026-11-13-book-api-contracts.md) dokumentiert.

### Aufgabe 2: Buchanlage und gemeinsam verwendetes Formular

**Dateien:** book-form*, book-create*, book-edit\*, API-Client, app.routes.ts, book-list.component.html, tests/book-create.spec.ts, tests/book-edit.spec.ts, Fixture, ARCHITECTURE.md.

**Consumes:** [geprüfter Create-Vertrag](2026-11-13-book-api-contracts.md) mit `CreateBookInput = BookChanges & Pick<Book, 'isbn'>` und optionaler userId ausschließlich im Antworttyp `CreatedBook`. **Produces:** `createBook(input: CreateBookInput): Observable<CreatedBook>`, neue Route und gemeinsames Formular mit oben beschriebenem Vertrag.

- [x] AC-7 bis AC-12 und Anlageanteil AC-28 schreiben; vorhandene Edit-Tests unverändert als Verhaltenserwartung erhalten.
- [x] Neue Suite entdecken und in Chromium laufen lassen; fehlendes Formular/POST als Red belegen. Infrastrukturfehler gesondert melden.
- [x] Gemeinsames Formular, Create-Container, API-Methode und Route implementieren; Edit-Container migrieren und Schutzfelder weiter nur im API-Client erlaubnisbasiert überschreiben.
- [x] Create- und Edit-Suites in Chromium ausführen; beide müssen bestehen. Task-Review auf Spezifikation und Qualität; nötige Korrekturen erneut gezielt prüfen.

### Aufgabe 3: Pagination mit Suche und Roulette integrieren

**Dateien:** API-Client, book-list*, book-pagination*, tests/book-pagination.spec.ts, tests/book-list.spec.ts, tests/book-filters.spec.ts, tests/book-roulette.spec.ts, Fixture, ARCHITECTURE.md.

**Consumes:** geprüfter Paging-Vertrag und unveränderte Filtersemantik. **Produces:** getBooksPage und präsentative Pagination samt korrekter Request-Orchestrierung.

- [x] AC-13 bis AC-18, AC-29, AC-30 und Paginationanteil AC-28 mit 23 deterministischen Büchern schreiben. Roulette muss auch einen Kandidaten außerhalb der sichtbaren Seite erreichen können, ohne Filter zu verlieren.
- [x] Neue Suite in Chromium als fachliches Red ausführen; bestehende Suche bleibt gültige Regression.
- [x] API-Page-Response, Navigation und Aktionszustand implementieren; Reset, Retry, Requestabbruch und einmalige Seitenkorrektur explizit behandeln. Sammlungskontext in Queryparametern halten, aus Details wiederherstellen und vollständige Roulette-Kandidatensuche mit separatem Lade-/Fehlerzustand integrieren.
- [x] Pagination/List/Filters/Roulette gemeinsam in Chromium prüfen; Test-Overrides müssen weiterhin tatsächlich Requests abfangen. Task-Review durchführen.

### Aufgabe 4: Kanban und Storage als eigenständiges Feature

**Dateien:** reading-list.model.ts, reading-list.service.ts, reading-list.component.ts/html/css, tests/reading-list.spec.ts. Route und Shellintegration ausschließlich in Aufgabe 5.

**Consumes:** Book als Snapshotquelle, vorhandener Cover-Renderer, installierter CDK. **Produces:** Service und Board mit obigem Vertrag.

- [ ] AC-20 bis AC-26, AC-31 bis AC-34 und Boardanteil AC-28 gegen eine in Aufgabe 5 eingebundene Route spezifizieren. Aufgabe 4 und 5 bilden bei serieller Ausführung einen zusammenhängenden Red/Green-Zyklus; vor Routeinbindung kein „verifiziert fertig“ behaupten.
- [ ] Persistenz, Laufzeitvalidierung, eindeutige IDs und immutable move implementieren; keine willkürliche Übernahme unbekannter JSON-Werte.
- [ ] Drei CDK-Drop-Listen, Reordering, Status-Select, Fokus-/Live-Region und Sessionhinweise implementieren. Aktuelle Daten beim Öffnen laden; Teilerfolg, 404, Retry und Abbruch pro Screenzustand abbilden. Metadaten-Updates müssen zwischenzeitliches Verschieben und Entfernen respektieren.
- [ ] Review des klar abgegrenzten Service-/Board-Diffs; Browser-Green nach Aufgabe 5 erforderlich. Bei SDD vorzugsweise Aufgabe 4 und 5 zu einem unabhängig prüfbaren Task zusammenführen.

### Aufgabe 5: Leseliste in App und Details einbinden

**Dateien:** app.routes.ts, app.ts/html, book-details.component.ts/html, tests/reading-list.spec.ts, tests/book-edit.spec.ts, ARCHITECTURE.md.

**Consumes:** ReadingListService und ReadingListComponent. **Produces:** vollständiger Nutzerablauf Aufnahme → Board → Statuswechsel → Reload und Edit-Snapshot-Aktualisierung.

- [ ] AC-19, AC-23 und AC-27 ergänzen; noch fehlende Route/Aufnahme als Red beobachten.
- [ ] Lazy-Route, Navigation, gezielte Aufnahme und refreshSnapshot nach Save ergänzen. Initialisierung muss auch beim ersten Einstieg über Details erfolgen.
- [ ] Gesamte Reading-list-Suite und betroffene Details/Edit-Suites in Chromium ausführen; alle Kriterien müssen bestehen. Danach Review von Aufgabe 4 und 5 zusammen.

### Aufgabe 6: Gesamtintegration und Abschlussprüfung

- [ ] Finale Änderung auf Vertragsbrüche, unbeabsichtigte Dateien und AC-Test-Abdeckung prüfen.
- [ ] Alle Anwendungssuites in Chromium, Firefox und WebKit ausführen; neue Feature-Suites einschließen.
- [ ] Development- und Produktionsbuild getrennt ausführen, nur geänderte Dateien formatprüfen und Whitespace-Diff prüfen.
- [ ] Tatsächliche Ergebnisse, Blocker und Grenzen berichten; globale Legacy-Karma- oder Demo-Probleme nicht als Featurearbeit reparieren.

## Konkrete Prüfkommandos für die Implementierung

Falls `tmp/playwright-browsers` existiert und kein bewusst abweichender Browserpfad gesetzt ist, in derselben PowerShell-Sitzung setzen:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'tmp/playwright-browsers'
```

```powershell
npx playwright test tests/book-create.spec.ts tests/book-pagination.spec.ts tests/reading-list.spec.ts --list
npx playwright test tests/book-create.spec.ts --project=chromium
npx playwright test tests/book-pagination.spec.ts --project=chromium
npx playwright test tests/reading-list.spec.ts --project=chromium
npx playwright test tests/book-details.spec.ts tests/book-list.spec.ts tests/book-edit.spec.ts tests/book-filters.spec.ts tests/book-roulette.spec.ts tests/bookshelf.spec.ts tests/theme.spec.ts tests/book-create.spec.ts tests/book-pagination.spec.ts tests/reading-list.spec.ts
node node_modules/@angular/cli/bin/ng.js build --configuration development
npm run build
git diff --check
```

Zusätzlich `npx prettier --check` mit der expliziten Liste tatsächlich geänderter Dateien. Ein fehlender Browser oder blockiertes Font-Netzwerk ist kein fachliches Red. `npm test` ist laut Projektguide unvollständig und wird nicht als bestandene Prüfung behauptet.

## Umsetzung mit mehreren Subagents

Empfehlung: Subagent-Driven Development seriell. Ein Koordinator führt diesen Plan und ein dauerhaftes Fortschrittsprotokoll; pro Implementierungstask ein frischer Implementierer mit engem Briefing, danach ein frischer Reviewer für Spezifikation und Codequalität. Aufgabe 4/5 als einen testbaren Kanban-Task beauftragen. Zum Schluss ein Review der gesamten Änderung und Aufgabe 6. Fehlerkorrekturen gehen an denselben Implementierer zurück. Kein Implementierer delegiert selbst weiter.

Der geladene Skill untersagt mehrere parallele Implementierungsagenten. Mehrere Subagents bedeutet hier mehrere aufeinanderfolgende Rollen, nicht vier gleichzeitig schreibende Feature-Agenten. Alle hiesigen Agenten teilen das Dateisystem; getrennte Kontexte bieten keine Dateiisolation. Insbesondere API-Client, Routes, Fixtures, Details und Architekturdatei haben mehrere Verbraucher.

Eine alternative echte Parallelisierung braucht einen ausdrücklich anderen Ablauf als diesen SDD-Skill: nach festgeschriebenen Verträgen separate Git-Worktrees für Anlage, Pagination und Kanban verwenden, gemeinsame Route-/Shell-/Detailintegration einem Integrator vorbehalten und danach kontrolliert integrieren. Nicht gleichzeitig mehrere Devserver auf 4200 oder Tests gegen den falschen wiederverwendeten Server laufen lassen. Das zusätzliche Integrationsrisiko lohnt hier voraussichtlich weniger als die serielle Variante.

Beispielauftrag nach Klärung der offenen Verträge und Prüfung dieses Entwurfs:

> Implementiere `docs/superpowers/plans/2026-11-13-book-features.md` mit angular-frontend und superpowers:subagent-driven-development. Starte mit Aufgabe 1 und halte die geprüften Verträge im Plan fest. Verwende einen Implementierer pro Task und anschließend einen unabhängigen Task-Reviewer; arbeite die Implementierung seriell ab und fasse Aufgabe 4/5 zusammen. Jeder Implementierer erhält nur sein Briefing, relevante Guides, ACs, Schnittstellen und Grenzen. Protokolliere Red/Green und Reviewresultate; führe am Ende alle Anwendungstests in drei Browsern sowie die Builds aus. Keine Commits, Pushes, PRs oder Veröffentlichungen ohne gesonderten Auftrag.

## Execution checkpoint - stopped at user request

On 2026-11-13 the user requested stopping after Feature 3. Tasks 1, 2 and 3 are implemented/verified within their recorded scope and independently approved. Task 3 lifecycle finding I1 was corrected and independently re-reviewed as addressed. Feature 4 (combined tasks 4/5) has not started; task 6 full-browser regression and production build have not run.

Evidence: task 2 Create+Edit 33 Chromium passes and 2 list smoke passes; task 3 final focused 86 Chromium passes, followed by a narrow lifecycle fix with 17 covering passes including a new same-details-route query test. Development builds, strict test TypeScript, targeted formatting and whitespace checks passed. These counts are separate runs, not one combined final suite. No Firefox/WebKit, production-build or full integrated regression success is claimed. See plan-scoped task reports and reviews under `.superpowers/sdd/2026-11-13-book-features/` and the verified API contracts document. No commits, pushes or PRs were created.

## Stand dieser Planung

Code, Guides, vorhandene Testdefinitionen und lokale Abhängigkeiten wurden gelesen. Angular-MCP-Best-Practices und Workshop-Projektkontext wurden abgerufen. Context7 lieferte Angular-20-Formular- und CDK-20-Dokumentation. Aufgabe 1 ist abgeschlossen: 17 vorhandene Chromium-Editorfälle sowie isolierte POST-/Paging-Proben und ein echter Cross-Origin-Count-Zugriff in Chromium bestanden. Ergebnisse, temporärer Runner und Teardown-Einschränkung stehen in den [API-Verträgen](2026-11-13-book-api-contracts.md). Anwendungscode, Dependencies und Architektur wurden dabei nicht verändert; Builds wurden in Aufgabe 1 nicht ausgeführt.

Dokumentationsgrundlagen: [Angular 20 Formularvalidierung](https://v20.angular.dev/guide/forms/form-validation), [CDK 20 Drag-and-drop](https://github.com/angular/components/blob/20.1.2/src/cdk/drag-drop/drag-drop.md). CDK-Dokumentation wurde für 20.1.2 abgerufen; konkrete verwendete APIs bei Implementierung gegen das installierte 20.2.0 prüfen. Die [bestätigten POST-/Paging-Verträge](2026-11-13-book-api-contracts.md) beruhen auf tatsächlicher Paketquelle und isolierter Middleware-Ausführung für Bookmonkey 3.3.0 / JSON Server 0.17.4. Gemockte Anwendungstests belegen weiterhin ausschließlich UI-Verhalten. Das unversionierte Backend und gleichzeitige externe Änderungen ohne serverseitigen Snapshot bleiben dokumentierte Grenzen.
