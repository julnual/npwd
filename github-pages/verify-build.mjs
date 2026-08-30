import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const out = fileURLToPath(new URL("../dist/github-pages/", import.meta.url));
const html = readFileSync(path.join(out, "index.html"), "utf8");
const jsName = readdirSync(path.join(out, "assets")).find(name => name.endsWith(".js"));
const js = readFileSync(path.join(out, "assets", jsName), "utf8");
assert(html.includes('lang="th"') && html.includes("PLOY &amp; NAN"));
assert(html.includes('./assets/') && !html.includes('src="/assets/'));
assert(html.includes('href="./favicon-heart.svg"'), "Wedding heart favicon is not linked");
const favicon = readFileSync(path.join(out, "favicon-heart.svg"), "utf8");
assert(favicon.includes("#CFA29F") && favicon.includes("#858A74") && favicon.includes("PLOY &amp; NAN heart"), "Wedding heart favicon is missing or has the wrong palette");
assert(!js.includes('"/images/'), "Root-relative image path leaked into Pages");
assert(!js.includes("WEDDING_API_KEY"), "Private API configuration leaked into static client");
assert(!js.includes("cloudflare:workers"), "Server code leaked into static client");
assert(js.includes("ploy-nan-wedding") && js.includes("script.google.com/macros/s/"));
for (const file of ["prewedding-landscape.webp", "prewedding-portrait.webp", ...["walking", "laughter", "close-to-you", "hand-in-hand", "lakeside", "dancing"].map(n => `gallery/${n}.jpg`)]) {
  assert(existsSync(path.join(out, "images", file)), `Missing ${file}`);
  assert(js.includes(`./images/${file}`), `Unreferenced ${file}`);
}
console.log("Static output checked: relative assets, all 8 photos, bridge, no server/key configuration.");
