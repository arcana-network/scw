import baseConfig from "./rollup.base.config";

export default {
  ...baseConfig,
  output: {
    dir: "dist/standalone",
    format: "es",
    compact: true,
  },
};
