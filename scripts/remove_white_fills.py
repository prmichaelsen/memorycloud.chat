#!/usr/bin/env python3
"""
Remove white fills from an SVG that uses alternating blue/white layered paths.

Detects blue-white pairs where white paths create negative space on top of
blue paths (painter's algorithm). For each pair, subtracts the white path
from the blue path. Unions all resulting rings into a single path with
transparent background.

Skips the first path if it's a full-canvas background rectangle.

Requires: svgpathtools, shapely, numpy
  pip install svgpathtools shapely numpy

Usage:
  python scripts/remove_white_fills.py assets/agentbase_icon.svg -o output.svg
  python scripts/remove_white_fills.py input.svg -o output.svg --fill "#076ef3"
  python scripts/remove_white_fills.py input.svg -o output.svg --white-threshold 250
"""

import argparse
import sys
import numpy as np
from xml.etree import ElementTree as ET
from svgpathtools import parse_path, Line, CubicBezier, QuadraticBezier, Arc
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    """Convert hex color to (r, g, b)."""
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def is_white_ish(fill: str, threshold: int = 240) -> bool:
    """Check if a fill color is white or near-white."""
    if not fill:
        return False
    try:
        r, g, b = hex_to_rgb(fill)
        return r >= threshold and g >= threshold and b >= threshold
    except (ValueError, IndexError):
        return fill.lower() in ("white", "#fff", "#ffffff")


