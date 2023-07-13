const path = require("path");

module.exports = {
  target: "node",
  entry: {
    server: "./src/index.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  watch: true,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
    ],
  },
};
