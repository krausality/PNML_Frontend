# Mermaid-to-Image Migration Plan

## Project Overview

### Intent
The manually created TikZ graphics in the LaTeX documentation should be replaced by automatically generated images created directly from the original Mermaid diagrams in the Markdown files.

### Motivation
- **Consistency:** Mermaid diagrams are the "Source of Truth"
- **Maintainability:** Changes to diagrams only in one place (Markdown)
- **Reproducibility:** Automated build process instead of manual TikZ conversion
- **Time savings:** No more manual TikZ adjustments needed

---

## Analysis: Current State

### TikZ Graphics in LaTeX Document (24 pieces)

| # | Line | Caption | Type | Chapter |
|---|------|---------|------|---------|
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

### Mermaid Diagrams in Markdown (10 Sequence Diagrams)

Each Markdown file contains exactly 1 Mermaid sequence diagram.
Additionally, further concept diagrams were created in LaTeX that have NO Mermaid source.

### Categorization

**With Mermaid Source (10):**
- All sequence diagrams (lines with "Sequence" in the Type)

**Without Mermaid Source - manually created in TikZ (14):**
- Architecture diagrams
- Petri net visualizations
- Concept diagrams (Pipeline, Stack, Cycle, etc.)

---

## Decision: Image Format

### Chosen: PNG (300 DPI)

**Justification:**
- ✅ Direct Mermaid CLI support (no intermediate step)
- ✅ Simplest LaTeX integration (`\includegraphics`)
- ✅ Minimal dependencies (only mermaid-cli)
- ✅ Platform-independent
- ✅ At 300 DPI sufficient quality for print/PDF

**Pipeline (minimal):**
```
Mermaid (.mmd) → PNG (mmdc) → LaTeX
```

**Command:**
```bash
mmdc -i diagram.mmd -o diagram.png -t neutral -b white -s 3
```
- `-t neutral`: Scientific theme (clean, minimalist)
- `-b white`: White background
- `-s 3`: Scale factor for high resolution (~300 DPI)

### Alternatives (not chosen)

**PDF via SVG:** Best quality (vector), but more complex pipeline with Inkscape dependency.

**SVG directly:** Vector graphics, but LaTeX integration cumbersome (svg package or conversion needed).

---

## Technical Architecture

### Directory Structure

```
LaTeX_Manual/
├── l3s-offshore-doc.tex      # Main document
├── l3s-project-doc.sty       # Styles
├── build_pdf.py              # LaTeX build script
├── build_diagrams.py         # NEW: Mermaid→PNG conversion
├── mermaid/                  # NEW: Mermaid source files
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
├── figures/                  # NEW: Generated PNGs
│   ├── seq-arc-intersection.png
│   ├── seq-delete-place.png
│   └── ...
└── contents/                 # Existing
    └── figures/              # Existing manual graphics
```

### Build Pipeline (simplified)

