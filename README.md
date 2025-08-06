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

For a comprehensive step-by-step guide, especially if you're setting up a new environment, please proceed to the [📖 Detailed Setup Guide](#📖-detailed-setup-guide).

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

If this does not work see: [🛠 Quick Debug FAQ (PowerShell + fnm + npm)](#🛠-quick-debug-faq-powershell--fnm--npm)



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

Absolutely! Here's your improved and extended **Quick Debug FAQ** in English, with a clearer **"Still not working?"** section and an explanation of the `--use-on-cd` feature as an alternative:

---

### 🛠 Quick Debug FAQ (PowerShell + fnm + npm)

### `npm` or `node` not recognized?

You probably installed Node.js with `fnm`, but your shell isn't initialized properly yet.

---

### Quick fix (per session):

```powershell
# Auto-initialize fnm and Node.js for this shell session only
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

* You likely had `fnm` initialization in your PowerShell profile.
* A Windows update, shell reset, or using a different terminal (e.g., new PowerShell version, VS Code terminal) may have cleared or skipped that setup.

---

### Permanent fix:

1. Open your PowerShell profile:

   ```powershell
   notepad $PROFILE
   ```

   > If you get "file not found", create it:

   ```powershell
   New-Item -ItemType File -Path $PROFILE -Force
   ```

2. Add this to the **bottom** of your profile:

   ```powershell
   # Auto-initialize fnm and Node.js
   fnm env --shell=powershell | Out-String | Invoke-Expression
   fnm use 18
   ```

3. Save and restart PowerShell.

---

### 🧩 Still not working?

Check the following:

* Is `fnm` installed?

  ```powershell
  fnm --version
  ```

* Is Node installed via `fnm`?

  ```powershell
  fnm list
  ```

* Did you install a specific Node version (e.g. `18`)?

  ```powershell
  fnm install 18
  ```

* Are you running PowerShell **as the same user** that installed `fnm`?

* Is your execution policy allowing profile scripts?
  Run this **once** (non-admin is fine):

  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

---

### 🧭 Alternative: Use version switching on directory change

Instead of hardcoding a version like `fnm use 18`, let `fnm` dynamically switch versions based on your project:

1. Enable automatic version switching by adding this to your profile:

   ```powershell
   fnm env --use-on-cd --shell=powershell | Out-String | Invoke-Expression
   ```

2. In each project directory, add a `.node-version` or `.nvmrc` file:

   ```bash
   echo 18 > .node-version
   ```

3. Now when you `cd` into that folder, `fnm` will auto-switch Node to the right version.

---

### 🧪 Test it all:

```powershell
cd path\to\project
node -v
```

It should reflect the version from `.node-version`.

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



----


## Deployment with Docker

This is the recommended way to run the application in a production-like environment.

**Beware** The following guide presupposes, that the backend `https://github.com/Peng-LUH/l3s-offshore-2` is already up-and-running AND reachable under the exact URL specified in the angular environment file called [environment.prod.ts](src\environments\environment.prod.ts#L6) - for a local running backend please change the aforementioned file according to your specific needs or simply use the [development server](#-quick-install--quick-start)

### Prerequisites

1.  **Install Docker:** Follow the official instructions for [installing Docker on Debian](https://docs.docker.com/engine/install/debian/).
2.  **Install Docker Compose:** Follow the instructions for the [Compose Standalone](https://docs.docker.com/compose/install/standalone/).
3.  **Clone this repository:** `git clone https://github.com/krausality/PNML_Frontend.git`
4.  Navigate into the project directory: `cd PNML_Frontend`


## Deployment using Dockercompose on Debian


### Method 1: Docker Compose (Recommended)

Docker Compose simplifies the management of building and running the container.

### **0. Add the following file to your project's root directory `./PNML_Frontend`:**

**File 1: `docker-compose.yml`**

```yaml
# docker-compose.yml


services:
  app:
    # Name of service
    container_name: pnml_frontend
    
    # Instruction to build the image from the Dockerfile in the current directory
    build: .
    
    # Name given to the built image
    image: pnml_frontend-app
    
    # Port mapping: Forwards port 4200 on the host (left) to port 4200 in the container (right)
    ports:
      - "4200:4200"
      
    # Restart policy: Automatically restarts the container if it crashes or the server restarts
    restart: unless-stopped
```


**1. Build and Run in Detached Mode:**

This command builds the Docker image (if not already built) and starts the container in the background.

```bash
docker compose up --build -d
```

**2. Check the Status:**

See if your container is running correctly.

```bash
docker compose ps
```

You should see an output like this, with the status `running`:
```
NAME                IMAGE               COMMAND                  SERVICE             CREATED             STATUS              PORTS
pnml_frontend-app-1 pnml_frontend-app   "/docker-entrypoint.…"   app                 5 seconds ago       running             0.0.0.0:4200->80/tcp
```

**3. Access the Application:**

Open your web browser and navigate to `http://localhost:4200` (or `http://<your-server-ip>:4200` if running on a remote server).

**4. Stop the Application:**

To stop the container, run the following command in the project directory:

```bash
docker compose down
```
This will stop and remove the container.


### Method 2: Manual Docker Build

If you prefer not to use Docker Compose, you can build and run the container manually.

**1. Build the Docker Image:**

This command creates a production-ready image named `pnml_frontend`.

```bash
docker build -t pnml_frontend .
```

**2. Run the Container:**

This command starts the container in the background (`-d`) and maps port 4200 on your machine to port 80 inside the container. The container is automatically removed when stopped (`--rm`).




**Choose 3.1. (debugging) or 3.2. (production)**

**3.1. Serve container on port 4200 inside current shell, exit via ctrl+c**
```bash
docker run --rm --name pnml_frontend -p 4200:4200  pnml_frontend
```


**3.2. Serve container on port 4200 detached from shell. Control container using 4./5./6.**
```bash
docker run -d --rm --name pnml_frontend -p 4200:4200 pnml_frontend
```

**4. Show running container**
```bash
docker ps
```
Outputs something like:

```bash
$ docker ps
CONTAINER ID   IMAGE                                  COMMAND                  CREATED         STATUS         PORTS                                                 NAMES
7903b21cb31c   pnml_frontend                                 "/docker-entrypoint._"   5 seconds ago   Up 4 seconds   80/tcp, 0.0.0.0:4200->4200/tcp, [::]:4200->4200/tcp   pnml_frontend
```

**5. Stop container (Using container ID as parameter from 4.)**
```
```bash
docker stop 7903b21cb31c
```

**6. Remove container**
ONLY if -rm flag was NOT used, then this step is required to avoid name collision IF a new run with same named `pnml_frontend` container is started

```bash
docker rm 7903b21cb31c
```


Of course. This is a very common and robust workflow for deploying applications. It separates the building process (which can be resource-intensive) from the deployment process (which should be lightweight).

Here is the new guide written in English, designed to be added to your `README.md`. It builds upon your existing Docker Compose section and explains the entire build -> push -> pull -> run lifecycle. I will also provide the necessary `docker-compose.yml` and `docker-compose.prod.yml` files.

---

### **1. Add the following files to your project's root directory:**

You will need two `docker-compose` files: one for building locally and one for running on the server. This separation is a best practice.

**File 1: `docker-compose.yml` (For your local machine)**
This file is used to build the image and push it to the registry.

```yaml
# docker-compose.yml


services:
  app:
    # The full image name for the container registry.
    # IMPORTANT: Replace YOUR_GITHUB_USERNAME and YOUR_REPO_NAME with your actual details.
    image: ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:latest
    
    # Specifies that the image should be built from the Dockerfile in the current directory.
    build: .
    
    # You can optionally add a container name for local testing.
    container_name: pnml_frontend_builder
```

**File 2: `docker-compose.prod.yml` (For your server)**
This file is used only to pull and run the pre-built image on your server. It does **not** contain a `build` section.

```yaml
# docker-compose.prod.yml


services:
  app:
    # The full image name to pull from the container registry.
    # IMPORTANT: This must match the image name in the other docker-compose.yml file.
    image: ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:latest
    
    container_name: pnml_frontend
    
    # Maps port 4200 on the server (left) to port 4200 inside the container (right).
    ports:
      - "4200:4200"
      
    # Ensures the container restarts automatically if it crashes or the server reboots.
    restart: unless-stopped
```

---


### Method 3: Deployment via a Container Registry (CI/CD Workflow)

This method is ideal for a professional workflow where the application is built on one machine (e.g., your local computer or a CI/CD server) and run on another (your production server). This ensures that you are deploying a consistent, pre-tested artifact.

We will use the GitHub Container Registry (`ghcr.io`) for this guide.

#### Prerequisites

*   You have created a **GitHub Personal Access Token (PAT)** with the following scopes:
    *   `write:packages` - to push the image.
    *   `read:packages` - to pull the image.
*   You have copied the `docker-compose.prod.yml` file to your production server.

---

#### **Part 1: On Your Local Machine (Build & Push)**

**1. Log in to GitHub Container Registry**

You only need to do this once per machine. Use your GitHub username and the Personal Access Token you created as the password.

```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
```
When prompted for a password, paste your Personal Access Token.

**2. Build the Docker Image**

This command uses the `docker-compose.yml` file to build your production-ready image. It will read the `image` name from the file and tag the built image accordingly.

```bash
docker compose build
```

**3. Push the Image to the Registry**

Now, push the tagged image to `ghcr.io`.

```bash
docker compose push
```
You can now go to your GitHub repository's "Packages" section to see your published container image.

---

#### **Part 2: On Your Production Server (Pull & Run)**

**1. Log in to GitHub Container Registry**

Just like on your local machine, your server needs to authenticate to be able to pull the private image.

```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
```
Again, use your PAT as the password. A token with only `read:packages` permissions is recommended for servers for better security.

**2. Pull the Latest Image**

Before starting, pull the latest version of your image that you just pushed. We use the `-f` flag to specify our production compose file.

```bash
docker compose -f docker-compose.prod.yml pull
```

**3. Run the Application**

Start the container using the pulled image. The `-d` flag runs it in detached mode (in the background).

```bash
docker compose -f docker-compose.prod.yml up -d
```

**4. Check the Status**

```bash
docker compose -f docker-compose.prod.yml ps
```
The status should be `running`. You can now access the application at `http://<your-server-ip>:4200`.

---

#### **Part 3: Managing the Application on the Server**

**Updating the Application**

To deploy a new version, simply repeat the steps:
1.  **On your local machine:** `docker compose build` and then `docker compose push`.
2.  **On your server:** `docker compose -f docker-compose.prod.yml pull` and then `docker compose -f docker-compose.prod.yml up -d`. Docker Compose will automatically stop the old container and start a new one with the updated image.

**Stopping the Application**

To stop and remove the container on the server:

```bash
docker compose -f docker-compose.prod.yml down
```
