const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    journal: ["./src/journal.tsx"],
    habits: ["./src/habits.tsx"],
    test: ["./src/test.tsx"]
  },

  output: {
    path: path.resolve(__dirname, 'assets', 'webpack'),
    filename: 'bundle-[name].js'
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },

  externals: ['window'],

  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/),
    new ExtractTextPlugin('bundle-style.css')
  ],

  /* Compile riot .tag files */
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
      { test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      { test: /\.(woff|png|ttf|svg|eot|woff2)$/,
        loader: 'file-loader?name=../../assets/copied/[hash].[ext]&context=./assets&publicPath=/assets/copied/' },
      { test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015'],
            plugins: [],
          },
        },
      },
    ],
  },
  devtool: 'source-map',
};

