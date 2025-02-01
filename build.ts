import { type BuildOptions, build } from "esbuild";
import { dependencies } from "./package.json";
const entryFile = "./src/index.ts";
const shared: BuildOptions = {
  bundle: true,
  entryPoints: [entryFile],
  logLevel: "info",
  minify: true,
  sourcemap: true,
  external: Object.keys(dependencies),
};

build({
  ...shared,
  format: "esm",
  outfile: "./dist/index.mjs",
});

build({
  ...shared,
  format: "cjs",
  outfile: "./dist/index.cjs",
});
