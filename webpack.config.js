const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const extractSass = new ExtractTextPlugin({
  filename: '[name].[contenthash].css',
  disable: process.env.NODE_ENV === 'DEV'
});

module.exports = {
  entry: './src/app.js',
  output: {
    path: __dirname + '/build',
    filename: 'app.bundle.js'
  },
  module: {
    noParse: /(mapbox-gl)\.js$/,
    rules: [
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [
            {
              loader: 'css-loader'
            },
            {
              loader: 'sass-loader'
            }
          ],
          fallback: 'style-loader'
        })
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      },
      {
        test: /\.(jpg|png|svg|woff)$/,
        loader: 'file-loader',
        // don't use [hash] because of seperation
        options: {
          name: 'static/[name].[ext]'
        }
      }
    ]
  },
  devServer: {
    contentBase: __dirname + '/build',
    compress: true,
    hot: true,
    port: 3000,
    stats: 'errors-only'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin([
      { from: 'public/manifest.json' },
      { from: 'public/locales', to: 'locales' },
      { from: 'public/nav' }
    ]),
    new HtmlWebpackPlugin({
      minify: {
        collapseWhitespace: true
      },
      hash: true,
      template: 'public/index.html'
    }),
    extractSass,
    new CleanWebpackPlugin(['build'])
  ]
};
