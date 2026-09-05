# Plans & design credits

Aircraft belong to their original designers. RCForge's models are independent
procedural reconstructions with explicit estimates, not official digital replicas
or manufacturing templates.

[Browse the aircraft reference library ↓](#aircraft-reference-library)

## Find the original design

The reference library below links each bundled aircraft to its creator and its
RCForge JSON definition. Flite Test plan entries include the exact reference
identity, byte count and SHA-256 digest. The Bronco's two configurations share one
source plan; they retain separate components, controls and local histories. The
[experimental tricopter conversion](bronco-vtol.md) retains Bronco geometry credits
and adds a separately estimated motor/servo installation. It is not an official FT VTOL plan.

Read the [Flite Test reconstruction notes](flite-test-reconstruction.md) for
measured plan stations and assembly assumptions, or the
[Vortex Simple Trainer notes](vortex-simple-trainer.md) for the kit-photo reconstruction.

## Keep plans on your computer

```sh
npm run references:fetch
npm run references:check
```

The reviewed PDFs are downloaded to `references/local/`. In the local development
docs, **Open local plan** appears for each verified copy. The source files retain
all original credits. The public website links directly to the original publisher.

To download just one reference:

```sh
npm run references:fetch -- ft-bronco-v1
```

Normal installation, builds and tests do not download plans. A checksum mismatch
stops verification; review an upstream revision before accepting a new file.
The machine-readable index is [references/manifest.json](../references/manifest.json).

## Rights and attribution

Publicly downloadable does not establish permission to redistribute. No grant to
bundle the current FT plan artwork has been established. Local PDFs are excluded
from Git, release artifacts and documentation snapshots. See
[Flite Test's plans statement](https://www.flitetest.com/support) and the
[third-party notices](../THIRD_PARTY_NOTICES.md).

Vortex RC's original product and build photographs remain with Vortex RC. A public
downloadable plan has not been established for the kit. Quad examples are RCForge
assemblies with component/manufacturer sources in their JSON provenance.

When contributing a new reference, record the designer, original URL, revision,
retrieval date, hash and redistribution terms. Keep sourced dimensions separate
from calculated geometry and estimated flight coefficients. The code's MIT license
does not relicense plans, photos, logos or trademarks.

## Aircraft reference library

On the website this section includes creator links, version-matched aircraft JSON,
upstream plans and local-plan availability. In a repository checkout, use the
[reference manifest](../references/manifest.json) and the files in `aircraft/`.
