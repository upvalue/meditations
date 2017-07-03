const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

module.exports = {
  entry: {
    journal: ['./src/entry/journal.ts'],
    habits: ['./src/entry/habits.ts'],
  },

  output: {
    path: path.resolve(__dirname, 'assets', 'webpack'),
    filename: 'bundle-[name].js',
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  externals: ['window'],

  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/),
    new ExtractTextPlugin('bundle-style.css'),
    new CheckerPlugin(), // async typescript error reporting
  ],

  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
      { test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader',
        }),
      },
      { test: /\.scss$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader'],
        }),
      },

      { test: /\.(woff|png|ttf|svg|eot|woff2)$/,
        loader: 'file-loader?name=../../assets/copied/[hash].[ext]&context=./assets&publicPath=/assets/copied/' },
      { test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  devtool: 'source-map',
};

