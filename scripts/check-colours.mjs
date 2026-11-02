// Fails (exit code 1) when a hard-coded colour is found in src/.
// Colour values may live ONLY in src/styles/app.css.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, sep } from "node:path";

const ROOT = "src";
const EXTENSIONS = new Set([".js", ".jsx", ".css", ".html"]);
const ALLOWED_FILE = join("src", "styles", "app.css");

// #fff, #ffff, #ffffff, #ffffffaa  |  rgb( rgba( hsl( hsla( hwb( lab( lch( oklab( oklch(
const COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(path))) yield path;
  }
}

let found = 0;
for (const file of walk(ROOT)) {
  if (file === ALLOWED_FILE) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const match of line.matchAll(COLOUR)) {
        found++;
        console.error(`${file.split(sep).join("/")}:${i + 1}  hard-coded colour "${match[0]}"`);
      }
    });
}

if (found > 0) {
  console.error(`\n${found} hard-coded colour(s) found. Use a token from src/styles/app.css instead.`);
  process.exit(1);
}
console.log("check-colours: no hard-coded colours in src/ (outside styles/app.css).");