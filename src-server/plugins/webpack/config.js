import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(process.cwd(), './');
const __filename = fileURLToPath(import.meta.url);

export default {
  mode: 'production',
  entry: './src-client/Main.js',

  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },

  output: {
    filename: 'ds.bundle.[contenthash].js',
    chunkFilename: 'chunks/[id].[name].[contenthash].js',
    path: path.resolve(ROOT, 'public/assets/js/devsakura'),
    publicPath: '/public/assets/js/devsakura/',
    library: 'ds',
    libraryTarget: 'var',
    libraryExport: 'default',
    umdNamedDefine: true,
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.(css|module\.css)$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.json', '.css'],
    alias: {
      '@f': path.resolve(ROOT, 'src-client/functions'),
      '@u': path.resolve(ROOT, 'src-client/utils'),
    },
  },

  watchOptions: {
    ignored: ['**/vendor/**', '**/node_modules/**'],
    followSymlinks: false,
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        flowbite: {
          test: /[\\/]node_modules[\\/]flowbite[\\/]/,
          name: 'npm.flowbite',
          chunks: 'all',
          priority: 30,
          enforce: true,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          },
          priority: 20,
          enforce: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
  },

  performance: {
    hints: 'warning',
    maxEntrypointSize: 10000000,
    maxAssetSize: 10000000,
  },

  devtool: 'source-map',

  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },

  plugins: [
    new WebpackManifestPlugin({
      fileName: 'manifest.json',
      publicPath: '/public/assets/js/devsakura/',
    }),
  ],
};
