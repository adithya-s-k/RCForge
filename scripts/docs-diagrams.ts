import { readFileSync, writeFileSync } from "node:fs";
import { documentationDiagrams } from "../site/diagrams";
const check = process.argv.includes("--check");
const diagrams = documentationDiagrams();
for (const [name, svg] of diagrams) {
  const path = `docs/images/${name}`;
  if (check) {
    if (readFileSync(path, "utf8") !== svg)
      throw Error(`${path} is stale. Run npm run docs:diagrams.`);
  } else writeFileSync(path, svg);
}
console.log(
  `${diagrams.size} documentation SVGs ${check ? "verified" : "generated"} from local drawing code.`,
);
