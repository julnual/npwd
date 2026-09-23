import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const out = fileURLToPath(new URL("../dist/github-pages/", import.meta.url));
const html = readFileSync(path.join(out, "index.html"), "utf8");
const shareHtml = readFileSync(path.join(out, "share", "index.html"), "utf8");
const builtAssets = readdirSync(path.join(out, "assets"));
const jsName = builtAssets.find(name => /^main-.*\.js$/.test(name));
assert(jsName, "Main site JavaScript bundle is missing");
const js = readFileSync(path.join(out, "assets", jsName), "utf8");
const allJs = builtAssets.filter(name => name.endsWith(".js"))
  .map(name => readFileSync(path.join(out, "assets", name), "utf8")).join("\n");
assert(html.includes('lang="th"') && html.includes("PLOY &amp; NAN"));
assert(html.includes('./assets/') && !html.includes('src="/assets/'));
assert(html.includes('href="./favicon-heart.svg"'), "Wedding heart favicon is not linked");
const favicon = readFileSync(path.join(out, "favicon-heart.svg"), "utf8");
assert(favicon.includes("#CFA29F") && favicon.includes("#858A74") && favicon.includes("PLOY &amp; NAN heart"), "Wedding heart favicon is missing or has the wrong palette");
assert(!js.includes('"/images/'), "Root-relative image path leaked into Pages");
assert(!js.includes("WEDDING_API_KEY"), "Private API configuration leaked into static client");
assert(!js.includes("cloudflare:workers"), "Server code leaked into static client");
assert(allJs.includes("ploy-nan-wedding") && allJs.includes("script.google.com/macros/s/"));
assert(shareHtml.includes('lang="th"') && shareHtml.includes("Share Your Moments"));
assert(shareHtml.includes('../assets/'), "Nested share page must use paths relative to /share/");
assert(shareHtml.includes('../favicon-heart.svg'), "Share page favicon must resolve from /share/");
const shareJsName = builtAssets.find(name => /^share-.*\.js$/.test(name));
assert(shareJsName, "Share page JavaScript bundle is missing");
const shareJs = readFileSync(path.join(out, "assets", shareJsName), "utf8");
assert(shareJs.includes("Share Your Moments") || shareHtml.includes("Share Your Moments"));
assert(!shareJs.includes("galleryConsent") && shareJs.includes("dataBase64"), "Share upload payload has unexpected or missing metadata");
assert(shareJs.includes("video/quicktime") && shareHtml.includes("25 MB") && shareHtml.includes("30 วินาที"), "Share page video support is missing");
assert(shareJs.includes("ploy-nan-photo"), "Share page is not using its dedicated photo receiver");
assert(allJs.includes("script.google.com/macros/s/"), "Share page is not connected to an Apps Script URL");
assert(!shareJs.includes("WEDDING_API_KEY"), "Private API configuration leaked into share client");
for (const file of ["prewedding-landscape.webp", "prewedding-portrait.webp", ...["walking", "laughter", "close-to-you", "hand-in-hand", "lakeside", "dancing"].map(n => `gallery/${n}.jpg`)]) {
  assert(existsSync(path.join(out, "images", file)), `Missing ${file}`);
  assert(js.includes(`./images/${file}`), `Unreferenced ${file}`);
}
console.log("Static output checked: main site and isolated /share/, relative assets, bridges, no server/key configuration.");
