const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const DotenvPlugin = require('webpack-dotenv-plugin');
const OfflinePlugin = require('offline-plugin');
const webpack = require('webpack');

const isProd = process.env.NODE_ENV === 'PROD';

const extractSass = new ExtractTextPlugin({
  filename: '[name].[contenthash].css',
  disable: !isProd
});

const prodPlugins = [
  new OfflinePlugin({
    publicPath: 'https://rideaway.netlify.com',
    caches: {
      main: ['main.*.css', 'app.*.js'],
      additional: [':externals:'],
      optional: [':rest:']
    },
    events: true,
    externals: ['./'],
    ServiceWorker: {
      navigateFallbackURL: './'
    },
    AppCache: {
      FALLBACK: {
        '/': '/offline-page.html'
      }
    }
  })
];

const devPlugins = [];

// determine wether to use dev plugins or prod plugins
const plugins = isProd ? prodPlugins : devPlugins;

module.exports = {
  entry: './src/app.js',
  output: {
    path: __dirname + '/build',
    filename: 'app.bundle.[hash].js'
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
        options: {
          name: 'static/[name].[hash].[ext]'
        }
      }
    ]
  },
  devServer: {
    contentBase: __dirname + '/build',
    compress: true,
    disableHostCheck: true,
    host: '0.0.0.0',
    hot: true,
    port: 3000,
    stats: 'errors-only'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin([
      { from: 'public/manifest.json' },
      { from: 'public/locales', to: 'locales' },
      { from: 'public/favicons' },
      { from: 'public/landing' },
      { from: 'public/logo' }
    ]),
    new HtmlWebpackPlugin({
      minify: {
        collapseWhitespace: true
      },
      hash: true,
      template: 'public/index.html'
    }),
    extractSass,
    new DotenvPlugin({
      sample: './.env.default',
      path: './.env'
    }),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    ...plugins,
    new CleanWebpackPlugin(['build'])
  ]
};
