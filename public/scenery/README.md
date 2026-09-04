# Scenery assets

The runtime uses the small ground textures in `lite/` and the replacement `vegetation-v2.png` atlas. Original scans and the HDR sky are retained as source assets, but are not loaded by the flight scene. There are no runtime CDN or AI-service requests.

## Sources

| Files                                                                            | Source                                                                                                          | Credit                                                     | License                                                      |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `turf-color.jpg`, `turf-normal.jpg`                                              | [Grass 004](https://ambientcg.com/a/Grass004), 1K JPG colour and OpenGL normal maps; 1.4 m tile                 | ambientCG / Lennart Demes                                  | [CC0](https://docs.ambientcg.com/license/)                   |
| `dry-ground-color.jpg`, `dry-ground-normal.jpg`                                  | [Dry Ground Rocks](https://polyhaven.com/a/dry_ground_rocks), 1K JPG diffuse and OpenGL normal maps; 4 m tile   | Rob Tuytel / Poly Haven                                    | [CC0](https://polyhaven.com/license)                         |
| `rock-color.jpg`                                                                 | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), 1K JPG diffuse map                                | Poly Haven                                                 | CC0                                                          |
| `partly-cloudy-2k.hdr`                                                           | [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), 2K HDR | Greg Zaal (original), Jarod Guest (sky edits) / Poly Haven | CC0                                                          |
| `asphalt-color.jpg`, `asphalt-normal.jpg`, `asphalt-rough.jpg`                   | [Asphalt 02](https://polyhaven.com/a/asphalt_02), 1K JPG diffuse, OpenGL normal and roughness maps; 3 m tile    | Rob Tuytel / Poly Haven                                    | CC0                                                          |
| `mountain-rock-color.jpg`, `mountain-rock-normal.jpg`, `mountain-rock-rough.jpg` | [Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02), 1K JPG diffuse, OpenGL normal and roughness maps    | Rob Tuytel / Poly Haven                                    | CC0                                                          |
| `vegetation-atlas.png`                                                           | Generated for RCForge, September 4, 2026; original 1536 × 1024 RGBA                                             | Built-in image generation                                  | AI-generated project asset; not an upstream stock photograph |

`vegetation-v2.png`: generated for RCForge with the built-in image tool, September 5, 2026; 1536 × 1024 RGBA, approximately 2.7 MB. AI-generated project asset, not an upstream stock photograph. It replaces the old atlas at runtime.

Downloaded source files are unmodified. The generated atlas retains its original alpha channel. Ground normals change shading, not collision geometry. Photographed and generated assets should not be interpreted as a surveyed recreation of a real airfield.

## Lightweight rendering

- Rebuild runtime textures with `python3 scripts/prepare-scenery.py` (Pillow). The three diffuse maps are 512 × 512 JPEG; the legacy foliage derivative is a 768 × 512 PNG with alpha and is no longer loaded. The new atlas is copied directly from generation and is not overwritten by this preparation script. Originals above remain unchanged and the same credits apply to the resized derivatives.
- Ground and runway blend three world-anchored diffuse samples to hide texture repetition, with explicit mip gradients and 4× anisotropy. Broader colour variation and bounded bump shading reuse the existing detail. The runway also samples its 2048 × 256 paint mask. No additional ground textures are loaded; normal/roughness maps and multi-sample triplanar cliff shaders remain unused. See [the surface rendering guide](../../docs/scenery-rendering.md) for costs, references and the distinction between visual relief and collision geometry.
- Temperate sites use 2,400 static three-blade grass tufts; desert uses 600. Plants use three crossed foliage cards, with 150 plants at Northfield, 260 in the alpine site or 45 in the desert. Species are mixed per site using six independent silhouettes. Irregular groves and one instanced pass of soft static contact occlusion replace uniform radial tree distribution. Distant foliage no longer renders into the shadow map.
- Northfield retains rolling hills; Alpine and mesa retain sampled elevation profiles. The 128 × 128 terrain mesh concentrates samples nearer the airfield, with smooth normals and vertex colours for slope, elevation, hollows and snow. Filtered procedural strata add surface variation without a rock-image sampler. It does not sample distant rock textures.
- The 170 × 7 m runway remains centred at north 48 m / east 0 m. A single surface paint mask retains the 36/18 identifiers, thresholds, centreline and aiming marks without coplanar flicker. Grass/dirt strips and edge markers remain distinct. These are RC-scale markings, not a certified full-size runway layout.
- A simple gradient sky with a soft sun follows the observer. It requires no HDR image or atmospheric scattering pass. Aircraft detail, directional lighting and 1024² contact shadows remain.
- The 3D drawing buffer is capped at 1.25× pixel density and 2.1 megapixels; HTML/SVG controls stay at native resolution. Rendering is capped at 60 fps while flying/moving the camera, 30 fps when idle. Simulation integration remains 120 Hz. Controllers and Experiments do not draw the 3D scene.
- Terrain, tree, marker and building collision is not implemented. The simulated landing surface remains flat, with friction selected by the scenery preset rather than spatial pavement boundaries.
- Scenery changes dispose geometries, material textures, custom uniform textures and instance buffers.

## Elevation data and attribution

`src/view/data/alpine-height.json` and `mesa-height.json` are numerical elevation samples derived from [Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/) / Mapzen, accessed September 5, 2026. Each contains its source tile URLs, 129 × 129 samples, a 12 km extent, centre coordinates and datum. They are bundled into the application; there are no terrain network requests during flight.

- Alpine: centre 46.624° N, 8.034° E, near Grindelwald; sampled centre elevation 1,038 m. Europe terrain data **produced using Copernicus data and information funded by the European Union – EU-DEM layers**.
- Mesa: centre 37.020° N, 110.185° W, Monument Valley region; sampled centre elevation 1,564 m. **United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey**.
- The dataset combines elevation providers. See [Terrain Tiles attribution and data licenses](https://github.com/tilezen/joerd/blob/master/docs/attribution.md). These data are separate from the code's MIT license and the photographic textures' CC0 license.

Rebuild with `python3 scripts/prepare-terrain.py` (Python 3, Pillow 12.1+ and curl). The script decodes Terrarium RGB values to metres, samples a local north/east grid using bilinear interpolation, and rounds to the nearest metre. The renderer subtracts the sample-centre datum, clamps terrain below the fictional airfield to zero, and blends a flat clearing between radii 430–1,100 m. There is no vertical exaggeration. The airfields, vegetation, materials, snow cover and preset atmospheric elevations are fictional: this is not a georeferenced recreation or navigation tool. Elevation data improves landscape shapes; it does not validate aircraft dynamics or add terrain collision.

## Generated foliage prompt

Mode: built-in image generation, new image, no reference inputs. Saved as `vegetation-atlas.png` and inspected before integration. Generation returned unequal plant widths, so UV rectangles use the actual plant bounds rather than assuming thirds.

Exact prompt:

> Use case: photorealistic-natural. Asset type: one game vegetation sprite atlas with a truly transparent alpha background. Create a wide 1536x1024 PNG atlas consisting of exactly THREE isolated complete plants, each entirely contained in its own equal-width vertical third, with generous transparent spacing and no overlap: LEFT a mature irregular English oak tree with dense layered summer foliage and visible branching trunk; CENTER a full mature Scots pine tree with asymmetric boughs and individual needle clusters, natural complex silhouette, not a cone; RIGHT a dryland sagebrush bush with many fine twigs and muted sage-green tiny leaves, scaled to fill its third just like the trees. All three plants have their trunk/root base aligned at 95% image height; upper tips at roughly 8% height. Photographic fidelity, fine translucent leaf edge details and realistic canopy holes. Seen directly from the side, at eye level, minimal perspective, complete crown and trunk visible. Soft neutral overcast natural lighting, correct realistic greens, no dramatic color grading, no baked cast ground shadows. No ground plane, no grass base, no sky, no white backing, no checkerboard rendered into image, no text, no labels, no border. This is a production diffuse/albedo vegetation atlas to be rendered on alpha-tested crossed planes in a Three.js RC flight simulator.

## Replacement foliage prompt (0.6)

Built-in image generation, new asset. The selected result has a verified alpha
channel, including canopy gaps. The generation did not follow equal-cell bounds,
so `src/view/vegetation.ts` uses the actual separated plant rectangles and root
baselines. Transparent RGB is dark foliage/background colour rather than white;
MSAA alpha-to-coverage smooths depth-writing cutouts. An unused follow-up result
with a baked checkerboard was discarded and is not a runtime asset.

Exact selected-generation prompt:

> Use case: photorealistic-natural. Asset type: production vegetation texture atlas for a lightweight RC flight simulator, genuinely transparent PNG alpha background. Generate a 1536x1024 atlas containing SIX isolated full plants in a precise 3-column by 2-row equal-cell layout. Top row: mature asymmetrical oak, slender broadleaf birch, tall irregular Scots pine. Bottom row: rounded deciduous field tree, compact bush, dry sagebrush. Each plant completely contained within its own cell, centered, trunk base at 92 percent of cell height and tip no higher than 8 percent, leave wide transparent margins on all sides; no plants overlap. Broadleaf trees have naturally irregular branching and gaps, no uniform cone or sphere shape. Medium-distance orthographic front elevation full plant, realistic photographed botanical appearance under soft overcast neutral daylight. Restrained desaturated olive green and brown foliage, darker leaf undersides, realistic bark, clean precise foliage silhouettes. Crucial: no pale white or yellow edge halo, no rim light, no sky color contamination around leaves, no cast ground shadows, no ground, no grass carpet, no labels, no grid, no borders, no text, no checkerboard painted into image. True transparent background, antialiased natural dark-green edges, not black outlines.
