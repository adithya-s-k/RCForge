import { freezeDocs } from "../site/content";
const version = process.argv[2];
if (!version || process.argv.length !== 3)
  throw Error("Usage: npm run docs:freeze -- <application-version>");
console.log(`Frozen documentation: ${freezeDocs(process.cwd(), version)}`);
console.log(
  "Commit the snapshot, run release checks, then tag the release. This command does not publish or tag anything.",
);
