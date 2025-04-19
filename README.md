# ✅ Angular 16 Development Setup auf Windows 11  
**Von leerem System bis `ng serve` erfolgreich läuft**

---

## 🧱 Voraussetzungen

- Windows 11
- Terminal: PowerShell oder CMD
- Internetverbindung
- Zugriff auf ein Angular 16 Projekt (z. B. via Git oder ZIP)

---

## 1️⃣ Node.js installieren (über `fnm`)

> `fnm` = Fast Node Manager, für flexible Node-Versionen

```powershell
winget install Schniz.fnm
fnm install 18
```

Danach testen:

```powershell
# Verify the Node.js version:
node -v # Should print "v18.20.8".

# Verify npm version:
npm -v # Should print "10.8.2".
```

---

## 2️⃣ Angular CLI 16 global installieren

```powershell
npm install -g @angular/cli@16
```

> Warnings bzgl. veralteter Pakete kannst du ignorieren – ist normal.

---

## 3️⃣ Projekt vorbereiten

Clone repo into folder:

```powershell
git clone https://github.com/krausality/PNML_Frontend.git
```

Navigiere zum Repo-ordner:

```powershell
cd C:\GITHUB\PNML_Frontend
```

Dann:

```powershell
npm install
```

> Das lädt alle Abhängigkeiten aus `package.json`.

---

## 4️⃣ Angular Dev-Server starten

```powershell
cmd /c "ng serve --open"

```

oder

```powershell
ng serve --open
```

> Öffnet automatisch `http://localhost:4200/` im Browser.

---

## 5️⃣ PowerShell Policy Bug umgehen

Wenn `ng` nicht läuft wegen Skript-Blockierung:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

> Alternativ: Wechsel einfach zu `cmd.exe` oder `Windows Terminal` (funktioniert ohne Probleme):

```powershell
cmd
```

---



## 6️⃣ Mögliche Warnungen & Hinweise

### ❗ **Webpack-Fehler wegen fehlender `stream`-Module**

Falls du ein Node-Modul brauchst, das `stream` verwendet:

```bash
npm install stream-browserify
```

Und ergänze in deiner `angular.json` oder `webpack.config.js` (falls vorhanden):

```js
resolve: {
  fallback: {
    stream: require.resolve("stream-browserify")
  }
}
```

Oder wenn du das Modul **nicht brauchst**:

```js
resolve: {
  fallback: {
    stream: false
  }
}
```

---

### 🎨 **Angular Material Theme Warning**

> Falls du Angular Material verwendest, achte darauf, dass dein Theme korrekt konfiguriert ist:

```scss
// Beispielhafte Theme-Definition:
$my-theme: mat.define-light-theme((
  color: (
    primary: mat.define-palette(mat.$indigo-palette),
    accent: mat.define-palette(mat.$pink-palette),
    warn: mat.define-palette(mat.$red-palette),
  ),
  typography: mat.define-typography-config(),
  density: 0,
));
```

Mehr dazu: [Material theming guide](https://material.angular.io/guide/theming)

---

## ✅ Ergebnis

Wenn du alles richtig gemacht hast, siehst du im Terminal:

```bash
** Angular Live Development Server is listening on localhost:4200 **
√ Compiled successfully.
```

Dann: 🎉 **App läuft im Browser!**

---

Wenn du magst, kann ich dir noch ein Skript basteln, das das alles halbautomatisch ausführt (z. B. für frische Maschinen oder neue Devs im Team). Sag einfach Bescheid!
---

# Old README

## Umgebung

Um den Codegerüst zum Laufen zu bringen, muss man `Node.js` und `npm` installieren. Das Projekt basiert auf Angular 16.

Die Liste von kompatiblen Versionen findet man [hier](https://angular.io/guide/versions). Offizielle Angular Anweisungen zur Entwicklungsumgebung findet man [hier](https://angular.io/guide/setup-local).

## Bibliotheken

Das Projekt enthält die folgenden Bibliotheken:

### Angular Material

Enthält Komponenten für Benutzeroberflächen. Die [Dokumentation](https://material.angular.io/components/categories) enthält viele Codebeispiele.

### Angular Material Icons

Ermöglicht durch die `<mat-icon>` Komponente alle Material Ikonen zu nutzen.
* [Dokumentation](https://material.angular.io/components/icon/overview)
* [Liste von Ikonen](https://fonts.google.com/icons)

### Angular Flex Layout

Vereinfacht die Arbeit mit CSS `flex-box` Eigenschaften.
* [Demo](https://tburleson-layouts-demos.firebaseapp.com/#/docs)

### RxJs

Vereinfacht die Verarbeitung von asynchron auftauchenden Ereignissen. 
* [Dokumentation](https://rxjs.dev/guide/overview)

## Petri-Netz Dateiformat

Sie finden ein Beispiel .json Petri-Netz Datei in dem `assets` Ordner - [src/assets/example.json](./src/assets/example.json)

Das Projekt enthält auch drei Referenzmodelle die dasselbe Petri-Netz in anderen Formaten enthalten. Alle Referenzdateien befinden sich unter [src/reference-models](./src/reference-models). Die Dateien kann man mit folgenden Tools öffnen:
* ILPN Datei - die [I ❤ Petri Nets](https://www.fernuni-hagen.de/ilovepetrinets/petrinets/index.html) Webseite
* WoPeD Datei - das [Workflow Petri Net Designer](https://woped.dhbw-karlsruhe.de/?page_id=22)
* Petriflow Datei - das [Netgrif Application Builder](https://builder.netgrif.com/modeler)