```
┌─────────────────┐
│  Markdown (MD)  │  ← Source of Truth for Mermaid
└────────┬────────┘
         │ (1) Manual extraction (one-time)
         ▼
┌─────────────────┐
│  Mermaid (.mmd) │  ← Extracted diagram definitions
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

### TikZ Diagrams without Mermaid Counterpart

**These 14 diagrams REMAIN as TikZ:**
- Petri net visualizations (Coffee Machine, Firing Transition)
- Architecture diagrams (System Architecture, DataService, etc.)
- Concept diagrams (Pipeline, Stack, Cycle, Anchors, etc.)

**Justification:** These were manually created in TikZ and have specific styling (Petri net nodes, colors) that cannot be reproduced 1:1 in Mermaid.

---

## Implementation Plan

### Phase 0: Setup & Tooling (Milestone 0)

**Tasks:**
1. [ ] Install Mermaid CLI (`npm install -g @mermaid-js/mermaid-cli`)
2. [ ] Install Inkscape (for SVG→PDF)
3. [ ] Create directory structure
4. [ ] Create `build_diagrams.py` script

**Verification:**
```bash
mmdc --version
inkscape --version
```

**Manual test:**
```bash
echo "sequenceDiagram\n    A->>B: Hello" > test.mmd
mmdc -i test.mmd -o test.svg
inkscape test.svg --export-pdf=test.pdf
```

---

### Phase 1: Chapters 1-3 (Milestone 1)

**Affected diagrams:**
1. `seq-arc-intersection` (Ch.1, line 322)
2. `seq-delete-place` (Ch.2, line 601)
3. `seq-create-place` (Ch.3, line 870)

**Tasks:**
1. [ ] Extract Mermaid code from MD → `.mmd` files
2. [ ] Insert Mermaid code as comment in LaTeX (mapping)
3. [ ] Generate SVG
4. [ ] Convert PDF
5. [ ] Replace TikZ with `\includegraphics`
6. [ ] Test build

**Verification:**
- PDF compiles without errors
- Diagrams are readable and correctly positioned
- Page numbers/references intact

---

### Phase 2: Chapters 4-6 (Milestone 2)

**Affected diagrams:**
1. `seq-pnml-import` (Ch.4, line 1136)
2. `seq-spring-embedder` (Ch.5, line 1418)
3. `seq-drag-node` (Ch.6, line 1735)

---

### Phase 3: Chapters 7-10 (Milestone 3)

**Affected diagrams:**
1. `seq-zoom-in` (Ch.7, line 1978)
2. `seq-tool-selection` (Ch.8, line 2290)
3. `seq-token-fire` (Ch.9, line 2557)
4. `seq-backend-simulation` (Ch.10, line 2841)

---

### Phase 4: Non-Sequence Diagrams (DO NOT MIGRATE)

The 14 diagrams WITHOUT Mermaid source **remain as TikZ**:

| # | Caption | Reason for TikZ |
|---|---------|-----------------|
| 1 | System Architecture | Specific layout |
| 2 | Coffee Machine Petri Net | Petri net styling |
| 4 | DataService Architecture | Specific layout |
| 6 | PetriNetComponent Stage | Specific layout |
| 8 | PnmlService Translator | Specific layout |
| 10 | Layout Before/After | Petri net styling |
| 12 | Sugiyama Pipeline | Specific layout |
| 13 | Drag Cycle | Specific layout |
| 14 | Anchors Concept | Petri net styling |
| 16 | Fit Content Comparison | Petri net styling |
| 18 | UiService Remote Control | Specific layout |
| 20 | Firing Transition | Petri net styling |
| 21 | History Stack | Specific layout |
| 23 | PlanningService Architecture | Specific layout |

---

## Script Specification: `build_diagrams.py`

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

# Configuration
MERMAID_DIR = "mermaid/"
FIGURES_DIR = "figures/"
MMDC_THEME = "neutral"      # Scientific theme
MMDC_BACKGROUND = "white"
MMDC_SCALE = 3              # High resolution (~300 DPI)
```

---

## Checklist for Each Diagram Replacement

- [ ] Mermaid code extracted from Markdown
- [ ] `.mmd` file created in `mermaid/`
- [ ] PNG generated: `mmdc -i X.mmd -o figures/X.png -t neutral -b white -s 3`
- [ ] PNG visually checked (readability, completeness)
- [ ] Original Mermaid code inserted as comment in LaTeX
- [ ] TikZ block replaced with `\includegraphics[width=\textwidth]{figures/X.png}`
- [ ] Caption and label preserved
- [ ] LaTeX compiles without errors
- [ ] Visual check in final PDF

---

## Rollback Strategy

If problems occur:
1. Git commit before each phase
2. Keep TikZ code as commented-out block
3. Mermaid source documented

---

## Dependencies

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | ≥18.x | https://nodejs.org |
| mermaid-cli | ≥10.x | `npm install -g @mermaid-js/mermaid-cli` |
| Python | ≥3.8 | (available) |

**No longer needed:** Inkscape (was only for SVG→PDF conversion)

---

## Open Questions

1. ~~**Theme:** Which Mermaid theme?~~ → **Decided: `neutral`** (scientific, clean)
2. **Width:** Fixed width for all diagrams or variable? → Suggestion: `width=\textwidth` or `width=0.9\textwidth`
3. ~~**TikZ-only diagrams:**~~ → **Decided: Keep** (14 pieces without Mermaid counterpart)