def is_background_rect(d: str, viewbox_w: float, viewbox_h: float) -> bool:
    """Check if a path is a simple rectangle covering the full viewBox."""
    path = parse_path(d)
    if len(path) < 4:
        return False
    # Check if all segments are lines forming a rectangle
    if not all(isinstance(seg, Line) for seg in path):
        return False
    points = set()
    for seg in path:
        points.add((round(seg.start.real), round(seg.start.imag)))
        points.add((round(seg.end.real), round(seg.end.imag)))
    corners = {(0, 0), (round(viewbox_w), 0),
               (round(viewbox_w), round(viewbox_h)), (0, round(viewbox_h))}
    return points == corners


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
            last = current_points[-1]
            first_new = coords[0]
            dist = ((last[0] - first_new[0])**2 + (last[1] - first_new[1])**2)**0.5
            if dist < 1.0:
                current_points.extend(coords[1:])
            else:
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
        coords = list(poly.exterior.coords)
        if coords:
            d_parts.append(f"M {coords[0][0]:.{precision}f} {coords[0][1]:.{precision}f}")
            for x, y in coords[1:]:
                d_parts.append(f"L {x:.{precision}f} {y:.{precision}f}")
            d_parts.append("Z")
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
    parser = argparse.ArgumentParser(
        description="Remove white fills from layered blue/white SVG icons")
    parser.add_argument("input", help="Input SVG file")
    parser.add_argument("-o", "--output", default="output.svg", help="Output SVG file")
    parser.add_argument("--fill", default="#076ef3", help="Fill color for output (default: #076ef3)")
    parser.add_argument("--samples", type=int, default=200, help="Curve sampling density")
    parser.add_argument("--white-threshold", type=int, default=240,
                        help="RGB threshold for detecting white-ish fills (default: 240)")
    parser.add_argument("--simplify", type=float, default=0.5,
                        help="Polygon simplification tolerance in SVG units (default: 0.5, 0=no simplify)")
    args = parser.parse_args()

    # Parse SVG
    tree = ET.parse(args.input)
    root = tree.getroot()

    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"

    # Parse viewBox dimensions
    viewBox = root.get("viewBox", "0 0 1024 1024")
    vb_parts = viewBox.split()
    vb_w = float(vb_parts[2]) if len(vb_parts) >= 3 else 1024
    vb_h = float(vb_parts[3]) if len(vb_parts) >= 4 else 1024

    # Collect all paths with their fill colors
    path_data = []
    for p in root.iter(f"{ns}path"):
        d = p.get("d")
        fill = p.get("fill", "")
        if d:
            path_data.append({"d": d, "fill": fill})

    print(f"Found {len(path_data)} paths")
    for i, pd in enumerate(path_data):
        white = is_white_ish(pd["fill"], args.white_threshold)
        print(f"  Path {i+1}: fill={pd['fill']}  {'(white)' if white else '(color)'}")

    # Separate into blue and white paths, skipping background rect
    blue_paths = []
    white_paths = []

    for i, pd in enumerate(path_data):
        if is_white_ish(pd["fill"], args.white_threshold):
            # Skip if it's the background rectangle
            if i == 0 and is_background_rect(pd["d"], vb_w, vb_h):
                print(f"\n  Skipping path 1 (background rectangle)")
                continue
            white_paths.append(pd)
        else:
            blue_paths.append(pd)

    print(f"\n  {len(blue_paths)} colored path(s), {len(white_paths)} white path(s)")

    if not blue_paths:
        print("ERROR: No colored paths found")
        sys.exit(1)

    # Strategy: process paths in original order, pairing each blue with the
    # next white path that follows it
    rings = []
    # Re-walk in original order to preserve pairing
    colored_queue = []
    for pd in path_data:
        is_white = is_white_ish(pd["fill"], args.white_threshold)
        is_bg = is_background_rect(pd["d"], vb_w, vb_h) if is_white else False

        if is_bg:
            continue
        elif not is_white:
            # Colored path — push onto queue
            colored_queue.append(pd)
        else:
            # White path — subtract from most recent colored path
            if colored_queue:
                blue_pd = colored_queue.pop()
                print(f"\nPairing: {blue_pd['fill']} - {pd['fill']}")

                blue_polys = path_to_polygons(blue_pd["d"], args.samples)
                white_polys = path_to_polygons(pd["d"], args.samples)

                if blue_polys and white_polys:
                    blue_geom = unary_union(blue_polys)
                    white_geom = unary_union(white_polys)
                    ring = blue_geom.difference(white_geom)
                    print(f"  Blue area:  {blue_geom.area:.1f}")
                    print(f"  White area: {white_geom.area:.1f}")
                    print(f"  Ring area:  {ring.area:.1f}")
                    if ring.area > 0:
                        rings.append(ring)
                elif blue_polys:
                    print("  WARNING: Could not convert white path, keeping blue as-is")
                    rings.append(unary_union(blue_polys))
            else:
                print(f"\n  WARNING: White path with no preceding blue path, skipping")

    # Any remaining colored paths without a white pair (keep as-is)
    for blue_pd in colored_queue:
        print(f"\nUnpaired colored path: {blue_pd['fill']} (keeping as-is)")
        blue_polys = path_to_polygons(blue_pd["d"], args.samples)
        if blue_polys:
            rings.append(unary_union(blue_polys))

    if not rings:
        print("\nERROR: No rings produced")
        sys.exit(1)

    # Union all rings into final geometry
    print(f"\nUnioning {len(rings)} ring(s)...")
    result = unary_union(rings)
    print(f"  Final area: {result.area:.1f}")

    # Simplify to reduce point count
    if args.simplify > 0:
        before_area = result.area
        result = result.simplify(args.simplify, preserve_topology=True)
        print(f"  Simplified (tolerance={args.simplify}): area {result.area:.1f} (delta: {result.area - before_area:.1f})")

    result_d = geometry_to_path_d(result)

    width = root.get("width", f"{vb_w}")
    height = root.get("height", f"{vb_h}")

    output_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="{viewBox}" width="{width}" height="{height}">
  <path d="{result_d}" fill="{args.fill}" fill-rule="evenodd"/>
</svg>'''

    with open(args.output, "w") as f:
        f.write(output_svg)

    print(f"\nOutput written to {args.output}")


if __name__ == "__main__":
    main()
