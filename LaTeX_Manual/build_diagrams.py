#!/usr/bin/env python3
"""
Mermaid Diagram Build Script

Converts Mermaid (.mmd) files to PNG for LaTeX inclusion.

Pipeline: .mmd → .png (mmdc)

Usage:
    python build_diagrams.py [options]

Options:
    --clean     Remove all generated PNG files from figures/
    --verbose   Show detailed output
    --help      Show this help message

Requirements:
    - Node.js (>=18.x)
    - mermaid-cli: npm install -g @mermaid-js/mermaid-cli

Author: PNML_Frontend Documentation Team
Date: December 2025
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

# =============================================================================
# Configuration
# =============================================================================

MERMAID_DIR = "mermaid"
FIGURES_DIR = "figures"

# Mermaid CLI Settings
MMDC_THEME = "neutral"      # Scientific theme: clean, minimalist
MMDC_BACKGROUND = "white"   # White background for print
MMDC_SCALE = 4              # Scale factor for high resolution (~400 DPI)


def get_script_dir() -> Path:
    """Get the directory where this script is located."""
    return Path(__file__).parent.resolve()


def check_mmdc_installation() -> bool:
    """Check if mermaid-cli (mmdc) is available."""
    try:
        result = subprocess.run(
            ["mmdc", "--version"],
            capture_output=True,
            text=True,
            shell=True  # Required for Windows PATH resolution with fnm/nvm
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ mermaid-cli found: v{version}")
            return True
        return False
    except FileNotFoundError:
        print("❌ mermaid-cli (mmdc) not found!")
        print("   Install with: npm install -g @mermaid-js/mermaid-cli")
        return False


def get_mermaid_files() -> list:
    """Get all .mmd files from the mermaid directory."""
    mermaid_path = get_script_dir() / MERMAID_DIR
    if not mermaid_path.exists():
        print(f"⚠️  Mermaid directory not found: {mermaid_path}")
        return []
    
    files = list(mermaid_path.glob("*.mmd"))
    return sorted(files)


def convert_mermaid_to_png(mmd_file: Path, verbose: bool = False) -> bool:
    """
    Convert a single Mermaid file to PNG.
    
    Args:
        mmd_file: Path to the .mmd file
        verbose: Show detailed output
    
    Returns:
        True if conversion succeeded, False otherwise
    """
    output_dir = get_script_dir() / FIGURES_DIR
    output_file = output_dir / f"{mmd_file.stem}.png"
    
    cmd = [
        "mmdc",
        "-i", str(mmd_file),
        "-o", str(output_file),
        "-t", MMDC_THEME,
        "-b", MMDC_BACKGROUND,
        "-s", str(MMDC_SCALE)
    ]
    
    if verbose:
        print(f"   Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            " ".join(cmd),  # Join for shell=True
            capture_output=True,
            text=True,
            cwd=get_script_dir(),
            shell=True  # Required for Windows PATH resolution with fnm/nvm
        )
        
        if result.returncode == 0:
            # Check if file was created
            if output_file.exists():
                size_kb = output_file.stat().st_size / 1024
                print(f"   ✓ {output_file.name} ({size_kb:.1f} KB)")
                return True
            else:
                print(f"   ✗ Output file not created: {output_file}")
                return False
        else:
            print(f"   ✗ Conversion failed for {mmd_file.name}")
            if verbose and result.stderr:
                print(f"      Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ✗ Exception: {e}")
        return False


def clean_figures(verbose: bool = False) -> int:
    """
    Remove all generated PNG files from figures directory.
    
    Returns:
        Number of files removed
    """
    figures_path = get_script_dir() / FIGURES_DIR
    if not figures_path.exists():
        return 0
    
    count = 0
    for png_file in figures_path.glob("*.png"):
        if verbose:
            print(f"   Removing: {png_file.name}")
        png_file.unlink()
        count += 1
    
    return count


def build_all_diagrams(verbose: bool = False) -> tuple:
    """
    Build all Mermaid diagrams.
    
    Returns:
        Tuple of (success_count, fail_count)
    """
    mmd_files = get_mermaid_files()
    
    if not mmd_files:
        print("⚠️  No .mmd files found in mermaid/ directory")
        return (0, 0)
    
    print(f"\n📊 Building {len(mmd_files)} diagram(s)...\n")
    
    success = 0
    failed = 0
    
    for mmd_file in mmd_files:
        print(f"   Converting: {mmd_file.name}")
        if convert_mermaid_to_png(mmd_file, verbose):
            success += 1
        else:
            failed += 1
    
    return (success, failed)


def main():
    parser = argparse.ArgumentParser(
        description="Build Mermaid diagrams to PNG for LaTeX"
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove all generated PNG files"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed output"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("📐 Mermaid Diagram Build Script")
    print("=" * 60)
    
    # Check installation
    if not check_mmdc_installation():
        sys.exit(1)
    
    # Handle --clean
    if args.clean:
        print("\n🧹 Cleaning generated files...")
        count = clean_figures(args.verbose)
        print(f"   Removed {count} file(s)")
    
    # Build diagrams
    success, failed = build_all_diagrams(args.verbose)
    
    # Summary
    print("\n" + "=" * 60)
    if failed == 0 and success > 0:
        print(f"✅ BUILD SUCCESSFUL: {success} diagram(s) generated")
    elif success == 0 and failed == 0:
        print("ℹ️  No diagrams to build")
    else:
        print(f"⚠️  BUILD COMPLETED: {success} success, {failed} failed")
    print("=" * 60)
    
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
