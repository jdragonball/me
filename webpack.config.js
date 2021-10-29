const path = require("path");

module.exports = {
  entry: "./index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist")
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  mode: "development",
  devServer: {
    static: {
      directory: __dirname
    },
    // liveReload: true,
    // hot: true,
    open: true,
  },
};
