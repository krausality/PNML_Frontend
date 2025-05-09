⚠️ Hinweis: Dieses Repository ist ein Fork des Projekts "fapra-teamrot", das derzeit keine Lizenzdatei enthält. Eine Anfrage zur Nutzung und Weiterentwicklung wurde an die ursprünglichen Urheber gestellt. Dieses Repository dient ausschließlich nicht-kommerziellen Forschungszwecken.
GitHub-Repository: [https://github.com/fapra-teamrot/fapra-teamrot](https://github.com/fapra-teamrot/fapra-teamrot)

# ✅ Angular 16 Development Setup on Windows 11 & Linux/WSL  
**From a blank system to a successful `ng serve` run**

---

## 🧱 Prerequisites

- Windows 10/11 or Linux (Ubuntu/Debian recommended) or WSL2
- Terminal: PowerShell, CMD, or Bash
- Internet connection
- Access to an Angular 16 project (e.g., via Git or ZIP)

---

## 1️⃣ Install Node.js (using `fnm`)

> `fnm` = Fast Node Manager, for flexible Node versions

**Windows:**
```powershell
winget install Schniz.fnm
fnm install 18
```

**Linux/WSL:**
```bash
sudo apt update && sudo apt install unzip -y
curl -fsSL https://fnm.vercel.app/install | bash
# Restart your shell or run the eval command printed by the installer
fnm install 18
```

Then test:

```bash
# Verify the Node.js version:
node -v # Should print "v18.20.8".

# Verify npm version:
npm -v # Should print "10.8.2".
```

---

## 2️⃣ Install Angular CLI 16 globally

```bash
npm install -g @angular/cli@16
```

> You can ignore warnings about outdated packages – that's normal.

---

## 3️⃣ Prepare the project

Clone repo into folder:

```bash
git clone https://github.com/krausality/PNML_Frontend.git
```

Navigate to the repo folder:

```bash
cd PNML_Frontend
# or, if you cloned elsewhere:
cd /path/to/PNML_Frontend
```

Then:

```bash
npm install
```

> This downloads all dependencies from `package.json`.

---

## 4️⃣ Start Angular Dev Server

```bash
ng serve --open
```

> On Windows, this will open `http://localhost:4200/` in your default browser.  
> On Linux/WSL, it will print the URL; open it manually if it doesn't launch automatically.

---

## 5️⃣ Work around PowerShell Policy Bug (Windows only)

If `ng` doesn't run due to script blocking:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

> Alternatively: Just switch to `cmd.exe` or `Windows Terminal` (works without issues):

```powershell
cmd
```

> **Linux/WSL:** No action needed.

---

## 6️⃣ Possible Warnings & Notes

### ❗ **Webpack error due to missing `stream` module**

If you need a Node module that uses `stream`:

```bash
npm install stream-browserify
```

And add to your `angular.json` or `webpack.config.js` (if present):

```js
resolve: {
  fallback: {
    stream: require.resolve("stream-browserify")
  }
}
```

Or if you **don't need** the module:

```js
resolve: {
  fallback: {
    stream: false
  }
}
```

---

### 🎨 **Angular Material Theme Warning**

> If you use Angular Material, make sure your theme is configured correctly:

```scss
// Example theme definition:
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

More info: [Material theming guide](https://material.angular.io/guide/theming)

---

## ✅ Result

If you did everything right, you'll see in the terminal:

```bash
** Angular Live Development Server is listening on localhost:4200 **
√ Compiled successfully.
```

Then: 🎉 **App is running in the browser!**

---


The project includes the following libraries:

### Angular Material

Contains components for user interfaces. The [documentation](https://material.angular.io/components/categories) includes many code examples.

### Angular Material Icons

Allows you to use all Material icons via the `<mat-icon>` component.
* [Documentation](https://material.angular.io/components/icon/overview)
* [List of icons](https://fonts.google.com/icons)

### Angular Flex Layout

Simplifies working with CSS `flex-box` properties.
* [Demo](https://tburleson-layouts-demos.firebaseapp.com/#/docs)

### RxJs

Simplifies handling of asynchronously occurring events.
* [Documentation](https://rxjs.dev/guide/overview)

## Petri Net File Format

You can find an example .json Petri net file in the `assets` folder - [src/assets/example.json](./src/assets/example.json)

The project also includes three reference models that contain the same Petri net in other formats. All reference files are located under [src/reference-models](./src/reference-models). You can open the files with the following tools:
* ILPN file - the [I ❤ Petri Nets](https://www.fernuni-hagen.de/ilovepetrinets/petrinets/index.html) website
* WoPeD file - the [Workflow Petri Net Designer](https://woped.dhbw-karlsruhe.de/?page_id=22)
* Petriflow file - the [Netgrif Application Builder](https://builder.netgrif.com/modeler)
