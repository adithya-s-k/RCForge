"""Build the small runtime textures from bundled originals (Python + Pillow)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/scenery"
OUTPUT = SOURCE / "lite"
OUTPUT.mkdir(exist_ok=True)

for name in ("turf-color.jpg", "dry-ground-color.jpg", "asphalt-color.jpg"):
    with Image.open(SOURCE / name) as source:
        image = source.convert("RGB")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(OUTPUT / name, quality=74 if name.startswith("asphalt") else 68,
                   optimize=True, progressive=True)
with Image.open(SOURCE / "vegetation-atlas.png") as source:
    image = source.convert("RGBA")
    image.thumbnail((768, 512), Image.Resampling.LANCZOS)
    image.save(OUTPUT / "vegetation-atlas.png", optimize=True)
for output in sorted(OUTPUT.iterdir()):
    print(f"{output.name}: {output.stat().st_size / 1024:.1f} KiB")
