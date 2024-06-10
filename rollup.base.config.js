import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import { handleCircularDependancyWarning } from "node-stdlib-browser/helpers/rollup/plugin";
import stdLibBrowser from "node-stdlib-browser";
import inject from "@rollup/plugin-inject";
import postcss from "rollup-plugin-postcss";
// import visualizer from "rollup-plugin-visualizer";

const baseConfig = {
  input: "./src/index.ts",
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({ module: "esnext" }),
    commonjs({
      requireReturnsDefault: "auto",
    }),
    inject({
      Buffer: ["buffer", "Buffer"],
      process: stdLibBrowser.process,
    }),
    postcss({
      plugins: [],
    }),
    terser(),
    // visualizer({ open: true, filename: "./bundle-analysis.html" }),
  ],
  onwarn: (warning, rollupWarn) => {
    handleCircularDependancyWarning(warning, rollupWarn);
  },
};

export default baseConfig;
