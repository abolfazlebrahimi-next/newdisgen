/**
 * `npm start` serves the production build produced by `npm run build`.
 *
 * Without this guard Next.js fails deep inside its own logger with
 * "Could not find a production build in the '.next' directory", which reads
 * like a broken install even though `npm run build` was simply never run.
 * Runs automatically as `prestart`.
 */
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib/paths.mjs";

const built = fs.existsSync(path.join(REPO_ROOT, ".next", "BUILD_ID"));

if (!built) {
  console.error("No production build found in .next/");
  console.error("");
  console.error("  npm run build   # then:");
  console.error("  npm start");
  console.error("");
  console.error("`npm start` serves a production build; for day-to-day work use `npm run dev`.");
  console.error("(برای نسخهٔ production اول `npm run build` و بعد `npm start`؛ برای توسعه `npm run dev`.)");
  process.exit(1);
}
