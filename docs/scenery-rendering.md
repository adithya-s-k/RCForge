# Ground detail without a repeating grid

The field uses small local photographs. Simply repeating those photographs every
1.4–4 metres produces recognizable rows of stones, grass and cracks. Increasing
texture resolution would sharpen the same repetition and cost more memory.

## How the material works

`src/view/surface-detail.ts` supplies the shared sampling and relief functions.
`terrain-material.ts` applies them to grass and dirt; `runway.ts` applies them to
asphalt before painting runway markings.

- **Irregular detail:** three overlapping, randomly offset samples are blended
  over a triangular lattice. Squared, normalized weights retain more grain than
  a soft equal blend. Offsets are fixed by world position; they never change
  with time or the camera. The grid is only a sampling construction, with no
  added geometry or visible tile borders.
- **Stable filtering:** the samples use `textureGrad` with derivatives taken
  before selecting lattice cells. That prevents cell boundaries from choosing
  the wrong mip level. Existing mipmaps and 4× anisotropy remain enabled.
- **Several scales:** fine photographic detail sits beneath broader, warped
  soil and vegetation colour variation. Detail fades with its projected pixel
  footprint toward the photograph's measured linear-light average, while the
  broad variation remains visible. It does not fade to a single flat colour at
  a fixed distance from the camera.
- **Subtle relief:** filtered luminance and procedural soil grain drive bounded
  surface-gradient bump shading. This reuses existing samples; it does not load
  normal maps. The height signal is an artistic approximation, not a measured
  reconstruction from the photograph. Slopes and distant detail are limited to
  avoid glitter at grazing angles.
- **Ground continuity:** adjoining grass/dirt patches use the same world-space
  sampling and colour. A graded maintenance zone replaces the rectangular lawn
  seam. Unpaved runway edges blend into their surroundings, with lighter packed
  dirt or shorter grass inside and physical edge markers retained. Asphalt
  keeps its distinct gravel shoulder and its single surface paint mask.

## Cost and boundaries

Ground now uses **three diffuse texture taps instead of one**, plus inexpensive
procedural colour/normal calculations. Asphalt additionally retains its existing
paint-mask tap. Filtering may require multiple hardware samples per tap. The ground-material change itself adds no images, meshes, render targets, shadow passes or runtime services. This is additional fragment work,
not a claim of identical GPU frame time on every device.

The existing 512² images, drawing-buffer cap, 1024² shadow map, distant terrain
triangle count and frame pacing remain. The renderer still stops drawing on Controllers
and Experiments. Graphics never change the 120 Hz simulation step.

Relief affects lighting only. It does **not** move the ground, create a terrain
collision mesh or make wheels bounce. The landing surface remains flat. Actual
bumps require a shared surface-height/contact model for wheels, placement,
altitude and shadows; visual displacement alone would misrepresent clearance.

## Checking a change

Compare Desert mesa, Northfield club and Alpine meadow from a low pilot view,
ground chase view and an airborne start. Look for recurring stone patterns,
triangle seams, moving highlights, ground-patch seams and runway readability.
Walk or fly across texture cells and switch sites repeatedly. Also check ground
launch, pause/reset and aircraft shadows. Build/type checks cannot prove a custom
GLSL material renders correctly; inspect it in the actual browser.

## References

