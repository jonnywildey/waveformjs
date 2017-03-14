const webpack = require('webpack');

module.exports = {
  context: __dirname,

  entry: "./src/index.js",
  module: {
  loaders: [
       {
         test: /\.js$/,
         exclude: /node_modules/,
         loader: 'babel-loader',
         query: {
           presets: ['es2015']
         }
       }
     ]
   },
  output: {
    filename: "waveformjs.js",
    path: __dirname + "/dist",
  },
  plugins: [
   new webpack.optimize.UglifyJsPlugin({minimize: true})
  ]
};
