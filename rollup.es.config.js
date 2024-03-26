import baseConfig from "./rollup.base.config";

export default {
  ...baseConfig,
  output: {
    file: "dist/standalone.mjs",
    inlineDynamicImports: true,
    format: "es",
    compact: true,
  },
};
