import { readdir, readFile } from "node:fs/promises";
import { ComponentCatalogSchema } from "../src/core/components";
import { loadAircraft, fail } from "./args";
import { massProperties } from "../src/core/aircraft";
import { findTrim } from "../src/core/trim";
try {
  const catalog = ComponentCatalogSchema.parse(
    JSON.parse(await readFile("components/catalog.json", "utf8")),
  );
  console.log(`Component catalog: ${catalog.entries.length} valid entries`);
  const ids = process.argv.slice(2);
  if (!ids.length)
    ids.push(
      ...(await readdir("aircraft"))
        .filter((n) => n.endsWith(".json"))
        .map((n) => "aircraft/" + n),
    );
  for (const id of ids) {
    const a = await loadAircraft(id),
      p = massProperties(a),
      trim = findTrim(a);
    console.log(
      `${a.id}: valid · ${a.surfaces.length} surfaces · ${a.motors.length} motors · ${(p.mass * 1000).toFixed(0)} g · CG [${p.cg.map((n) => n.toFixed(4)).join(", ")}] m`,
    );
    console.log(
      `  ${a.vehicleType === "multirotor" ? "Hover" : "12 m/s trim"}: ${trim.converged ? "converged" : "NOT CONVERGED"} · pitch ${trim.pitchDeg.toFixed(2)}° · elevator ${trim.controls.pitch.toFixed(3)} · throttle ${trim.controls.throttle.toFixed(3)}`,
    );
    if (!trim.converged)
      console.warn(
        "  Valid definition, but no level-flight trim at the reference speed.",
      );
  }
} catch (e) {
  fail(e);
}
