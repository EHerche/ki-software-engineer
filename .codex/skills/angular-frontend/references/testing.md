# Frontendtests und Verifikation

## Vorhandene Umgebung

Prüfe die aktuellen Dateien, statt historische Testanzahlen zu übernehmen:

- `playwright.config.ts`: Tests unter `tests/`, Chromium, Firefox und WebKit.
  `webServer` startet `npm start` auf Port 4200; lokal wird ein laufender Server wiederverwendet.
- Importiere für BookMonkey `test` und `expect` aus `tests/fixtures/books.ts`, nicht den
  unveränderten Playwright-Test. Die Fixture setzt `baseURL`, liefert Bücher und Cover
  lokal und blockiert Google-Font-Requests. Ein Live-Backend auf Port 4730 ist nicht nötig.
- Anwendungsdateien derzeit: `book-list`, `book-details`, `book-edit`, `book-filters`,
  `book-roulette`, `bookshelf` und `theme`, jeweils `tests/<name>.spec.ts`.
  Ergänze neue Feature-Suites bei der abschließenden Regression.
- `tests/example.spec.ts` testet eine externe Demo und ist keine Anwendungsregression.
  `tests-examples/` gehört ebenfalls nicht zur Featureverifikation.
- Der Legacy-Karma-Target von `npm test` ist laut Projektguide unvollständig
  (`karma-jasmine`/Jasmine-Abhängigkeiten). Nicht als bestanden melden oder im Rahmen
  eines Features ungefragt den Runner umbauen. Es gibt keinen eingerichteten Lint-Befehl.

## Tests entwerfen

Teste Nutzeraktionen und sichtbare Ergebnisse der echten App. Bevorzuge `getByRole`
und `getByLabel`, eindeutige zugängliche Namen sowie erwartete Fokus-/URL-Änderungen.
Verwende erwartete, asynchron wiederholte Assertions (`await expect(...)`).
Vermeide feste Wartezeiten, DOM-Details und Angular-Debug-Zugriffe für neue Nutzerabläufe.
Für zeitabhängige Suche vorhandene Clock-/Request-Synchronisierungsmuster prüfen.

Registriere API-Overrides vor Navigation bzw. auslösender Aktion. Später registrierte
passende Page-Routen haben Vorrang vor Fixture-Routen. Jeder Handler muss den Request
beantworten oder gezielt weiterreichen; nutze `fallback()` für einen früheren Mock,
nicht `continue()`, das zum echten Netzwerk führt.

Bei Mutationen unterscheide GET/PUT bzw. die tatsächlich vereinbarte Methode. Verifiziere
Payload, geschützte Originaldaten und Folgeansicht. Die Standard-Detail-Fixture liefert
ein Buch unabhängig von der Methode und simuliert deshalb allein keine Speicherung.
Nutze für Reload-/Navigationstests einen zustandsbehafteten Mock, der den geschriebenen
Datensatz anschließend zurückliefert. Ein Mock erzeugt keine UI und übernimmt keine
Geschäftslogik, die im Frontend implementiert sein soll.

Wähle Fälle nach den Kriterien: Normalfall und relevante Grenzen, Fehler mit erneuter
Aktion, leere Ergebnisse, laufende Anfrage, Navigation/Abbruch, Tastatur und Fokus.
Bei visuellen Änderungen zusätzlich mobile/weite Viewports und Light/Dark prüfen;
Screenshots bei Bedarf ansehen. Bei Animationen Reduced Motion berücksichtigen.
Nicht jedes Feature braucht jede dieser Fallklassen.

Beispiel für die Form eines Tests, nur bei einem entsprechenden Editierauftrag verwenden:

```typescript
import { expect, firstBook, test } from './fixtures/books';

test('AC-1 / Editor per Tastatur öffnen', async ({ page }) => {
  await page.goto(`/books/${firstBook.id}`);
  const edit = page.getByRole('button', { name: 'Edit book', exact: true });
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Edit book', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title *', { exact: true })).toBeFocused();
});
```

Dieser Ablauf ist bereits abgedeckt: nicht als neuen Test kopieren. Neue Tests müssen
das neue Verhalten prüfen; nutze das Beispiel nur als Muster für Fixture und Locators.

## Kommandos und Auswertung

Vom Repository-Root aus, mit lokal installierten Werkzeugen:

Prüfe vorher den in `ARCHITECTURE.md` dokumentierten Browser-Cache unter
`tmp/playwright-browsers`. Wenn dieser Cache verwendet wird, setze in derselben
PowerShell-Sitzung vor den Testkommandos:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'tmp/playwright-browsers'
```

Setze diesen Pfad nur bei vorhandenem Cache; überschreibe keine absichtlich anders
konfigurierte Browserumgebung. Eine fehlende Installation ist kein fachlicher Testfehler.

```powershell
# Beispiel: Auswahl an das Feature anpassen, zunächst Discovery und gezieltes Red/Green.
npx playwright test tests/book-edit.spec.ts --list
npx playwright test tests/book-edit.spec.ts --project=chromium

# Abschließend alle Anwendungs-Suites, einschließlich neuer Feature-Dateien.
npx playwright test tests/book-details.spec.ts tests/book-list.spec.ts tests/book-edit.spec.ts tests/book-filters.spec.ts tests/book-roulette.spec.ts tests/bookshelf.spec.ts tests/theme.spec.ts

node node_modules/@angular/cli/bin/ng.js build --configuration development
npm run build

# Platzhalter durch ausschließlich tatsächlich geänderte Dateien ersetzen.
npx prettier --check <changed-files>
git diff --check
```

Die Regression ohne `--project` nutzt alle drei konfigurierten Browser. Bei neuen Tests
zuerst deren Discovery prüfen, danach zur finalen Dateiauswahl hinzufügen. Keinen ungezielten
Demo-Lauf als Ersatz verwenden. Formatiere ausschließlich geänderte Dateien.

Prüfe Exitcode, ausgeführte Testnamen, Browser, unerwartete Retries/Flakiness und
Assertions. Null gefundene Tests, `.skip`, `.only`, `test.fail()` oder gelockerte Erwartungen
sind kein Nachweis des Features. Produktionsbuild und Entwicklungsbuild getrennt melden;
ein erfolgreicher Entwicklungsbuild hebt einen Produktionsfehler nicht auf.

Bei fehlenden Browsern, Server-/Portproblemen, Sandbox- oder Netzwerkfehlern den konkreten
Blocker und betroffene Prüfungen melden. Nicht wiederholt denselben unveränderten Blocker
anlaufen, keine fremden Prozesse stoppen und Schutzmechanismen nicht umgehen.
Prüfe bei wiederverwendetem Server, ob er tatsächlich dieses Projekt und die benötigte
Konfiguration bedient. Andere mögliche Prüfungen fortsetzen. Behaupte bei Infrastrukturfehlern
weder fachliches Red noch vollständig verifiziertes Green.

Ergebnismapping im Plan oder Abschlussbericht:

| Kriterium / Szenario | Datei und Testtitel | Kommando / Browser | Ergebnis / Grenze |
| -------------------- | ------------------- | ------------------ | ----------------- |

Wesentliche Fehlerausgaben konkret benennen. Live-API, echte Persistenz im Backend und
vollständige Barrierefreiheit bleiben ohne entsprechende weitere Prüfung unbestätigt.
