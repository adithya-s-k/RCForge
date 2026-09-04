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
