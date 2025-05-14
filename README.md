⚠️ Hinweis: Dieses Repository ist ein Fork des Projekts "fapra-teamrot", das derzeit keine Lizenzdatei enthält. Eine Anfrage zur Nutzung und Weiterentwicklung wurde an die ursprünglichen Urheber gestellt. Dieses Repository dient ausschließlich nicht-kommerziellen Forschungszwecken.
GitHub-Repository: [https://github.com/fapra-teamrot/fapra-teamrot](https://github.com/fapra-teamrot/fapra-teamrot)

# ✅ Angular 16 Development Setup on Windows 11 & Linux/WSL  
**From a blank system to a successful `ng serve` run**

---

## 🚀 Quick Install & Quick Start

For users looking for the fastest way to get the PNML Frontend running, follow these steps. These commands will download the project, set up the necessary tools, and start the application.

1.  **Download the Project Code:**
    This command copies the project files to your computer.
    ```bash
    git clone https://github.com/krausality/PNML_Frontend.git
    cd PNML_Frontend
    ```
2.  **Set Up the Right Environment:**
    This step ensures your system is ready to run the project. If you're doing this for the first time, the detailed guide below has more information.
    ```bash
    # This command selects the correct version of the runtime environment.
    fnm use 18 
    node -v # This checks if the correct version is active.
    ```
    *For a first-time setup of the runtime environment, see the [Detailed Node.js Installation](#1%EF%B8%8F%E2%83%A3-install-nodejs-using-fnm) section further down.*

3.  **Install a Tool to Manage the Project:**
    (You can skip this if you've run this or a similar project before)
    This command installs a helper tool needed to build and run the application.
    ```bash
    npm install -g @angular/cli@16
    ```
4.  **Install Project-Specific Components:**
    This command downloads all the additional pieces of software the project needs to work.
    ```bash
    npm install
    ```
5.  **Start the Application:**
    This command starts the PNML tool and opens it in your web browser.
    ```bash
    ng serve --open
    ```
This will open the PNML tool in your browser, usually at `http://localhost:4200/`.

For a comprehensive step-by-step guide, especially if you're setting up a new environment, please proceed to the [📖 Detailed Setup Guide](#%F0%9F%93%96-detailed-setup-guide).

---

## 📖 Detailed Setup Guide

### 🧱 Prerequisites

- Windows 10/11 or Linux (Ubuntu/Debian recommended) or WSL2
- Terminal: PowerShell, CMD, or Bash
- Internet connection
- Access to an Angular 16 project (e.g., via Git or ZIP)

---

### 1️⃣ Install Node.js (using `fnm`)

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

### 2️⃣ Install Angular CLI 16 globally

```bash
npm install -g @angular/cli@16
```

> You can ignore warnings about outdated packages – that's normal.

---

### 3️⃣ Prepare the project

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

> This downloads all project dependencies listed in the `package.json` file, which are necessary to run the application.

---

### 4️⃣ Start the PNML Tool (Frontend Development Server)

This command starts the PNML (Petri Net Markup Language) visualizer and editor tool's frontend development server. It will compile the Angular application and automatically open it in your default web browser (usually at `http://localhost:4200/`).

**What the tool does:**
The PNML tool allows you to create, visualize, edit, and simulate Petri nets. You can import existing PNML or JSON files, modify the nets using a graphical interface, and analyze their behavior. The simulation parameters section allows you to configure and run simulations based on the designed Petri net.

Once started, you can use the tool to:
*   Design Petri nets from scratch.
*   Import and export Petri nets in PNML and JSON formats.
*   Visually edit places, transitions, and arcs.
*   Configure simulation parameters.
*   Run simulations and observe the token game.
*   Analyze properties of the Petri net.

```bash
ng serve --open
```

> On Windows, this will open `http://localhost:4200/` in your default browser.  \  
> On Linux/WSL, it will print the URL; open it manually if it doesn't launch automatically.

---

### ✅ Expected Result

If you did everything right, you'll see in the terminal:

```bash
** Angular Live Development Server is listening on localhost:4200 **
√ Compiled successfully.
```

Then: 🎉 **App is running in the browser!**

---

## 🛠️ Troubleshooting & Advanced

### Windows PowerShell Execution Policy

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

### Webpack: `stream` module error

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

### Angular Material: Theme Warning

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

### 🛠 Quick Debug FAQ (PowerShell + fnm + npm)

### `npm` or `node` not recognized?

You probably installed Node with `fnm`, but your shell isn't initialized properly yet.

### Quick fix (per session):

```powershell
# Auto-initialize fnm and Node.js
fnm env --shell=powershell | Out-String | Invoke-Expression
fnm use 18
```

Then verify:

```powershell
npm -v
node -v
```

---

### Why did it work before and now it doesn’t?

* You probably had the `fnm` initialization in your PowerShell profile.
* A recent system or shell reset (or using a different terminal) may have removed that setup.

---

### Permanent fix:

1. Open your PowerShell profile:

   ```powershell
   notepad $PROFILE
   ```
1.1. When getting 'file not found' using Command from 1.:
    ```powershell
    New-Item -ItemType File -Path $PROFILE -Force
    ```

2. Add this at the bottom:

   ```powershell
   # Auto-initialize fnm and Node.js
   fnm env --shell=powershell | Out-String | Invoke-Expression
   fnm use 18
   ```

3. Save and restart PowerShell.

---

### Still not working?

Make sure `fnm` is installed:

```powershell
fnm --version
```

Reinstall if needed:

```powershell
winget install Schniz.fnm
```

---

## ℹ️ Project & Libraries

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
