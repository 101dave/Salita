/**
 * Build the single-file static workspace published to GitHub Pages.
 *
 * It bundles `static/app.ts` (which imports the real language data and
 * translation helpers from `src/lib`), inlines the app stylesheet from
 * `src/app/globals.css`, and writes a self-contained `index.html` that works
 * from any path — a project page, a user page, or the local file system.
 *
 * Usage: npm run build:static
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");

/** Drop the Tailwind entrypoint and the self-hosted font faces (the static page loads DM Sans from a CDN with a system fallback). */
function stylesheet(): string {
  return read("src/app/globals.css")
    .split("\n")
    .filter((line) => !line.startsWith('@import "tailwindcss"') && !line.startsWith('@font-face{font-family:"DM Sans"'))
    .join("\n")
    .replace(/"DM Sans",Arial,sans-serif/g, '"DM Sans","Segoe UI",Arial,sans-serif')
    .trim();
}

function favicon(): string {
  const svg = read("public/icon.svg").replace(/\s+/g, " ").trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function bundle(): Promise<string> {
  const result = await build({
    entryPoints: [resolve(root, "static/app.ts")],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2020"],
    charset: "utf8",
    legalComments: "none",
    logLevel: "warning",
    tsconfig: resolve(root, "tsconfig.json"),
    // The browser build configures its provider in Settings, not via env vars.
    define: { "process.env": "{}" },
    write: false,
  });
  const file = result.outputFiles?.[0];
  if (!file) throw new Error("esbuild produced no output");
  return file.text;
}

const description = "Translate, save, and learn. A static Salita workspace for Filipino, Philippine regional languages, and meaningful connections around the world.";

async function main() {
  const [script, css] = [await bundle(), stylesheet()];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Salita — A world of understanding</title>
<meta name="description" content="${description}" />
<meta name="theme-color" content="#f7f9f8" />
<meta name="color-scheme" content="light" />
<link rel="icon" href="${favicon()}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Salita" />
<meta property="og:title" content="Salita — A world of understanding" />
<meta property="og:description" content="${description}" />
<meta name="twitter:card" content="summary" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&display=swap" />
<style>${css}</style>
</head>
<body>
<noscript><main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section class="card" style="padding:42px 35px;max-width:450px;text-align:center"><h1 style="font-size:26px;font-weight:600;letter-spacing:-.8px">Salita needs JavaScript.</h1><p style="font-size:12px;line-height:1.9;color:#8b9b84;margin:15px 0 0">This workspace translates, saves, and teaches entirely in your browser. Please enable JavaScript to continue.</p></section></main></noscript>
<script>${script}</script>
</body>
</html>
`;
  mkdirSync(resolve(root), { recursive: true });
  writeFileSync(resolve(root, "index.html"), html);
  writeFileSync(resolve(root, ".nojekyll"), "");
  const kb = (value: string) => `${(Buffer.byteLength(value) / 1024).toFixed(1)} kB`;
  console.log(`index.html written · ${kb(html)} total (css ${kb(css)}, js ${kb(script)})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
