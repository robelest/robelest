import { toSSG } from "hono/bun";
import { $ } from "bun";

async function build() {
  const startTime = performance.now();
  console.log("Building site...\n");

  // Clean dist
  await $`rm -rf dist`;
  await $`mkdir -p dist`;

  // Step 1: Hono SSG — generate HTML from routes
  console.log("1. Generating static HTML...");
  const { default: app } = await import("./app.tsx");
  const result = await toSSG(app, { dir: "./dist" });
  if (!result.success) {
    console.error("   SSG failed:", result.error);
    process.exit(1);
  }
  console.log(`   Generated ${result.files?.length ?? 0} HTML files`);

  // Step 2: Tailwind CSS v4 — compile via @tailwindcss/cli
  console.log("2. Compiling Tailwind CSS...");
  await $`bunx @tailwindcss/cli -i ./site/styles.css -o ./dist/styles.css --minify`;

  // Step 3: Bundle React client for the browser
  console.log("3. Bundling React client...");
  const clientBuild = await Bun.build({
    entrypoints: ["./site/client/app.tsx"],
    outdir: "./dist",
    target: "browser",
    format: "esm",
    splitting: true,
    minify: true,
    naming: {
      entry: "client.[ext]",
      chunk: "chunks/[name]-[hash].[ext]",
    },
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
    throw: false,
  });

  if (!clientBuild.success) {
    console.error("   Client build failed:");
    for (const log of clientBuild.logs) {
      console.error("  ", log);
    }
    process.exit(1);
  }
  console.log(`   Bundled ${clientBuild.outputs.length} file(s)`);

  // Step 4: Copy static assets (favicon, images, robots.txt, etc.)
  console.log("4. Copying static assets...");
  await $`cp -r static/* dist/`;

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nBuild complete in ${elapsed}s`);
  console.log("Output: ./dist/");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
