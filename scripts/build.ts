// ponytail: zero-dep build script using native Bun.build
const compile = process.argv.includes("--compile");

if (compile) {
  const target = `bun-${process.platform}-${process.arch}` as any;
  const outfile = process.platform === "win32" ? "dist/server.exe" : "dist/server";
  console.log(`Compiling standalone binary for ${target}...`);
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    compile: {
      target,
      outfile,
    },
    minify: true,
  });
  if (!result.success) {
    console.error("Compilation failed:", result.logs);
    process.exit(1);
  }
  console.log(`Compiled: ${outfile}`);
} else {
  console.log("Building JS bundle for bun...");
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: "dist",
    target: "bun",
    minify: true,
  });
  if (!result.success) {
    console.error("Build failed:", result.logs);
    process.exit(1);
  }
  console.log("Built: dist/index.js");
}

export {};
