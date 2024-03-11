import baseConfig from "./rollup.base.config";

export default {
  ...baseConfig,
  output: {
    dir: "dist/standalone",
    format: "cjs",
    name: "arcana.scw",
    compact: true,
  },
};
