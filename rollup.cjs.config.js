import baseConfig from "./rollup.base.config";

export default {
  ...baseConfig,
  output: {
    file: "dist/standalone.cjs",
    inlineDynamicImports: true,
    format: "cjs",
    name: "arcana.scw",
    compact: true,
  },
};
