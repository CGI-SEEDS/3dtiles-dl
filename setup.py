#!/usr/bin/env python3
"""
Setup script for tiles3d-dl package.

For development installation:
    pip install -e .

For development with all extras:
    pip install -e ".[dev]"
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read requirements from requirements.txt
requirements_path = Path(__file__).parent / "requirements.txt"
if requirements_path.exists():
    with open(requirements_path) as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]
else:
    requirements = [
        "numpy",
        "requests",
        "tqdm",
        "python-dotenv",
    ]

# Read README for long description
readme_path = Path(__file__).parent / "README.md"
long_description = ""
if readme_path.exists():
    with open(readme_path, encoding="utf-8") as f:
        long_description = f.read()

setup(
    name="tiles3d-dl",
    version="0.1.0",
    description="Download 3D tiles from Google Maps 3D Tiles API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Your Name",
    python_requires=">=3.8",
    packages=find_packages(where=".", include=["src", "src.*", "scripts", "scripts.*"]),
    install_requires=requirements,
    extras_require={
        "viz": ["pandas", "trimesh", "pyvista", "matplotlib", "pillow", "rtree"],
        "notebook": ["ipykernel", "pandas"],
        "dev": ["ipykernel", "pandas", "trimesh", "pyvista", "matplotlib", "pillow", "rtree"],
    },
    entry_points={
        "console_scripts": [
            "download-tiles=scripts.download_tiles:main",
            "download-tiles-geojson=scripts.download_tiles_geojson:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
