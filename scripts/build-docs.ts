import { buildDocs } from "../site/build";
import { validateDocs } from "../site/validate";
const result = validateDocs(buildDocs(process.cwd()));
console.log(
  `${result.pages} static documentation pages · ${result.links} generated links and anchors checked · no simulator runtime or private plan PDFs included`,
);
