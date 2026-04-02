import json
import numpy as np
from pathlib import Path
from .wgs84 import cartesian_from_degrees
from .bounding_volume import Sphere
import requests


def load_geojson(filepath):
    """Load a GeoJSON file and return the parsed data."""
    with open(filepath, 'r') as f:
        return json.load(f)


def extract_polygon_coordinates(geojson):
    """
    Extract polygon coordinates from a GeoJSON FeatureCollection or Feature.
    Returns a list of [lon, lat] coordinates.
    """
    coordinates = []
    
    if geojson['type'] == 'FeatureCollection':
        for feature in geojson['features']:
            coords = _extract_from_geometry(feature['geometry'])
            coordinates.extend(coords)
    elif geojson['type'] == 'Feature':
        coords = _extract_from_geometry(geojson['geometry'])
        coordinates.extend(coords)
    elif geojson['type'] in ['Polygon', 'MultiPolygon']:
        coords = _extract_from_geometry(geojson)
        coordinates.extend(coords)
    else:
        raise ValueError(f"Unsupported GeoJSON type: {geojson['type']}")
    
    return coordinates


def _extract_from_geometry(geometry):
    """Extract coordinates from a geometry object."""
    geom_type = geometry['type']
    coords = geometry['coordinates']
    
    if geom_type == 'Polygon':
        # Polygon coordinates are [[[lon, lat], ...]]
        # We take the outer ring (first element)
        return coords[0]
    elif geom_type == 'MultiPolygon':
        # MultiPolygon coordinates are [[[[lon, lat], ...]], ...]
        all_coords = []
        for polygon in coords:
            all_coords.extend(polygon[0])  # Take outer ring of each polygon
        return all_coords
    else:
        raise ValueError(f"Unsupported geometry type: {geom_type}")


def get_polygon_centroid(coordinates):
    """
    Calculate the centroid of a polygon given its coordinates.
    
    Args:
        coordinates: List of [lon, lat] pairs
        
    Returns:
        Tuple of (lon, lat) for the centroid
    """
    coords_array = np.array(coordinates)
    centroid_lon = np.mean(coords_array[:, 0])
    centroid_lat = np.mean(coords_array[:, 1])
    return centroid_lon, centroid_lat


def get_polygon_bounding_sphere(coordinates, elevation=0.0, buffer_factor=1.1):
    """
    Create a bounding sphere that encompasses a polygon.
    
    Args:
        coordinates: List of [lon, lat] pairs defining the polygon
        elevation: Elevation in meters (default: 0)
        buffer_factor: Factor to expand the sphere radius (default: 1.1 for 10% buffer)
        
    Returns:
        Sphere object that encompasses the polygon
    """
    # Get centroid
    centroid_lon, centroid_lat = get_polygon_centroid(coordinates)
    
    # Convert centroid to cartesian
    center_cartesian = cartesian_from_degrees(centroid_lon, centroid_lat, elevation)
    
    # Convert all polygon points to cartesian and find max distance from centroid
    max_distance = 0
    for lon, lat in coordinates:
        point_cartesian = cartesian_from_degrees(lon, lat, elevation)
        distance = np.linalg.norm(point_cartesian - center_cartesian)
        max_distance = max(max_distance, distance)
    
    # Add buffer to ensure all tiles are captured
    radius = max_distance * buffer_factor
    
    return Sphere(center_cartesian, radius)


def get_elevation_for_coordinates(lon, lat, api_key):
    """
    Get elevation for a specific coordinate using Google Maps Elevation API.
    
    Args:
        lon: Longitude in degrees
        lat: Latitude in degrees
        api_key: Google Maps API key
        
    Returns:
        Elevation in meters
    """
    res = requests.get(
        "https://maps.googleapis.com/maps/api/elevation/json",
        params={
            "locations": f"{lat},{lon}",
            "key": api_key
        }
    )
    if not res.ok:
        raise RuntimeError(f"Elevation API error: {res.status_code}, {res.text}")
    
    data = res.json()
    if data["status"] != "OK" or "results" not in data:
        raise RuntimeError(f"Elevation API status not ok: {data['status']}, {data}")
    
    return data["results"][0]["elevation"]


def get_output_directory_name(geojson_filepath):
    """
    Generate output directory name based on GeoJSON filename.
    
    Args:
        geojson_filepath: Path to the GeoJSON file
        
    Returns:
        String with the directory name (filename without extension)
    """
    return Path(geojson_filepath).stem
