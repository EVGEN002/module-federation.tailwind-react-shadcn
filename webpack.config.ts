const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const ProvidePlugin = require('webpack/lib/ProvidePlugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { DefinePlugin } = require('webpack');
const path = require('path');
const deps = require('./package.json').dependencies;
const Dotenv = require('dotenv-webpack');
const chalk = require('chalk');

module.exports = (env) => {
  let mode: string | null = null;
  let outputPath: string | null = null;
  let envFile: string | null = null;

  if (env.production) {
    console.log(chalk.green('Production 🚀\n'));
    mode = 'production';
    envFile = 'production';
    outputPath = path.resolve(__dirname, 'dist'); // Укажите путь к PROD для заливки. Пример: path.resolve('P:', 'RPO', 'EMS', 'EMS_mf', 'dashboard')
  } else if (env.local) {
    console.log(chalk.blue('Local 🏠\n'));
    mode = 'local';
    envFile = 'local';
    outputPath = path.resolve(__dirname, 'dist'); // Укажите путь к LOCAL для заливки. Пример: path.resolve('L:', 'SC', 'EMS', 'dashboard')
  } else if (env.development) {
    console.log(chalk.yellow('Development 🛠️\n'));
    mode = 'development';
    envFile = 'development';
    outputPath = path.resolve(__dirname, 'dist');
  }

  const dotenvPath = path.resolve(__dirname, `.env.${envFile}`);
  require('dotenv').config({ path: dotenvPath });

  const plugins = [
    new HtmlWebPackPlugin({
      template: './src/index.html'
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[id].[contenthash].css'
    }),
    new ProvidePlugin({
      React: 'react'
    }),
    new DefinePlugin({
      'process.env.MODE': JSON.stringify(mode),
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      'process.env.API_BASENAME': JSON.stringify(process.env.API_BASENAME),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
    }),
    ...(mode === 'production' || mode === 'local'
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static', // 📊 Генерирует HTML файл с отчетом
            openAnalyzer: false, // 🌐 Открывает отчет автоматически в браузере
            reportFilename: 'bundle_report.html' // 📄 Имя файла отчета
          })
        ]
      : []),
    new CleanWebpackPlugin(),
    new Dotenv({
      path: path.resolve(__dirname, `.env.${envFile}`)
    }),
    new ModuleFederationPlugin({
      name: 'AppName', // Переименуйте, если используете MF
      filename: 'remoteEntry.js',
      remotes: {},
      exposes: {
        './AppComponent': './src/app/App.tsx'
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom']
        },
        axios: {
          requiredVersion: deps.axios,
          eager: mode === "production" || mode === "local",
          singleton: mode === "production" || mode === "local"
        }
      }
    })
  ];

  return {
    mode: env.development ? 'development' : 'production',
    entry: ['./src/index.ts'],
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    output: {
      path: outputPath,
      publicPath: process.env.PUBLIC_PATH,
      filename: 'js/[name].[contenthash].js',
      chunkFilename: 'js/[id].[contenthash].js'
    },
    devServer: env.development
      ? {
          hot: true,
          port: 3000,
          historyApiFallback: true,
          client: {
            overlay: false
          },
          static: {
            directory: path.join(__dirname, 'public')
          },
          watchFiles: ['src/**/*', 'public/**/*']
        }
      : undefined,
    plugins,
    target: 'web',
    module: {
      rules: [
        {
          test: /\.m?js/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.(css|s[ac]ss)$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[contenthash][ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src/')
      }
    }
  };
};
