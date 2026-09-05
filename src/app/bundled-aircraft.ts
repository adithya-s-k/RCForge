/** Deliberate public catalog. Keep original designer credits in each definition.
 * FT designs: Flite Test (Peter Sripol / Josh Bixler; drawings include Dan Sponholz).
 * Simple Trainer: Vortex RC. Plan identities and local cache: references/manifest.json.
 * These are independent engineering approximations; source artwork is not bundled.
 */
import bronco from "../../aircraft/ft-bronco.json";
import conventional from "../../aircraft/ft-bronco-conventional.json";
import tiny from "../../aircraft/ft-tiny-trainer.json";
import raptor from "../../aircraft/ft-22-raptor.json";
import vortex from "../../aircraft/vt-simple-trainer.json";
import quad from "../../aircraft/quad-x-5inch.json";
import detailedQuad from "../../aircraft/quad-x-6s.json";
import largeQuad from "../../aircraft/quad-x-450.json";
import { parseAircraft } from "../core/schema";

export const bundledAircraft = [
  bronco,
  conventional,
  tiny,
  raptor,
  vortex,
  quad,
  detailedQuad,
  largeQuad,
].map(parseAircraft);
