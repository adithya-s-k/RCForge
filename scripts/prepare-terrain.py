"""Rebuild the bundled visual DEM samples. Offline authoring tool, not a runtime dependency.

Requires Python 3, Pillow and curl. Terrain Tiles data is decoded as elevation,
not treated as a photographic image. Sources and modifications: public/scenery/README.md.
"""
import json
import math
from pathlib import Path
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(tempfile.gettempdir()) / "rcforge-elevation"
CACHE.mkdir(exist_ok=True)
GRID, EXTENT, ZOOM = 129, 12000, 12
RADIUS = 6378137


def prepare(name, latitude, longitude):
    tiles = {}
    sources = set()

    def pixel(x, y):
        tx, ty = int(x) // 256, int(y) // 256
        key = tx, ty
        if key not in tiles:
            path = CACHE / f"{ZOOM}-{tx}-{ty}.png"
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{tx}/{ty}.png"
            if not path.exists():
                subprocess.run(["curl", "-fLsS", "--retry", "2", url, "-o", str(path)], check=True)
            with Image.open(path) as source:
                tiles[key] = list(source.convert("RGB").get_flattened_data())
            sources.add(url)
        red, green, blue = tiles[key][(int(y) % 256) * 256 + int(x) % 256]
        return red * 256 + green + blue / 256 - 32768

    def elevation(north, east):
        lat = math.radians(latitude) + north / RADIUS
        lon = math.radians(longitude) + east / (RADIUS * math.cos(math.radians(latitude)))
        scale = (2 ** ZOOM) * 256
        px = (lon + math.pi) / (2 * math.pi) * scale - 0.5
        py = (1 - math.asinh(math.tan(lat)) / math.pi) * scale / 2 - 0.5
        ix, iy = math.floor(px), math.floor(py)
        fx, fy = px - ix, py - iy
        return ((pixel(ix, iy) * (1-fx) + pixel(ix+1, iy) * fx) * (1-fy)
                + (pixel(ix, iy+1) * (1-fx) + pixel(ix+1, iy+1) * fx) * fy)

    values = []
    for row in range(GRID):
        east = (row / (GRID-1) - 0.5) * EXTENT
        for col in range(GRID):
            north = (col / (GRID-1) - 0.5) * EXTENT
            values.append(round(elevation(north, east)))
    result = dict(grid=GRID, extentM=EXTENT, center=[latitude, longitude],
                  datumM=round(elevation(0, 0)), elevationsM=values, sources=sorted(sources))
    output = ROOT / "src/view/data" / f"{name}-height.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(name, "datum", result["datumM"], "range", min(values), max(values), "tiles", len(tiles))


if __name__ == "__main__":
    prepare("alpine", 46.624, 8.034)
    prepare("mesa", 37.020, -110.185)
