# tiles3d-dl package

This project provides tools to download 3D tiles from Google Maps 3D Tiles API.

## Installation

For development (editable install):
```bash
pip install -e .
```

For development with all extras (visualization, notebooks):
```bash
pip install -e ".[dev]"
```

## Package Structure

- `src/` - Core library modules
  - `tile_api.py` - Google 3D Tiles API client
  - `bounding_volume.py` - Bounding volume classes (Sphere, OrientedBoundingBox)
  - `wgs84.py` - WGS84 coordinate conversions
  - `tile.py` - Tile representation
  - `geojson_utils.py` - GeoJSON utility functions

- `scripts/` - Command-line scripts
  - `download_tiles.py` - Download tiles by coordinates and radius
  - `download_tiles_geojson.py` - Download tiles from GeoJSON polygon
