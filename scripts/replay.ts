import { readFile } from "node:fs/promises";
import { parseRecording, replayRecording } from "../src/core/experiment";
import { fail } from "./args";
try {
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Usage: npm run replay -- results/ft-bronco-cruise/recording.json",
    );
  const r = parseRecording(JSON.parse(await readFile(file, "utf8")));
  console.log(JSON.stringify(replayRecording(r), null, 2));
} catch (e) {
  fail(e);
}
