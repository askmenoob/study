import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const base = process.argv[2];
const live = Boolean(base);
const origin = new URL(base || "https://study.imai.my").origin;
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
async function read(path, expectedType) {
  if (!live) return readFile(resolve("dist", "." + (path === "/" ? "/index.html" : path)));
  const response = await fetch(new URL(path, origin), { redirect: "error", signal: AbortSignal.timeout(15000) });
  check(response.status === 200, path + ": must return HTTP 200");
  if (["/manifest.webmanifest", "/sw.js", "/registerSW.js"].includes(path)) check(response.headers.get("cache-control")?.includes("no-store"), path + ": install metadata must not stay stale in intermediary caches");
  if (expectedType) check(response.headers.get("content-type")?.includes(expectedType), path + ": correct Content-Type");
  return Buffer.from(await response.arrayBuffer());
}
const html = (await read("/", "text/html")).toString();
check(/<link[^>]+rel="manifest"[^>]+href="\/manifest.webmanifest"/.test(html), "HTML must link manifest");
const manifest = JSON.parse((await read("/manifest.webmanifest", live ? "application/manifest+json" : undefined)).toString());
check(Boolean(manifest.name || manifest.short_name), "manifest needs an app name");
check(["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"].includes(manifest.display), "manifest display must be installable");
check(manifest.prefer_related_applications !== true, "must install the web app, not redirect to a native store");
const icons = manifest.icons || [];
for (const size of [192, 512]) {
  check(icons.some(icon => icon.sizes?.split(" ").includes(size + "x" + size) && (!icon.purpose || icon.purpose.split(" ").includes("any"))),
    "manifest is missing a general-purpose " + size + "x" + size + " icon");
}
check(manifest.id === "/" && manifest.start_url === "/" && manifest.scope === "/", "app identity, startup and scope must stay at root without child credentials");
check(manifest.lang === "ms-MY", "manifest language must match Malaysian Study");
check(icons.some(icon => icon.purpose === "maskable" && icon.sizes === "512x512"), "Android needs a separate maskable icon");
for (const icon of icons) {
  const url = new URL(icon.src, origin);
  check(url.origin === origin && !url.search && !url.hash, "icons must be stable same-origin assets");
  check(icon.type === "image/png", "manifest icon MIME type");
  const png = await read(url.pathname, "image/png");
  check(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), "icon must contain PNG bytes, not an HTML fallback");
  const dimensions = png.readUInt32BE(16) + "x" + png.readUInt32BE(20);
  check(dimensions === icon.sizes, "PNG dimensions must match " + icon.src);
}
const worker = (await read("/sw.js", "javascript")).toString();
check(worker.includes("precacheAndRoute") && worker.includes("registerRoute"), "service worker needs app shell caching");
// Exercise the generated worker with network-free Workbox stubs. A message-only
// SKIP_WAITING handler is insufficient when inline registration has no update UI.
let activationRequests = 0;
let clientClaims = 0;
let precacheEntries = [];
const loadWorker = (_dependencies, factory) => factory({
  precacheAndRoute(entries) { precacheEntries = entries; }, cleanupOutdatedCaches() {}, registerRoute() {},
  NavigationRoute: class {}, createHandlerBoundToURL() { return () => {}; },
  clientsClaim() { clientClaims++; },
});
runInNewContext(worker, {
  self: { define: loadWorker, skipWaiting() { activationRequests++; }, addEventListener() {} },
  define: loadWorker,
}, { timeout: 1000 });
check(activationRequests === 1, "new worker must activate without waiting for every Study tab to close");
check(clientClaims === 1, "new worker must take over existing Study tabs after activation");
for (const icon of icons) check(worker.includes(icon.src.replace(/^\//, "")), "service worker must precache " + icon.src);
// Every expanded grade must be available in the installed offline app.
for (const grade of ["d1", "d2", "d3", "d4", "d5", "d6", "t1", "t2", "t3", "t4", "t5", "t6"]) {
  const paths = precacheEntries.map(entry => typeof entry === "string" ? entry : entry.url)
    .filter(path => path.startsWith(`assets/library-${grade}-`) && path.endsWith(".js"));
  check(paths.length === 1, grade + ": exactly one grade content chunk must be precached");
  const chunk = await read("/" + paths[0], "javascript");
  check(chunk.length < 2 * 1024 * 1024, grade + ": content chunk must fit the Workbox file budget");
}

for (const name of ['focus-books.webp', 'focus-reading.webp']) {
  const paths = precacheEntries.map(entry => typeof entry === 'string' ? entry : entry.url);
  check(paths.includes(name), name + ': current theme artwork must be precached');
  const artwork = await read('/' + name, 'image/webp');
  check(artwork.toString('ascii', 0, 4) === 'RIFF' && artwork.toString('ascii', 8, 12) === 'WEBP', name + ': valid WebP');
  check(artwork.length < 100000, name + ': stay within mobile asset budget');
}
check(manifest.theme_color === '#795078', 'shared app identity uses the new brand color');
check(icons.every(icon => icon.src.startsWith('/icons/focus-')), 'manifest must use the new Study icon');

check(html.includes("serviceWorker.register") && html.includes("/sw.js"), "worker registration must be bundled inline with the current HTML");
check(!/<script[^>]*src=["'][^"']*registerSW\.js/.test(html), "new pages must not depend on the stale external registration script");
check(html.includes('rel="apple-touch-icon"'), "iOS home screen icon must be linked");
console.log("PASS " + checks + " PWA artifact checks (" + (live ? origin : "dist") + ").");
console.log("Manifest/assets checked. This does not prove installation on a physical Android device.");
