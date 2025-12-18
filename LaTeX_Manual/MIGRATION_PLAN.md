# Mermaid-to-Image Migration Plan

## Projektübersicht

### Intent
Die manuell erstellten TikZ-Grafiken in der LaTeX-Dokumentation sollen durch automatisch generierte Bilder ersetzt werden, die direkt aus den originalen Mermaid-Diagrammen in den Markdown-Dateien erzeugt werden.

### Motivation
- **Konsistenz:** Mermaid-Diagramme sind die "Source of Truth"
- **Wartbarkeit:** Änderungen an Diagrammen nur an einer Stelle (Markdown)
- **Reproduzierbarkeit:** Automatisierter Build-Prozess statt manueller TikZ-Konvertierung
- **Zeitersparnis:** Keine manuelle TikZ-Anpassung mehr nötig

---

## Analyse: Aktueller Stand

### TikZ-Grafiken im LaTeX-Dokument (24 Stück)

| # | Zeile | Caption | Typ | Kapitel |
|---|-------|---------|-----|---------|
| 1 | 135 | PNML_Frontend System Architecture | Flowchart | Intro |
| 2 | 218 | Coffee Machine Petri Net Example | Petri-Net | Ch.1 |
| 3 | 322 | Arc requests boundary intersection points | Sequence | Ch.1 |
| 4 | 516 | DataService as Single Source of Truth | Architecture | Ch.2 |
| 5 | 601 | Deleting a Place triggers cascading updates | Sequence | Ch.2 |
| 6 | 766 | PetriNetComponent: The Stage | Architecture | Ch.3 |
| 7 | 870 | Creating a Place via Click | Sequence | Ch.3 |
| 8 | 1030 | PnmlService as Universal Translator | Architecture | Ch.4 |
| 9 | 1136 | PNML Import Process | Sequence | Ch.4 |
| 10 | 1318 | Layout transforms tangled nodes | Before/After | Ch.5 |
| 11 | 1418 | Spring Embedder Physics Loop | Sequence | Ch.5 |
| 12 | 1513 | Sugiyama Algorithm: 4-Step Pipeline | Pipeline | Ch.5 |
| 13 | 1631 | The 3-Step Drag Cycle | Cycle | Ch.6 |
| 14 | 1661 | Anchors allow bending lines | Concept | Ch.6 |
| 15 | 1735 | Dragging a Node with Connected Arcs | Sequence | Ch.6 |
| 16 | 1917 | Fit Content adjusts Scale and Offset | Comparison | Ch.7 |
| 17 | 1978 | Zoom In via Toolbar Button | Sequence | Ch.7 |
| 18 | 2171 | UiService as Central Remote Control | Architecture | Ch.8 |
| 19 | 2290 | Tool Selection and Place Creation | Sequence | Ch.8 |
| 20 | 2439 | Firing a Transition | Petri-Net | Ch.9 |
| 21 | 2496 | History Stack enables Undo | Stack | Ch.9 |
| 22 | 2557 | Token Game Firing Logic | Sequence | Ch.9 |
| 23 | 2755 | PlanningService: The Phone Line | Architecture | Ch.10 |
| 24 | 2841 | Running a Backend Simulation | Sequence | Ch.10 |

### Mermaid-Diagramme in Markdown (10 Sequenzdiagramme)

Jede Markdown-Datei enthält genau 1 Mermaid-Sequenzdiagramm.
Zusätzlich wurden in LaTeX weitere Konzept-Diagramme erstellt, die KEINE Mermaid-Quelle haben.

### Kategorisierung

**Mit Mermaid-Quelle (10):**
- Alle Sequenzdiagramme (Zeilen mit "Sequence" im Typ)

**Ohne Mermaid-Quelle - manuell in TikZ erstellt (14):**
- Architecture-Diagramme
- Petri-Net-Visualisierungen
- Konzept-Diagramme (Pipeline, Stack, Cycle, etc.)

---

## Entscheidung: Bildformat

### Gewählt: PNG (300 DPI)

**Begründung:**
- ✅ Direkte Mermaid-CLI-Unterstützung (kein Zwischenschritt)
- ✅ Einfachste LaTeX-Integration (`\includegraphics`)
- ✅ Minimale Abhängigkeiten (nur mermaid-cli)
- ✅ Plattformunabhängig
- ✅ Bei 300 DPI ausreichende Qualität für Print/PDF

**Pipeline (minimal):**
```
Mermaid (.mmd) → PNG (mmdc) → LaTeX
```

