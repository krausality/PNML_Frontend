#!/usr/bin/env python3
"""
L3S-Offshore-2 Frontend Documentation - PDF Build Script

This script automates the LaTeX compilation process, handling:
- Multiple pdflatex passes for cross-references
- BibTeX for bibliography
- Cleanup of auxiliary files
- Error detection and reporting

Usage:
    python build_pdf.py [options]

Options:
    --clean     Remove all auxiliary files before building
    --clean-only Remove auxiliary files without building
    --open      Open the PDF after successful build
    --verbose   Show detailed compilation output
    --help      Show this help message

Requirements:
    - pdflatex (MiKTeX or TeX Live)
    - bibtex
"""

import subprocess
import sys
import os
import shutil
import argparse
from pathlib import Path

# Configuration
MAIN_TEX_FILE = "l3s-offshore-doc.tex"
OUTPUT_PDF = "l3s-offshore-doc.pdf"

# Auxiliary file extensions to clean
AUX_EXTENSIONS = [
    ".aux", ".bbl", ".blg", ".log", ".out", ".toc", 
    ".lof", ".lot", ".fls", ".fdb_latexmk", ".synctex.gz",
    ".nav", ".snm", ".vrb"
]


def get_script_dir() -> Path:
    """Get the directory where this script is located."""
    return Path(__file__).parent.resolve()


def run_command(cmd: list, verbose: bool = False, capture: bool = True) -> tuple:
    """
    Run a shell command and return (success, output).
    
    Args:
        cmd: Command as list of strings
        verbose: If True, print output in real-time
        capture: If True, capture and return output
    
    Returns:
        Tuple of (success: bool, output: str)
    """
    try:
        if verbose:
            # Stream output in real-time
            result = subprocess.run(
                cmd,
                cwd=get_script_dir(),
                text=True
            )
            return result.returncode == 0, ""
        else:
            # Capture output
            result = subprocess.run(
                cmd,
                cwd=get_script_dir(),
                capture_output=True,
                text=True
            )
            output = result.stdout + result.stderr
            return result.returncode == 0, output
    except FileNotFoundError:
        return False, f"Command not found: {cmd[0]}"
    except Exception as e:
        return False, str(e)


def check_latex_installation() -> bool:
    """Check if pdflatex and bibtex are available."""
    print("🔍 Checking LaTeX installation...")
    
    success, _ = run_command(["pdflatex", "--version"])
    if not success:
        print("❌ pdflatex not found. Please install MiKTeX or TeX Live.")
        return False
    
    success, _ = run_command(["bibtex", "--version"])
    if not success:
        print("❌ bibtex not found. Please install MiKTeX or TeX Live.")
        return False
    
    print("✅ LaTeX installation OK")
    return True


def clean_aux_files():
    """Remove all auxiliary files."""
    script_dir = get_script_dir()
    cleaned = 0
    
    for ext in AUX_EXTENSIONS:
        for file in script_dir.glob(f"*{ext}"):
            try:
                file.unlink()
                cleaned += 1
            except Exception as e:
                print(f"⚠️  Could not remove {file.name}: {e}")
    
    # Also clean contents directory
    contents_dir = script_dir / "contents"
    if contents_dir.exists():
        for ext in AUX_EXTENSIONS:
            for file in contents_dir.glob(f"*{ext}"):
                try:
                    file.unlink()
                    cleaned += 1
                except Exception:
                    pass
    
    print(f"🧹 Cleaned {cleaned} auxiliary files")


def run_pdflatex(verbose: bool = False) -> tuple:
    """Run pdflatex and return (success, output)."""
    cmd = [
        "pdflatex",
        "-interaction=nonstopmode",
        "-file-line-error",
        MAIN_TEX_FILE
    ]
    return run_command(cmd, verbose=verbose)


def run_bibtex(verbose: bool = False) -> tuple:
    """Run bibtex and return (success, output)."""
    base_name = MAIN_TEX_FILE.replace(".tex", "")
    cmd = ["bibtex", base_name]
    return run_command(cmd, verbose=verbose)


def check_for_errors(log_content: str) -> list:
    """Parse log file for errors and return list of error messages."""
    errors = []
    lines = log_content.split("\n")
    
    for i, line in enumerate(lines):
        if line.startswith("!"):
            # Collect error message (may span multiple lines)
            error_msg = line
            for j in range(i + 1, min(i + 5, len(lines))):
                if lines[j].startswith("l."):
                    error_msg += "\n" + lines[j]
                    break
                elif lines[j].strip():
                    error_msg += " " + lines[j].strip()
            errors.append(error_msg)
    
    return errors


