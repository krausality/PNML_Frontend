# L3S-Offshore-2 Frontend Documentation

This directory contains the LaTeX source files for the technical documentation of the L3S-Offshore-2 Frontend project.

## Quick Start

### Prerequisites

You need a LaTeX distribution installed:

**Windows:**
- Install [MiKTeX](https://miktex.org/download) (recommended) or [TeX Live](https://tug.org/texlive/)
- MiKTeX will auto-install missing packages on first compile

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install texlive-full
```

**macOS:**
```bash
brew install --cask mactex
```

### Compiling the Document

#### Option 1: Using latexmk (Recommended)

The easiest way to compile with all dependencies resolved:

```bash
cd LaTeX_Manual
latexmk -pdf l3s-offshore-doc.tex
```

This automatically runs pdflatex, bibtex, and pdflatex again as needed.

#### Option 2: Manual Compilation

If you don't have latexmk, run these commands in order:

```bash
cd LaTeX_Manual

# First pass - generates .aux files
pdflatex l3s-offshore-doc.tex

# Generate bibliography
bibtex l3s-offshore-doc

# Second pass - includes bibliography
pdflatex l3s-offshore-doc.tex

# Third pass - resolves all references
pdflatex l3s-offshore-doc.tex
```

#### Option 3: Using VS Code with LaTeX Workshop

1. Install the [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) extension
2. Open `l3s-offshore-doc.tex`
3. Press `Ctrl+Alt+B` (or `Cmd+Alt+B` on macOS) to build
4. The PDF will auto-open in a preview pane

### Output

The compiled PDF will be generated as:
```
l3s-offshore-doc.pdf
```

## Project Structure

```
LaTeX_Manual/
├── l3s-offshore-doc.tex    # Main document (compile this)
├── l3s-project-doc.sty     # L3S project documentation style
├── meinearbeit.bib         # Bibliography database
├── README.md               # This file
│
├── contents/
│   ├── 00-abstract.tex           # Abstract
│   ├── 01-einleitung.tex         # Introduction
│   ├── 02-grundlagen.tex         # Fundamentals (Petri nets, PNML, Angular)
│   ├── 03-architecture.tex       # System Architecture
│   ├── 04-implementation.tex     # Implementation Details
│   ├── 05-deployment.tex         # Deployment Guide
│   ├── 06-verwandte-arbeiten.tex # Related Work
│   ├── 07-zusammenfassung-ausblick.tex  # Conclusion & Future Work
│   ├── A-anhang-a.tex            # Appendix: API Reference
│   └── figures/                  # Diagrams and screenshots
│       └── (add your figures here)
│
└── (legacy files)
    ├── meinearbeit.tex     # Original thesis template (not used)
    ├── sethesis.sty        # Original thesis style (not used)
    └── affirmation.tex     # Thesis affirmation (not used)
```

## Adding Figures

1. Place image files in `contents/figures/`
2. Supported formats: PDF (vector), PNG, JPG
3. Reference in LaTeX:

```latex
\begin{figure}[htb]
    \centering
    \includegraphics[width=0.8\textwidth]{contents/figures/your-image.pdf}
    \caption{Description of the figure}
    \label{fig:your-label}
\end{figure}
```

## Adding Citations

1. Add entries to `meinearbeit.bib`
2. Cite in text: `\cite{Murata1989}` or `as shown by Murata~\cite{Murata1989}`
3. Recompile with bibtex (or latexmk handles this automatically)

## Overleaf Upload

To use this project in Overleaf:

1. Create a new blank project in Overleaf
2. Upload all files from this directory
3. Set `l3s-offshore-doc.tex` as the main document (Menu → Main document)
4. Compile with pdfLaTeX

## Cleaning Build Artifacts

To remove generated files:

```bash
# Using latexmk
latexmk -C

# Manual (Windows PowerShell)
Remove-Item *.aux, *.bbl, *.blg, *.log, *.out, *.toc, *.lof, *.lot -ErrorAction SilentlyContinue

# Manual (Linux/macOS)
rm -f *.aux *.bbl *.blg *.log *.out *.toc *.lof *.lot
```

## Troubleshooting

### "Missing package" errors
- **MiKTeX:** Click "Install" when prompted
- **TeX Live:** Run `tlmgr install <package-name>`

### Bibliography not appearing
- Ensure you run bibtex after the first pdflatex pass
- Check that `\bibliographystyle{abbrv}` and `\bibliography{meinearbeit}` are present

### Unicode characters not rendering
- The document uses `\usepackage[utf8]{inputenc}` - ensure your editor saves as UTF-8

### Figures not found
- Check that the path is relative to the main .tex file
- Ensure `\graphicspath{{contents/figures/}}` is set in the preamble
