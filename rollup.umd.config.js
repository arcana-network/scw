import baseConfig from "./rollup.base.config";

export default {
  ...baseConfig,
  output: {
    file: "dist/standalone/scw.umd.js",
    format: "umd",
    name: "arcana.scw",
    compact: true,
  },
};
