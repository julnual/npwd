import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
function replaceOnce(code, from, to) {
  if (code.split(from).length !== 2) throw new Error(`Expected exactly one occurrence: ${from}`);
  return code.replace(from, to);
}

// Build-only adapters: the original private Sites server and components remain intact.
export function pagesAdapter() {
  return {
    name: "wedding-pages-adapter", enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (file === path.join(root, "app/wedding-forms.tsx")) {
        code = replaceOnce(code, 'await fetch("/api/wedding", {', 'await submitToAppsScript("/api/wedding", {');
        code = replaceOnce(code, "AbortSignal.timeout(30000)", "AbortSignal.timeout(60000)");
        return 'import { submitToAppsScript } from "../github-pages/submission.mjs";\n' + code;
      }
      if (["app/page.tsx", "lib/wedding-gallery.ts"].some(name => file === path.join(root, name))) {
        if (!code.includes('"/images/')) throw new Error(`Image paths changed in ${file}; review Pages adapter`);
        return code.replaceAll('"/images/', '"./images/');
      }
    },
  };
}

export default defineConfig({
  root: path.join(root, "github-pages"),
  base: "./",
  publicDir: path.join(root, "public"),
  plugins: [pagesAdapter(), react()],
  resolve: { alias: { "@": root } },
  css: { postcss: root },
  build: { outDir: path.join(root, "dist/github-pages"), emptyOutDir: true, sourcemap: false },
});