**Kommando:**
```bash
mmdc -i diagram.mmd -o diagram.png -t neutral -b white -s 3
```
- `-t neutral`: Wissenschaftliches Theme (clean, minimalistisch)
- `-b white`: Weißer Hintergrund
- `-s 3`: Scale-Faktor für hohe Auflösung (~300 DPI)

### Alternativen (nicht gewählt)

**PDF via SVG:** Beste Qualität (Vektor), aber komplexere Pipeline mit Inkscape-Abhängigkeit.

**SVG direkt:** Vektorgrafik, aber LaTeX-Integration umständlich (svg-Package oder Konvertierung nötig).

---

## Technische Architektur

### Verzeichnisstruktur

```
LaTeX_Manual/
├── l3s-offshore-doc.tex      # Hauptdokument
├── l3s-project-doc.sty       # Styles
├── build_pdf.py              # LaTeX Build Script
├── build_diagrams.py         # NEU: Mermaid→PNG Konvertierung
├── mermaid/                  # NEU: Mermaid-Quelldateien
│   ├── seq-arc-intersection.mmd
│   ├── seq-delete-place.mmd
│   ├── seq-create-place.mmd
│   ├── seq-pnml-import.mmd
│   ├── seq-spring-embedder.mmd
│   ├── seq-drag-node.mmd
│   ├── seq-zoom-in.mmd
│   ├── seq-tool-selection.mmd
│   ├── seq-token-fire.mmd
│   └── seq-backend-simulation.mmd
├── figures/                  # NEU: Generierte PNGs
│   ├── seq-arc-intersection.png
│   ├── seq-delete-place.png
│   └── ...
└── contents/                 # Existierend
    └── figures/              # Existierende manuelle Grafiken
```

### Build-Pipeline (vereinfacht)

```
┌─────────────────┐
│  Markdown (MD)  │  ← Source of Truth für Mermaid
└────────┬────────┘
         │ (1) Manuelle Extraktion (einmalig)
         ▼
┌─────────────────┐
│  Mermaid (.mmd) │  ← Extrahierte Diagramm-Definitionen
└────────┬────────┘
         │ (2) mmdc -i X.mmd -o X.png -t neutral -s 3
         ▼
┌─────────────────┐
│    PNG (.png)   │  ← LaTeX-ready (300 DPI)
└────────┬────────┘
         │ (3) \includegraphics[width=\textwidth]{figures/X.png}
         ▼
┌─────────────────┐
│  LaTeX (.tex)   │
└─────────────────┘
```

### TikZ-Diagramme ohne Mermaid-Pendant

**Diese 14 Diagramme BLEIBEN als TikZ:**
- Petri-Net-Visualisierungen (Coffee Machine, Firing Transition)
- Architecture-Diagramme (System Architecture, DataService, etc.)
- Konzept-Diagramme (Pipeline, Stack, Cycle, Anchors, etc.)

**Begründung:** Diese wurden manuell in TikZ erstellt und haben spezifisches Styling (Petri-Net-Nodes, Farben), das in Mermaid nicht 1:1 reproduzierbar ist.

---

## Implementierungsplan

### Phase 0: Setup & Tooling (Milestone 0)

**Aufgaben:**
1. [ ] Mermaid-CLI installieren (`npm install -g @mermaid-js/mermaid-cli`)
2. [ ] Inkscape installieren (für SVG→PDF)
3. [ ] Verzeichnisstruktur anlegen
4. [ ] `build_diagrams.py` Script erstellen

**Verifikation:**
```bash
mmdc --version
inkscape --version
```

**Manueller Test:**
```bash
echo "sequenceDiagram\n    A->>B: Hello" > test.mmd
mmdc -i test.mmd -o test.svg
inkscape test.svg --export-pdf=test.pdf
```

---

### Phase 1: Kapitel 1-3 (Milestone 1)

**Betroffene Diagramme:**
1. `seq-arc-intersection` (Ch.1, Zeile 322)
2. `seq-delete-place` (Ch.2, Zeile 601)
3. `seq-create-place` (Ch.3, Zeile 870)

**Aufgaben:**
1. [ ] Mermaid-Code aus MD extrahieren → `.mmd` Dateien
2. [ ] Mermaid-Code als Kommentar in LaTeX einfügen (Mapping)
3. [ ] SVG generieren
4. [ ] PDF konvertieren
5. [ ] TikZ durch `\includegraphics` ersetzen
6. [ ] Build testen

**Verifikation:**
- PDF kompiliert ohne Fehler
- Diagramme sind lesbar und korrekt positioniert
- Seitenzahlen/Referenzen intakt