def build_pdf(verbose: bool = False, clean_first: bool = False) -> bool:
    """
    Build the PDF document.
    
    Args:
        verbose: Show detailed output
        clean_first: Clean auxiliary files before building
    
    Returns:
        True if successful, False otherwise
    """
    script_dir = get_script_dir()
    tex_file = script_dir / MAIN_TEX_FILE
    
    if not tex_file.exists():
        print(f"❌ Main TeX file not found: {MAIN_TEX_FILE}")
        print(f"   Expected location: {tex_file}")
        return False
    
    if clean_first:
        clean_aux_files()
    
    print("\n" + "=" * 60)
    print("📄 Building L3S-Offshore-2 Frontend Documentation")
    print("=" * 60)
    
    # Pass 1: Initial pdflatex run
    print("\n[1/4] Running pdflatex (pass 1)...")
    success, output = run_pdflatex(verbose)
    if not success:
        print("❌ pdflatex pass 1 failed")
        errors = check_for_errors(output)
        if errors:
            print("\nErrors found:")
            for err in errors[:5]:  # Show first 5 errors
                print(f"  {err}")
        return False
    print("     ✓ Pass 1 complete")
    
    # Pass 2: BibTeX
    print("[2/4] Running bibtex...")
    success, output = run_bibtex(verbose)
    # BibTeX may fail if no citations, but that's OK
    if "I found no \\citation commands" in output:
        print("     ⚠ No citations found (bibliography will be empty)")
    elif not success and "error" in output.lower():
        print(f"     ⚠ BibTeX warning: check references.bib")
    else:
        print("     ✓ Bibliography processed")
    
    # Pass 3: pdflatex for bibliography
    print("[3/4] Running pdflatex (pass 2)...")
    success, output = run_pdflatex(verbose)
    if not success:
        print("❌ pdflatex pass 2 failed")
        return False
    print("     ✓ Pass 2 complete")
    
    # Pass 4: pdflatex for cross-references
    print("[4/4] Running pdflatex (pass 3)...")
    success, output = run_pdflatex(verbose)
    if not success:
        print("❌ pdflatex pass 3 failed")
        return False
    print("     ✓ Pass 3 complete")
    
    # Check output
    pdf_file = script_dir / OUTPUT_PDF
    if pdf_file.exists():
        size_kb = pdf_file.stat().st_size / 1024
        print("\n" + "=" * 60)
        print(f"✅ BUILD SUCCESSFUL")
        print(f"   Output: {OUTPUT_PDF}")
        print(f"   Size:   {size_kb:.1f} KB")
        print("=" * 60)
        return True
    else:
        print("❌ PDF file was not created")
        return False


def open_pdf():
    """Open the PDF file with the system's default viewer."""
    pdf_path = get_script_dir() / OUTPUT_PDF
    
    if not pdf_path.exists():
        print(f"❌ PDF not found: {pdf_path}")
        return False
    
    print(f"📖 Opening {OUTPUT_PDF}...")
    
    try:
        if sys.platform == "win32":
            os.startfile(pdf_path)
        elif sys.platform == "darwin":
            subprocess.run(["open", pdf_path])
        else:
            subprocess.run(["xdg-open", pdf_path])
        return True
    except Exception as e:
        print(f"❌ Could not open PDF: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Build L3S-Offshore-2 Frontend Documentation PDF",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python build_pdf.py              # Standard build
    python build_pdf.py --clean      # Clean build
    python build_pdf.py --open       # Build and open PDF
    python build_pdf.py --verbose    # Show detailed output
    python build_pdf.py --clean-only # Just remove aux files
        """
    )
    
    parser.add_argument(
        "--clean", "-c",
        action="store_true",
        help="Remove auxiliary files before building"
    )
    
    parser.add_argument(
        "--clean-only",
        action="store_true",
        help="Only remove auxiliary files, don't build"
    )
    
    parser.add_argument(
        "--open", "-o",
        action="store_true",
        help="Open PDF after successful build"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed compilation output"
    )
    
    args = parser.parse_args()
    
    # Change to script directory
    os.chdir(get_script_dir())
    
    # Clean only mode
    if args.clean_only:
        clean_aux_files()
        print("✅ Cleanup complete")
        return 0
    
    # Check LaTeX installation
    if not check_latex_installation():
        return 1
    
    # Build PDF
    success = build_pdf(
        verbose=args.verbose,
        clean_first=args.clean
    )
    
    if not success:
        return 1
    
    # Open PDF if requested
    if args.open:
        open_pdf()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