- Deliot and Heitz, [Procedural Stochastic Textures by Tiling and Blending](https://eheitzresearch.wordpress.com/738-2/),
  and the [Unity Grenoble texture synthesis demo](https://unity-grenoble.github.io/website/demo/2020/10/16/demo-histogram-preserving-blend-synthesis.html).
  RCForge uses the random-offset blending principle, with its own small shader;
  it does not implement the papers' histogram transformations or lookup tables.
- [Three.js texture documentation](https://threejs.org/docs/pages/Texture.html)
  describes mipmap filtering, colour space and anisotropy tradeoffs. Relief uses
  the same surface-gradient principle as Three.js's bump-mapping shader chunk.
- [Prepar3D terrain options](https://www.prepar3d.com/SDKv6/prepar3d/options/graphics/world.html)
  distinguish nearby texture detail from mesh density and drawing distance. This
  is a useful flight-simulator reference for spending detail near the observer;
  RCForge does not implement Prepar3D's terrain system.

Photograph sources and licenses remain in
[the scenery asset manifest](../public/scenery/README.md).

## Vegetation and landscape revision (0.6)

The separate foliage revision replaces the legacy atlas with a six-silhouette
1536 × 1024 RGBA asset, uses three crossed cards per plant, and batches species
in irregular groves. Exact UV bounds retain transparent gaps without sampling
neighboring plants. Lower-branch shading and one instanced contact-occlusion pass
help anchor plants to the flat field. Counts remain 150/260/45 by site. The new
asset uses about 8 MiB of GPU texture memory with mipmaps; it is approximately
2.7 MB on disk. This is more texture memory and a few more draw calls than the
legacy single-species cards, without adding a vegetation shadow-map pass.

The distant mesh keeps 128 × 128 segments, redistributing coordinates to sample
nearer terrain more densely. Club hills use asymmetric ridges rather than a
smooth radial wall. Fragment-scale strata and rock/vegetation colour variation
supplement vertex slope/height shading, without new terrain textures. Ground
macro variation is restrained to reduce the blurry cloud appearance. None of
these changes adds terrain collision. Research references and the next physics
and scenery steps are in the [realism plan](realism-plan.md).

## Field-to-hill continuity

The surrounding mesh now uses the field's standard lighting and the same
world-space surface shader at low elevation. Slope/altitude vertex colors and
strata blend in between 2 and 85 metres above the field; they no longer begin
at a differently colored mesh intersection. Field, adjoining strip and hills
share the existing color texture. Ground and strip also share one material.

This adds the existing three-tap surface sampling to hill fragments and changes
those fragments from Lambert to standard lighting. It adds no texture assets,
triangles or shadow passes, but is additional fragment work rather than a claim
of unchanged GPU time. The shared sampler preserves consistent filtering at the
join; the same pixel ratio and terrain budgets apply.

Vegetation samples the actual distributed triangle mesh, including its diagonal
split. Sampling the underlying DEM directly can differ by metres from its coarse
rendered approximation. A ray-intersection regression checks all three sites.
This is visual tree placement only; aircraft ground contact remains flat.

## Foliage tonal balance

The prelit foliage atlas uses unity gain instead of the earlier 1.5× boost. This
reduces washed-out leaf highlights against the field while retaining lower-branch
occlusion, alpha-to-coverage and the same species/instance counts. Comparison used
Northfield Chase at N 160 m, E 90 m, 12 m altitude, followed by Alpine and Desert
checks. It is a modest tonal correction: the crossed cards and pale source leaves
remain visible on close inspection. No new samples, assets, geometry or shadow
passes were added, and no photorealistic vegetation claim is made.

## Clouds, foliage and distant aircraft

The existing CC0 sky photograph is restored. It loads once (5.2 MB compressed HDR source), is reduced to a 1024 × 512 logarithmic RGBA8 texture with mipmaps (about 2.7 MiB GPU memory), and is shared across the three fields. Initial HDR decoding temporarily needs a larger CPU buffer. Field haze and tint preserve each site's light; sun alignment follows the directional light. The gradient remains a fallback if the local image is unavailable. There is no HDR environment convolution, bloom, volumetric cloud pass or new downloaded asset.

The foliage cutout now rejects the source atlas's translucent background fringe. One projected canopy card per plant supplements root occlusion, with sun-aligned shadows on the flat field. This costs one extra instanced draw per species (two to four per site), not a second shadow-map render. Shadows on raised terrain are omitted. Ground macro variation is reduced to avoid broad, painted-looking green patches. The sky, tree shadows and reduced bounce lighting give the aircraft a clearer silhouette and distinguish upper and lower surfaces.

Pilot tracking includes a smooth, bounded lens focus, enabled under **Position & view → Focus at distance**. It does not resize the aircraft, draw an outline or make scenery transparent. A small RC aircraft will still become hard to identify far away, as dictated by its angular size and the display resolution.

Crash debris adds at most 16 visual fragments, retains the source triangles/materials, and settles against the visible ground (motion is capped at twenty seconds). It uses the existing aircraft shadow map. Debris is not part of dynamics or telemetry; reset/model replacement frees its geometry and restores the intact aircraft. The ground solver remains flat. Separate recorded obstruction volumes now handle tree trunks/crowns, buildings, rocks, tables, cones and fences. Mountains still have no aircraft collision. See [validation limits](validation.md#field-impacts-and-visible-breakup).
