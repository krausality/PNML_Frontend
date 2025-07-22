 suche und lade alle der folgenden dateien in das contexwindow.  

```Files
#### **Tier 1: Kerndateien zur aktiven Bearbeitung (Unverändert)**
*   `src/app/tr-components/button-bar/button-bar.component.ts`
*   `src/app/tr-components/button-bar/button-bar.component.html`
*   `src/app/tr-services/ui.service.ts`

#### **Tier 2: Direkte Abhängigkeiten (Erweitert)**
*   `src/app/tr-services/planning.service.ts`
*   `src/app/tr-services/data.service.ts`
*   `src/app/tr-services/pnml.service.ts`
*   `src/app/tr-enums/ui-state.ts`
*   `src/app/tr-components/error-popup/error-popup.component.ts`
*   `src/app/tr-interfaces/dialog/error-dialog-data.ts`
*   `src/app/tr-services/position.constants.ts` *(Neu hinzugefügt)*
*   `src/app/tr-classes/petri-net/place.ts` *(Neu hinzugefügt)*
*   `src/app/tr-classes/petri-net/transition.ts` *(Neu hinzugefügt)*
*   `src/app/tr-classes/petri-net/arc.ts` *(Neu hinzugefügt)*
*   `src/app/tr-interfaces/petri-net/node.ts` *(Neu hinzugefügt)*

#### **Tier 3: Essentielles Anwendungsgerüst (Unverändert)**
*   `package.json`
*   `angular.json`
*   `tsconfig.json` (Wichtig für Pfad-Mappings und Compiler-Optionen)
*   `src/main.ts`
*   `src/app/app.module.ts` (Importiert alle Komponenten und das `FormsModule`)
*   `src/app/app.component.html`
*   `src/app/app.component.ts`

```


----

Nechster Schritt:

Folgende feature liste existiert:
```feature
Geplante Aufgaben:
*   Frontend (Simulation UX - Part 1): Aufteilung des "Run & Download"-Buttons im "Analyze"-Tab in separate "Run"- und "Download"-Funktionen; Implementierung einer temporären Speicherung der Simulationsergebnisse im Frontend - geplante Zeit: 8h
*   Frontend (Simulation UX - Part 2): Implementierung der Anzeige für Feuerungshäufigkeit. Nach einer Multi-Run-Simulation soll bei Klick auf eine Transition ein Pop-up mit der Anzahl der Feuerungen erscheinen - geplante Zeit: 8h
```


Wir wollen nur `Frontend (Simulation UX - Part 1): Aufteilung des "Run & Download"-Buttons im "Analyze"-Tab in separate "Run"- und "Download"-Funktionen; Implementierung einer temporären Speicherung der Simulationsergebnisse im Frontend - geplante Zeit: 8h`

umsetzten.

Dafuer existiert folgender Plan:

