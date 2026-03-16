#!/usr/bin/env python3
"""
Read an SVG file, take the first path as the base shape,
then subtract each subsequent path from it.
Outputs the result as a new SVG.

Requires: svgpathtools, shapely
  pip install svgpathtools shapely

Usage:
  python scripts/subtract_paths.py public/memory_cloud_icon.txt -o output.svg
"""

import argparse
import sys
import numpy as np
from xml.etree import ElementTree as ET
from svgpathtools import parse_path, Line, CubicBezier, QuadraticBezier, Arc
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid


def path_to_polygons(d: str, num_samples: int = 200) -> list[Polygon]:
    """Convert an SVG path d-string into a list of Shapely Polygons."""
    path = parse_path(d)
    polygons = []
    current_points = []

    for segment in path:
        if isinstance(segment, Line):
            pts = [segment.start, segment.end]
        elif isinstance(segment, (CubicBezier, QuadraticBezier)):
            pts = [segment.point(t) for t in np.linspace(0, 1, num_samples)]
        elif isinstance(segment, Arc):
            pts = [segment.point(t) for t in np.linspace(0, 1, num_samples)]
        else:
            pts = [segment.point(t) for t in np.linspace(0, 1, num_samples)]

        coords = [(p.real, p.imag) for p in pts]

        if not current_points:
            current_points.extend(coords)
        else:
            # Check if this segment continues from the last point
            last = current_points[-1]
            first_new = coords[0]
            dist = ((last[0] - first_new[0])**2 + (last[1] - first_new[1])**2)**0.5
            if dist < 1.0:
                current_points.extend(coords[1:])
            else:
                # New subpath — close previous one
                if len(current_points) >= 3:
                    try:
                        poly = Polygon(current_points)
                        if not poly.is_valid:
                            poly = make_valid(poly)
                        if hasattr(poly, 'area') and poly.area > 0:
                            polygons.append(poly)
                    except Exception:
                        pass
                current_points = list(coords)

    # Close final subpath
    if len(current_points) >= 3:
        try:
            poly = Polygon(current_points)
            if not poly.is_valid:
                poly = make_valid(poly)
            if hasattr(poly, 'area') and poly.area > 0:
                polygons.append(poly)
        except Exception:
            pass

    return polygons


def geometry_to_path_d(geom, precision: int = 2) -> str:
    """Convert a Shapely geometry back to an SVG path d-string."""
    parts = []

    def polygon_to_d(poly: Polygon) -> str:
        d_parts = []
        # Exterior ring
        coords = list(poly.exterior.coords)
        if coords:
            d_parts.append(f"M {coords[0][0]:.{precision}f} {coords[0][1]:.{precision}f}")
            for x, y in coords[1:]:
                d_parts.append(f"L {x:.{precision}f} {y:.{precision}f}")
            d_parts.append("Z")
        # Interior rings (holes)
        for interior in poly.interiors:
            coords = list(interior.coords)
            if coords:
                d_parts.append(f"M {coords[0][0]:.{precision}f} {coords[0][1]:.{precision}f}")
                for x, y in coords[1:]:
                    d_parts.append(f"L {x:.{precision}f} {y:.{precision}f}")
                d_parts.append("Z")
        return " ".join(d_parts)

    if isinstance(geom, Polygon):
        parts.append(polygon_to_d(geom))
    elif isinstance(geom, MultiPolygon):
        for poly in geom.geoms:
            parts.append(polygon_to_d(poly))
    elif hasattr(geom, 'geoms'):
        for g in geom.geoms:
            if isinstance(g, Polygon):
                parts.append(polygon_to_d(g))

    return " ".join(parts)


def main():
    parser = argparse.ArgumentParser(description="Subtract SVG paths from the first path")
    parser.add_argument("input", help="Input SVG file")
    parser.add_argument("-o", "--output", default="output.svg", help="Output SVG file")
    parser.add_argument("--samples", type=int, default=200, help="Curve sampling density")
    args = parser.parse_args()

    # Parse SVG
    tree = ET.parse(args.input)
    root = tree.getroot()

    # Handle SVG namespace
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"

    # Find all path elements
    paths = root.iter(f"{ns}path")
    path_elements = []
    for p in paths:
        d = p.get("d")
        if d:
            path_elements.append((p, d))

    if len(path_elements) < 2:
        print(f"Found {len(path_elements)} paths — need at least 2 (base + subtraction)")
        sys.exit(1)

    print(f"Found {len(path_elements)} paths")
    print(f"Path 1 (base): {len(path_elements[0][1])} chars")
    for i, (_, d) in enumerate(path_elements[1:], 2):
        print(f"Path {i} (subtract): {len(d)} chars")

    # Convert first path to geometry (base)
    print("\nConverting base path to geometry...")
    base_polys = path_to_polygons(path_elements[0][1], args.samples)
    if not base_polys:
        print("ERROR: Could not convert base path to polygons")
        sys.exit(1)
    base_geom = unary_union(base_polys)
    print(f"  Base: {len(base_polys)} polygon(s), area={base_geom.area:.1f}")

    # Subtract each subsequent path
    result = base_geom
    for i, (_, d) in enumerate(path_elements[1:], 2):
        print(f"Subtracting path {i}...")
        sub_polys = path_to_polygons(d, args.samples)
        if sub_polys:
            sub_geom = unary_union(sub_polys)
            print(f"  Subtraction shape: {len(sub_polys)} polygon(s), area={sub_geom.area:.1f}")
            result = result.difference(sub_geom)
            print(f"  Result area: {result.area:.1f}")
        else:
            print(f"  WARNING: Could not convert path {i} to polygons, skipping")

    # Generate output SVG
    result_d = geometry_to_path_d(result)

    # Get viewBox from original
    viewBox = root.get("viewBox", "0 0 1184 884")
    width = root.get("width", "1184")
    height = root.get("height", "884")

    output_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="{viewBox}" width="{width}" height="{height}">
    <path d="{result_d}" fill="black" fill-rule="evenodd"/>
</svg>'''

    with open(args.output, "w") as f:
        f.write(output_svg)

    print(f"\nOutput written to {args.output}")


if __name__ == "__main__":
    main()
