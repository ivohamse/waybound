import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // Genereert Node-oude en Node-nieuwe imports
  dts: false, // Genereert automatische .d.ts types voor autocomplete
  splitting: false,
  clean: true, // Schoont de 'dist' map op voor elke build
  minify: false, // Laat leesbaar voor debugging (zet op true bij release)
});