```Plan

# Q1A2

Absolut. Als +5 Sigma Angular-Entwickler präsentiere ich hier einen detaillierten Plan. Zuerst das Mental Model, basierend auf den relevanten Code-Dateien.

### Relevante Files für die Aufgabe

Die Kernlogik für die bestehende "Run & Download"-Funktionalität ist in den folgenden Dateien konzentriert:

1.  **`src/app/tr-components/button-bar/button-bar.component.html`**: Definiert die Benutzeroberfläche, einschließlich des "Run & Download"-Buttons und des Eingabefeldes für die Anzahl der Läufe im "Analyze"-Tab. Hier müssen die UI-Änderungen vorgenommen werden.
2.  **`src/app/tr-components/button-bar/button-bar.component.ts`**: Enthält die Event-Handler-Logik. Die Methode `runMultiSimulation()` ist der Einstiegspunkt, die `executeMultipleSimulationRuns()` führt die Simulationen aus und `downloadSimulationResults()` erstellt die Download-Datei. Diese Datei muss maßgeblich umgebaut werden.
3.  **`src/app/tr-services/planning.service.ts`**: Dieser Service kapselt die HTTP-Kommunikation mit dem Backend. Die Methode `runSimpleSimulationFromString()` wird verwendet, um die Simulationen durchzuführen. Dieser Service wird weiterhin genutzt, aber nicht direkt verändert.
4.  **`src/app/tr-services/data.service.ts`** & **`src/app/tr-services/pnml.service.ts`**: Diese Services werden von der `ButtonBarComponent` genutzt, um zu prüfen, ob ein Netz geladen ist (`dataService.isEmpty()`) und um das aktuelle Netz als PNML-String zu serialisieren (`pnmlService.getPNML()`).
5.  **`src/app/tr-services/ui.service.ts`**: Dies ist der zentrale Service für globalen UI-Zustand. Er ist der ideale Kandidat, um die Simulationsergebnisse temporär zu speichern und den Zustand (z.B. "Simulaton läuft") an andere Komponenten zu kommunizieren.

---

### Mental Model: Funktionsweise des Codes (PART 1)

**Ausgangszustand: "Run & Download" im "Analyze"-Tab**

1.  **Trigger (UI):** Der Benutzer befindet sich im "Analyze"-Tab. Er gibt eine Anzahl von Simulationsläufen in ein `<input>`-Feld ein und klickt auf den Button "Run & Download". Die UI hierfür ist in `button-bar.component.html` definiert.

2.  **Event Handling (`button-bar.component.ts`):**
    *   Der Klick ruft die Methode `runMultiSimulation()` auf.
    *   Diese Methode prüft zuerst mit `dataService.isEmpty()`, ob überhaupt ein Petrinetz geladen ist.
    *   Anschließend wird mit `pnmlService.getPNML()` das aktuell im `DataService` gehaltene Modell in einen PNML-String serialisiert.
    *   Der PNML-String wird an die Methode `executeMultipleSimulationRuns()` übergeben.

3.  **Simulations-Orchestrierung (Workaround in `button-bar.component.ts`):**
    *   Die Methode `executeMultipleSimulationRuns()` implementiert einen *Workaround*, da das Backend keine Multi-Run-Simulationen nativ unterstützt. Sie initiiert eine Schleife, die `this.numberOfSimulations`-mal durchlaufen wird.
    *   In jeder Iteration ruft sie `planningService.runSimpleSimulationFromString()` auf. Dies ist ein asynchroner Aufruf, der ein Observable zurückgibt. Die Methode ist so implementiert, dass sie die Aufrufe **sequenziell** ausführt, um das Backend nicht zu überlasten.
    *   Die Ergebnisse jedes einzelnen Laufs werden in einem lokalen Array `allResults` gesammelt.

4.  **Backend-Kommunikation (`planning.service.ts`):**
    *   Der `planningService` nimmt den PNML-String entgegen, verpackt ihn in ein `FormData`-Objekt (simuliert also einen Datei-Upload) und sendet ihn per POST-Request an den Backend-Endpunkt `/simulation-petri-nets/simple-sim`.
    *   Der Service wartet auf die JSON-Antwort vom Backend, die die Simulationsergebnisse für diesen einen Lauf enthält.

5.  **Ergebnisverarbeitung und Download (`button-bar.component.ts`):**
    *   Nachdem alle sequenziellen Aufrufe erfolgreich waren, formatiert `executeMultipleSimulationRuns` die gesammelten Ergebnisse in eine `multiRunResults`-Struktur.
    *   Diese Struktur wird an die Methode `downloadSimulationResults()` übergeben.
    *   `downloadSimulationResults()` wandelt das Ergebnisobjekt in einen JSON-String um (`JSON.stringify`).
    *   Aus dem String wird ein `Blob` vom Typ `application/json` erzeugt.
    *   Ein temporäres `<a>`-Element wird im DOM erstellt. Dessen `href` wird auf eine `URL.createObjectURL()` des Blobs gesetzt und das `download`-Attribut wird mit einem generierten Dateinamen versehen.
    *   Ein Klick auf dieses `<a>`-Element wird programmatisch ausgelöst, was den Browser-Download-Dialog startet.
    *   Der gesamte Prozess ist atomar: Klick -> Simulation -> Download. Die Ergebnisse werden **nirgendwo im Frontend-State persistiert**, sondern leben nur als lokale Variable während der Ausführung von `executeMultipleSimulationRuns`.

**Fazit des Mental Models:** Die Kernaufgabe besteht darin, den atomaren Prozess aufzubrechen. Der Zustand der Simulationsergebnisse, der bisher nur temporär in einer Methode existierte, muss in einen gemeinsam genutzten Service (`UiService`) ausgelagert werden, damit eine neue, separate "Download"-Funktion darauf zugreifen kann.

---

### Vollständiger, kleinschrittiger Plan zur Umsetzung (PART 1)

#### Schritt 1: UI-Anpassungen in `button-bar.component.html`

1.  **Button umbenennen:** Suchen Sie den Button mit dem `(click)`-Handler `runMultiSimulation()` im Analyze-Tab. Ändern Sie den Text von "Run & Download" zu "Run Simulation".
    ```html
    <!-- VORHER -->
    <button ... (click)="runMultiSimulation()">
        <mat-icon>play_arrow</mat-icon>
        Run & Download
    </button>

    <!-- NACHHER -->
    <button ... (click)="runAndStoreMultiSimulation()" [disabled]="isMultiRunInProgress">
        <mat-progress-spinner *ngIf="isMultiRunInProgress" mode="indeterminate" diameter="18" ...></mat-progress-spinner>
        <mat-icon *ngIf="!isMultiRunInProgress">play_arrow</mat-icon>
        <span *ngIf="!isMultiRunInProgress">Run Simulation</span>
        <span *ngIf="isMultiRunInProgress">Running...</span>
    </button>
    ```

2.  **Neuen Button hinzufügen:** Fügen Sie direkt daneben einen neuen Button "Download Results" hinzu. Dieser sollte initial deaktiviert sein.
    ```html
    <button
        mat-stroked-button
        class="text-button"
        (click)="downloadResults()"
        [disabled]="!hasMultiRunResults"
        matTooltip="Download the results of the last multi-run simulation."
        [matTooltipShowDelay]="showTooltipDelay"
    >
        <mat-icon>download</mat-icon>
        Download Results
    </button>
    ```

#### Schritt 2: Zustandsspeicherung im `UiService` implementieren

1.  **Öffnen Sie `src/app/tr-services/ui.service.ts`**.
2.  **Fügen Sie einen neuen `BehaviorSubject` hinzu**, um die Ergebnisse der Multi-Run-Simulation zu speichern.
    ```typescript
    // ... bestehende Subjects ...
    private _simulationResultsMultiRun$ = new BehaviorSubject<any | null>(null);
    public simulationResultsMultiRun$ = this._simulationResultsMultiRun$.asObservable();
    ```
3.  **Erstellen Sie eine öffentliche Methode**, um die Ergebnisse zu setzen und abzurufen.
    ```typescript
    public setMultiRunResults(results: any): void {
        this._simulationResultsMultiRun$.next(results);
    }

    public getMultiRunResults(): any {
        return this._simulationResultsMultiRun$.getValue();
    }
    ```

#### Schritt 3: Logik in `button-bar.component.ts` anpassen

1.  **Neue Member-Variablen hinzufügen:**
    ```typescript
    public isMultiRunInProgress = false;
    public hasMultiRunResults = false;
    private resultsSubscription: Subscription;
    ```

2.  **Im `ngOnInit` den neuen State abonnieren:**
    ```typescript
    ngOnInit(): void {
        // ... bestehender Code ...
        this.resultsSubscription = this.uiService.simulationResultsMultiRun$.subscribe(results => {
            this.hasMultiRunResults = !!results; // true wenn results nicht null/undefined, sonst false
        });
    }

    ngOnDestroy(): void {
        // ... bestehender Code ...
        if (this.resultsSubscription) {
            this.resultsSubscription.unsubscribe();
        }
    }
    ```

3.  **`runMultiSimulation()` umbenennen und anpassen:**
    *   Benennen Sie `runMultiSimulation` in `runAndStoreMultiSimulation` um.
    *   Passen Sie den `(click)`-Handler im HTML an.
    *   Setzen Sie am Anfang der Methode `this.isMultiRunInProgress = true;`.
    *   Rufen Sie am Ende von `executeMultipleSimulationRuns` (im Erfolgsfall) `this.uiService.setMultiRunResults(multiRunResults)` anstelle von `this.downloadSimulationResults()` auf.
    *   Setzen Sie im `next` und `error` Callback von `executeMultipleSimulationRuns` die Variable `this.isMultiRunInProgress = false;`.

4.  **`executeMultipleSimulationRuns()` modifizieren:** Entfernen Sie den Aufruf von `this.downloadSimulationResults()` und ersetzen Sie ihn durch den Aufruf des `UiService`.
    ```typescript
    // In executeMultipleSimulationRuns, am Ende der Schleife im 'if (!hasError)' Block:
    if (!hasError) {
        console.log(`All ${this.numberOfSimulations} runs completed successfully`);
        const multiRunResults = { /* ... wie bisher ... */ };
        
        // --- NEU ---
        this.uiService.setMultiRunResults(multiRunResults);
        // Optional: UI-Feedback geben
        // this.showSnackbar('Simulation complete. Results are ready for download.');
        // -----------

        // --- ALT (ENTFERNEN) ---
        // this.downloadSimulationResults(multiRunResults, 'current_model.pnml');
    }
    ```
    Stellen Sie sicher, dass `isMultiRunInProgress` im `error`-Fall und nach erfolgreichem Abschluss auf `false` gesetzt wird.

#### Schritt 4: "Download Results" Funktionalität implementieren

1.  **Erstellen Sie die neue Methode `downloadResults()` in `button-bar.component.ts`:**
    ```typescript
    public downloadResults(): void {
        const results = this.uiService.getMultiRunResults();
        if (results) {
            // Die bestehende Logik wiederverwenden
            this.downloadSimulationResults(results, 'current_model.pnml');
        } else {
            // Sollte durch [disabled] nicht passieren, aber als Absicherung
            console.warn('Download clicked, but no results available.');
            // Optional: Zeige eine Fehlermeldung
            this.openErrorDialog('No simulation results available to download. Please run a simulation first.');
        }
    }
    ```
    Die Methode `downloadSimulationResults` kann unverändert bleiben, da sie bereits die Logik zum Erstellen und Herunterladen der Datei enthält.

#### Schritt 5: Finale Überprüfung und Tests

1.  **Code-Review:** Gehen Sie alle geänderten Dateien durch und prüfen Sie auf logische Fehler.
2.  **Test-Szenario 1 (Happy Path):**
    *   Anwendung laden, zum "Analyze"-Tab wechseln.
    *   Prüfen: "Run Simulation" ist aktiv, "Download Results" ist inaktiv.
    *   Auf "Run Simulation" klicken.
    *   Prüfen: "Run Simulation" ist inaktiv und zeigt einen Ladeindikator.
    *   Warten, bis die Simulationen abgeschlossen sind.
    *   Prüfen: "Run Simulation" ist wieder aktiv, "Download Results" ist jetzt aktiv.
    *   Auf "Download Results" klicken.
    *   Prüfen: Eine JSON-Datei wird heruntergeladen und enthält die korrekten Ergebnisse.
3.  **Test-Szenario 2 (Kein Netz):**
    *   Anwendung laden, ohne ein Netz zu laden, zum "Analyze"-Tab wechseln.
    *   Auf "Run Simulation" klicken.
    *   Prüfen: Eine Fehlermeldung erscheint, dass kein Netz geladen ist.
4.  **Test-Szenario 3 (API-Fehler):**
    *   (Simulieren Sie einen Backend-Fehler, z.B. durch Stoppen des Backends)
    *   Auf "Run Simulation" klicken.
    *   Prüfen: Eine Fehlermeldung wird angezeigt. "Run Simulation" wird wieder aktiv. "Download Results" bleibt inaktiv.

Dieser Plan stellt sicher, dass die Funktionalität modular und reaktiv umgesetzt wird, indem der Zustand korrekt in einem Service verwaltet und die UI entsprechend aktualisiert wird.
```


beziehe stellung zu dem plan und insofern du ihn als geeignet ansiehst fuehre ihn aus.