# Third-party notices

RCForge is an independent project. Names of aircraft, designers, manufacturers and
products identify references; they do not imply affiliation, endorsement or
certification. RCForge's MIT license covers its original code and parameterizations,
not ownership of upstream designs, artwork or trademarks.

## Aircraft designs and plans

| RCForge preset                      | Original creator                                    | Design reference                                                                    |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| FT Bronco · V-tail and conventional | Peter Sripol / Flite Test; drawings by Dan Sponholz | [FT Bronco build](https://www.flitetest.com/articles/ft-bronco-build)               |
| FT Tiny Trainer · Sport             | Josh Bixler / Flite Test                            | [FT Tiny Trainer build](https://www.flitetest.com/articles/flite-test-tiny-trainer) |
| FT-22 Raptor                        | Josh Bixler / Flite Test                            | [FT-22 build](https://www.flitetest.com/articles/ft-22-raptor-build)                |
| Simple Trainer                      | Vortex RC                                           | [VT-Simple Trainer kit](https://www.vortex-rc.com/product/vt-simple-trainer/)       |
| Quad X examples                     | Independent RCForge assemblies                      | [Multirotor models and sources](docs/multirotors.md)                                |

The procedural aircraft are independent approximations, not official digital
models or manufacturing templates. The definitions contain original-creator
`credit` links and parameter `provenance`; the renderer and preset registry retain
source comments. [Flite Test reconstruction](docs/flite-test-reconstruction.md)
and [Vortex reconstruction](docs/vortex-simple-trainer.md) document the geometry
and uncertainties.

The [reference manifest](references/manifest.json) records reviewed FT plan URLs,
exact revisions/checksums, retrieval dates, creator and drawing credits. Use the
[plans library](docs/plans.md) to locate a source. `npm run references:fetch`
downloads verified originals into an optional, gitignored `references/local/`
cache for inspection. PDFs retain their original attribution and copyright marks.

**Upstream plan PDFs, plan artwork and reference photographs are not distributed
in the repository, documentation snapshots or production site.** Publicly
available downloads do not establish redistribution permission; no such grant has
been established for the current FT references. Public documentation links to the
original publisher. See [Flite Test's plans statement](https://www.flitetest.com/support).
Vortex RC's product, assembled-aircraft and laser-cut-sheet photographs remain
with Vortex RC; no public downloadable kit plan has been established.

## Components and hardware

The 450 mm utility quad references [DJI F450 frame specifications](https://www-v1.dji.com/it/flame-wheel-arf/spec.html)
and [EMAX MT2213 data](https://emaxmodel.com/collections/mt-series/products/emax-mt2213-935kv-multicopter-brushless-motor).
Manufacturer dimensions and factual thrust/current samples are attributed in the
aircraft JSON. Original product imagery is not redistributed.

Battery, servo and other component records link to their manufacturer or retailer,
including Robu.in, in the [component catalog](components/README.md). Measured,
listed, calculated and estimated values remain distinct. Product specifications
do not certify the simulated installation.

FlySky and FS-i6 identify third-party radio hardware. Uno and Nano identify Arduino
board families. The [bridge guide](docs/flysky-fs-i6.md) describes an independent
implementation; compatibility must be checked with the exact hardware. No radio,
board or aircraft hardware certification is implied.

## Scenery and visual assets

RCForge bundles CC0 surface textures and a sky HDRI from Poly Haven and ambientCG.
The [scenery asset manifest](public/scenery/README.md) identifies every source,
creator, license and modification. The foliage atlas was generated specifically
for RCForge; its original alpha channel and generation prompt are retained.

Alpine and mesa terrain include derived Mapzen Terrain Tiles elevation data.
Europe terrain data: produced using Copernicus data and information funded by the
European Union — EU-DEM layers. United States 3DEP (formerly NED), global
GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. The asset
manifest includes source URLs and data licensing. These credits are separate from
the MIT license for RCForge code.

## Software and fonts

Three.js (MIT), Zod (MIT), Vite (MIT), TypeScript (Apache-2.0), tsx (MIT), Vitest
(MIT), Prettier (MIT) and Marked (MIT) retain their own licenses. Marked renders
documentation at build time and is not shipped as a browser parser. Consult
installed packages for exact license text and the npm lockfile for versions and
transitive dependencies.

DM Sans and Space Grotesk are bundled through Fontsource under the SIL Open Font
License. Their font licenses are included with the installed Fontsource packages;
the production build includes the font distribution notice and license files.

## Adding a reference

Preserve attribution in the source definition, reference manifest, relevant model
guide and any distributed asset's notice. Record the original URL and terms before
adding artwork. A source link or a checksum identifies evidence; neither grants a
license. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for review and permitted assets.
