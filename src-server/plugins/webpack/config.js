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
      minSize: 0,
      minRemainingSize: 0,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
            if (!match) return 'npm.vendor';

            let packageName = match[1];

            if (packageName.startsWith('@')) {
              const parts = module.context.split('node_modules' + path.sep);
              const subParts = parts[1].split(path.sep);
              packageName = `${subParts[0]}/${subParts[1]}`;
            }
            return `npm.${packageName.replace(/\//g, '_')}`;
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
