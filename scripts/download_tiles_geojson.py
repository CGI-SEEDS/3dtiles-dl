#!/usr/bin/env python3
"""
Download 3D tiles from Google Maps 3D Tiles API based on a GeoJSON polygon.

This script reads a GeoJSON file containing a polygon, calculates a bounding
sphere that encompasses the polygon, and downloads all 3D tiles that intersect
with that area.

Usage:
    python download_tiles_geojson.py -g data/polygon.geojson
    python download_tiles_geojson.py -g data/polygon.geojson -o custom_output_dir
"""

from src.tile_api import TileApi
from src.geojson_utils import (
    load_geojson,
    extract_polygon_coordinates,
    get_polygon_centroid,
    get_polygon_bounding_sphere,
    get_elevation_for_coordinates,
    get_output_directory_name
)

import os
import argparse
import json
from pathlib import Path
import sys
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()  # Load environment variables from .env file

# load the google maps api key from environment variable
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def main():
    parser = argparse.ArgumentParser(
        description="Download 3D tiles based on a GeoJSON polygon boundary"
    )
    parser.add_argument(
        "-k", "--api-key",
        help="Your Google Maps 3D Tiles API key (default: from .env file)",
        default=GOOGLE_MAPS_API_KEY
    )
    parser.add_argument(
        "-g", "--geojson",
        help="Path to GeoJSON file containing polygon(s)",
        required=True
    )
    parser.add_argument(
        "-o", "--output-dir",
        help="Output directory (default: data/{geojson_filename})",
        default=None
    )
    parser.add_argument(
        "-b", "--buffer",
        help="Buffer factor to expand bounding sphere (default: 1.1 = 10%% buffer)",
        type=float,
        default=1.1
    )
    parser.add_argument(
        "--elevation",
        help="Manual elevation override in meters (if not provided, will query API)",
        type=float,
        default=None
    )

    args = parser.parse_args()

    # Load GeoJSON file
    print(f"Loading GeoJSON from: {args.geojson}")
    try:
        geojson = load_geojson(args.geojson)
    except FileNotFoundError:
        print(f"Error: GeoJSON file not found: {args.geojson}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file: {e}")
        sys.exit(1)

    # Extract polygon coordinates
    print("Extracting polygon coordinates...")
    try:
        coordinates = extract_polygon_coordinates(geojson)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if not coordinates:
        print("Error: No coordinates found in GeoJSON file")
        sys.exit(1)

    print(f"  Found polygon with {len(coordinates)} vertices")

    # Calculate centroid
    centroid_lon, centroid_lat = get_polygon_centroid(coordinates)
    print(f"  Polygon centroid: ({centroid_lon:.6f}, {centroid_lat:.6f})")

    # Get elevation
    if args.elevation is not None:
        elevation = args.elevation
        print(f"Using manual elevation: {elevation:.2f}m")
    else:
        print("Querying elevation from Google Maps API...")
        try:
            elevation = get_elevation_for_coordinates(
                centroid_lon, centroid_lat, args.api_key
            )
            print(f"  Elevation at centroid: {elevation:.2f}m")
        except Exception as e:
            print(f"Error querying elevation: {e}")
            print("Using default elevation of 0m")
            elevation = 0.0

    # Create bounding sphere
    print(f"Creating bounding sphere (buffer factor: {args.buffer})...")
    bounding_sphere = get_polygon_bounding_sphere(
        coordinates, elevation, buffer_factor=args.buffer
    )
    print(f"  Sphere center: {bounding_sphere.center}")
    print(f"  Sphere radius: {bounding_sphere.r:.2f}m")

    # Set up output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        # Default: data/{geojson_filename}
        geojson_name = get_output_directory_name(args.geojson)
        output_dir = Path("data") / geojson_name

    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {output_dir}")

    # Initialize API and traverse tile hierarchy
    api = TileApi(key=args.api_key)
    print("\nTraversing 3D tile hierarchy...")
    print("(This may take a moment as the API recursively explores the tile tree)")
    
    try:
        tiles = list(tqdm(api.get(bounding_sphere), desc="Discovering tiles"))
    except Exception as e:
        print(f"\nError traversing tile hierarchy: {e}")
        sys.exit(1)

    print(f"\nFound {len(tiles)} tiles to download")

    if len(tiles) == 0:
        print("Warning: No tiles found for this area. Check your coordinates and API key.")
        sys.exit(0)

    # Download tiles
    print("\nDownloading tiles...")
    success_count = 0
    error_count = 0

    for i, tile in tqdm(enumerate(tiles), total=len(tiles), desc="Downloading"):
        try:
            output_file = output_dir / f"{tile.basename}.glb"
            with open(output_file, "wb") as f:
                f.write(tile.data)
            success_count += 1
        except Exception as e:
            print(f"\nError downloading tile {tile.basename}: {e}")
            error_count += 1

    # Summary
    print("\n" + "="*60)
    print("Download Complete!")
    print("="*60)
    print(f"Total tiles: {len(tiles)}")
    print(f"Successfully downloaded: {success_count}")
    if error_count > 0:
        print(f"Errors: {error_count}")
    print(f"Output location: {output_dir.absolute()}")
    print(f"Total size: {sum(f.stat().st_size for f in output_dir.glob('*.glb')) / (1024*1024):.2f} MB")


if __name__ == "__main__":
    main()