---

### Phase 2: Kapitel 4-6 (Milestone 2)

**Betroffene Diagramme:**
1. `seq-pnml-import` (Ch.4, Zeile 1136)
2. `seq-spring-embedder` (Ch.5, Zeile 1418)
3. `seq-drag-node` (Ch.6, Zeile 1735)

---

### Phase 3: Kapitel 7-10 (Milestone 3)

**Betroffene Diagramme:**
1. `seq-zoom-in` (Ch.7, Zeile 1978)
2. `seq-tool-selection` (Ch.8, Zeile 2290)
3. `seq-token-fire` (Ch.9, Zeile 2557)
4. `seq-backend-simulation` (Ch.10, Zeile 2841)

---

### Phase 4: Nicht-Sequenz-Diagramme (NICHT MIGRIEREN)

Die 14 Diagramme OHNE Mermaid-Quelle **bleiben als TikZ**:

| # | Caption | Grund für TikZ |
|---|---------|----------------|
| 1 | System Architecture | Spezifisches Layout |
| 2 | Coffee Machine Petri Net | Petri-Net-Styling |
| 4 | DataService Architecture | Spezifisches Layout |
| 6 | PetriNetComponent Stage | Spezifisches Layout |
| 8 | PnmlService Translator | Spezifisches Layout |
| 10 | Layout Before/After | Petri-Net-Styling |
| 12 | Sugiyama Pipeline | Spezifisches Layout |
| 13 | Drag Cycle | Spezifisches Layout |
| 14 | Anchors Concept | Petri-Net-Styling |
| 16 | Fit Content Comparison | Petri-Net-Styling |
| 18 | UiService Remote Control | Spezifisches Layout |
| 20 | Firing Transition | Petri-Net-Styling |
| 21 | History Stack | Spezifisches Layout |
| 23 | PlanningService Architecture | Spezifisches Layout |

---

## Script-Spezifikation: `build_diagrams.py`

```python
#!/usr/bin/env python3
"""
Mermaid Diagram Build Script

Converts Mermaid (.mmd) files to PNG for LaTeX inclusion.

Pipeline: .mmd → .png (mmdc)

Usage:
    python build_diagrams.py [options]

Options:
    --clean     Remove all generated PNG files
    --verbose   Show detailed output
    --help      Show this help message

Requirements:
    - Node.js (>=18.x)
    - mermaid-cli: npm install -g @mermaid-js/mermaid-cli
"""

# Konfiguration
MERMAID_DIR = "mermaid/"
FIGURES_DIR = "figures/"
MMDC_THEME = "neutral"      # Wissenschaftliches Theme
MMDC_BACKGROUND = "white"
MMDC_SCALE = 3              # Hohe Auflösung (~300 DPI)
```

---

## Checkliste für jeden Diagramm-Austausch

- [ ] Mermaid-Code aus Markdown extrahiert
- [ ] `.mmd` Datei erstellt in `mermaid/`
- [ ] PNG generiert: `mmdc -i X.mmd -o figures/X.png -t neutral -b white -s 3`
- [ ] PNG visuell geprüft (Lesbarkeit, Vollständigkeit)
- [ ] Original Mermaid-Code als Kommentar in LaTeX eingefügt
- [ ] TikZ-Block durch `\includegraphics[width=\textwidth]{figures/X.png}` ersetzt
- [ ] Caption und Label beibehalten
- [ ] LaTeX kompiliert ohne Fehler
- [ ] Visueller Check im finalen PDF

---

## Rollback-Strategie

Falls Probleme auftreten:
1. Git-Commit vor jeder Phase
2. TikZ-Code als auskommentierter Block behalten
3. Mermaid-Quelle dokumentiert

---

## Abhängigkeiten

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | ≥18.x | https://nodejs.org |
| mermaid-cli | ≥10.x | `npm install -g @mermaid-js/mermaid-cli` |
| Python | ≥3.8 | (vorhanden) |

**Nicht mehr benötigt:** Inkscape (war nur für SVG→PDF Konvertierung)

---

## Offene Fragen

1. ~~**Theme:** Welches Mermaid-Theme?~~ → **Entschieden: `neutral`** (wissenschaftlich, clean)
2. **Breite:** Fixe Breite für alle Diagramme oder variabel? → Vorschlag: `width=\textwidth` oder `width=0.9\textwidth`
3. ~~**TikZ-only Diagramme:**~~ → **Entschieden: Behalten** (14 Stück ohne Mermaid-Pendant)
