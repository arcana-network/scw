const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const commonConfig = {
  entry: path.resolve(__dirname, "src", "index.ts"),
  mode: "production",
  module: {
    rules: [
      {
        test: /.(ts|js)x?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.json",
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    filename: "scw.umd.js",
    library: ["arcana", "scw"],
    libraryTarget: "umd",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
    fallback: {
      url: require.resolve("url"),
      assert: require.resolve("assert"),
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      url: require.resolve("url"),
      zlib: require.resolve("browserify-zlib"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      assert: require.resolve("assert"),
      os: require.resolve("os-browserify"),
      path: require.resolve("path-browserify"),
      "process/browser": require.resolve("process/browser"),
    },
  },
  plugins: [new NodePolyfillPlugin()],
  target: "web",
};

const standaloneConfig = {
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ],
  resolve: {
    fallback: {},
  },
  output: {
    path: path.resolve(__dirname, "dist/standalone"),
  },
};

const moduleConfig = {
  resolve: {
    fallback: {
      crypto: false,
      stream: false,
    },
  },
  output: {
    path: path.resolve(__dirname, "dist"),
  },
};

module.exports = [
  merge(commonConfig, standaloneConfig),
  merge(commonConfig, moduleConfig),
];
